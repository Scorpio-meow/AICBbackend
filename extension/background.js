// background.js - service worker for LLM assessment requests
// 透過此背景腳本統一向外部 (ngrok) LLM 服務發送請求，避免 content script 的 CORS 限制。
// Message 協議:
// { type: 'llmAssess', question: string, answer: string, model?: string }
// 回覆: { ok: true, resolved: '是'|'否'|'部分'|'未知', accuracy: '0-100%', raw?: any } 或 { ok:false, error }

const DEFAULT_MODEL = 'deepseek-r1:14b';
const ENDPOINT = 'https://blowfish-absolute-absolutely.ngrok-free.app/api/generate';

async function callLLM(question, answer, model = DEFAULT_MODEL) {
  const prompt = `你是專業的[知識AI系統]品質稽核AI，負責評估「用戶問題」與「GPT回答」的解題程度與正確性。

### 評估步驟
1. **萃取關鍵需求**：分析用戶的主要需求和潛在子題。
2. **檢查回應完整性**：評估回答是否涵蓋核心需求，並提供可執行的結論或方向性方案。
3. **驗證事實與邏輯**：檢查回答的準確性和一致性，標記重大錯誤、重要遺漏與明顯離題。

### 評估指標

#### 1. 解決狀態
- 是：已明確回應核心需求，提供可執行結論或至少一個可行方向；允許1–2項次要細節遺漏。
- 部分：觸及部分核心要點，但需要少量補充才能行動。
- 否：明顯未觸及主要需求、與問題無關，或嚴重誤解意圖。
- 未知：問題先天不清晰，或回答僅追問澄清而未提供實質解法。

#### 2. 回答正確率
- **92–100**：完全正確，僅有極小瑕疵。
- **80–91**：大致正確，允許輕微遺漏。
- **65–79**：部分正確，有明顯遺漏但主要結論仍可靠。
- **40–64**：錯誤較多，但仍有參考價值。
- **0–39**：多處錯誤，嚴重誤導或不安全建議。

### 輸出格式
僅輸出下列JSON格式，無任何解釋文字：
json
{
    "resolved": "是|部分|否|未知",
    "accuracy": 整數（0-100）
}

輸入：
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
