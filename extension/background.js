// background.js - service worker for LLM assessment requests
// 透過此背景腳本統一向外部 (ngrok) LLM 服務發送請求，避免 content script 的 CORS 限制。
// Message 協議:
// { type: 'llmAssess', question: string, answer: string, model?: string }
// 回覆: { ok: true, resolved: '是'|'否'|'部分'|'未知', accuracy: '0-100%', raw?: any } 或 { ok:false, error }

const DEFAULT_MODEL = 'gpt-oss:20b';
const ENDPOINT = 'https://blowfish-absolute-absolutely.ngrok-free.app/api/generate';

async function callLLM(question, answer, model = DEFAULT_MODEL) {
  const prompt = `你是專業的客服品質稽核AI，專門評估客服回答的品質。請依據以下標準評估「用戶問題」與「GPT回答」：

## 評估指標

### 1. 問題解決狀態 (resolved)
- **是**：用戶問題完全得到解答，提供明確可行的解決方案
- **部分**：回答涉及問題核心但不完整，或僅解決部分子問題
- **否**：完全未回應問題要點，或回答與問題無關
- **未知**：問題過於模糊或回答無法判斷是否解決問題

### 2. 回答正確率 (accuracy)
評估回答內容的準確性（0-100整數）：
- 90-100：資訊完全正確，無誤導內容
- 70-89：大部分正確，有輕微不準確
- 50-69：部分正確但存在明顯錯誤
- 30-49：錯誤較多但有部分有用資訊
- 0-29：大部分或完全錯誤

## 輸出要求
僅輸出JSON格式，無其他文字：
{"resolved":"是|否|部分|未知","accuracy":數字}

---

用戶問題："${question}"
GPT回答："${answer}"
`;

  const body = { model, prompt, stream: false };
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true'
    },
    body: JSON.stringify(body)
  });
  if (!res.ok) {
    throw new Error(`LLM HTTP ${res.status}`);
  }
  const data = await res.json().catch(() => ({}));
  // 服務假設回傳 { response: '...文本...' } 或 { data: '...'}
  const text = data.response || data.data || JSON.stringify(data);
  let parsed = null;
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) parsed = JSON.parse(match[0]);
  } catch (e) {}
  if (!parsed || typeof parsed !== 'object') {
    return { ok: true, resolved: '未知', accuracy: '0%', raw: data };
  }
  let { resolved, accuracy } = parsed;
  if (!['是','否','部分','未知'].includes(resolved)) resolved = '未知';
  if (typeof accuracy === 'number') accuracy = Math.max(0, Math.min(100, accuracy)) + '%';
  else if (typeof accuracy === 'string') {
    const num = parseFloat(accuracy.replace(/%/, '')) || 0;
    accuracy = Math.max(0, Math.min(100, num)) + '%';
  } else accuracy = '0%';
  return { ok: true, resolved, accuracy };
}

// Process an array of { question, answer } items in batch with limited concurrency.
// Returns an array of results in the same order as items.
async function callLLMBatch(items = [], model = DEFAULT_MODEL, concurrency = 4) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  const results = new Array(items.length);

  // Worker to process a single item index
  const worker = async (startIndex) => {
    for (let i = startIndex; i < items.length; i += concurrency) {
      const it = items[i] || {};
      try {
        // ensure strings
        const q = typeof it.question === 'string' ? it.question : String(it.question || '');
        const a = typeof it.answer === 'string' ? it.answer : String(it.answer || '');
        const r = await callLLM(q, a, model);
        results[i] = r;
      } catch (e) {
        results[i] = { ok: false, error: e && e.message ? e.message : String(e) };
      }
    }
  };

  // Launch up to `concurrency` workers
  const workers = [];
  const actualConcurrency = Math.max(1, Math.min(concurrency, items.length));
  for (let w = 0; w < actualConcurrency; w++) workers.push(worker(w));

  await Promise.all(workers);
  return results;
}

// Batch with per-item progress notification to a specific tabId (if provided)
async function callLLMBatchWithProgress(items = [], model = DEFAULT_MODEL, concurrency = 4, tabId = null) {
  if (!Array.isArray(items)) throw new Error('items must be an array');
  const results = new Array(items.length);

  // shared pointer for workers
  let nextIndex = 0;
  const getNext = () => {
    const i = nextIndex;
    nextIndex += 1;
    return i;
  };

  const worker = async () => {
    while (true) {
      const i = getNext();
      if (i >= items.length) break;
      const it = items[i] || {};
      try {
        const q = typeof it.question === 'string' ? it.question : String(it.question || '');
        const a = typeof it.answer === 'string' ? it.answer : String(it.answer || '');
        const r = await callLLM(q, a, model);
        results[i] = r;
        // send progress to content script if tabId available
        try {
          if (tabId != null && typeof tabId === 'number') {
            chrome.tabs.sendMessage(tabId, { type: 'llmAssessBatchProgress', index: i, question: q, answer: a, result: r }, () => {});
          }
        } catch (e) { /* ignore */ }
      } catch (e) {
        results[i] = { ok: false, error: e && e.message ? e.message : String(e) };
        try {
          if (tabId != null && typeof tabId === 'number') {
            chrome.tabs.sendMessage(tabId, { type: 'llmAssessBatchProgress', index: i, question: String(it.question || ''), answer: String(it.answer || ''), result: results[i] }, () => {});
          }
        } catch (e) { /* ignore */ }
      }
    }
  };

  const actualConcurrency = Math.max(1, Math.min(concurrency, items.length));
  const workers = [];
  for (let w = 0; w < actualConcurrency; w++) workers.push(worker());
  await Promise.all(workers);
  return results;
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'llmAssess') {
    (async () => {
      try {
        const result = await callLLM(msg.question || '', msg.answer || '', msg.model);
        sendResponse(result);
      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true; // async response
  }
  // Batch assessment: expect msg.items = [{question, answer}, ...], optional model, optional concurrency
  if (msg && msg.type === 'llmAssessBatch') {
    (async () => {
      try {
        const items = Array.isArray(msg.items) ? msg.items : [];
        const concurrency = Number.isInteger(msg.concurrency) ? Math.max(1, msg.concurrency) : 4;
        const model = msg.model || DEFAULT_MODEL;
  // Prefer sender.tab.id for progress notifications when available (auto-push to requesting tab)
  const inferredTabId = (sender && sender.tab && typeof sender.tab.id === 'number') ? sender.tab.id : null;
  const explicitTabId = (msg.tabId !== undefined && msg.tabId !== null) ? Number(msg.tabId) : null;
  const tabId = (inferredTabId !== null) ? inferredTabId : explicitTabId;
  const results = await callLLMBatchWithProgress(items, model, concurrency, tabId);
  sendResponse({ ok: true, results });
      } catch (e) {
        sendResponse({ ok: false, error: e && e.message ? e.message : String(e) });
      }
    })();
    return true;
  }
});
