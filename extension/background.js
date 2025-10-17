// background.js - service worker for LLM assessment requests
// 透過此背景腳本統一向外部 (ngrok) LLM 服務發送請求，避免 content script 的 CORS 限制。
// Message 協議:
// { type: 'llmAssess', question: string, answer: string, model?: string }
// 回覆: { ok: true, resolved: '是'|'否'|'部分'|'未知', accuracy: '0-100%', raw?: any } 或 { ok:false, error }

const DEFAULT_MODEL = 'granite4:micro';
const ENDPOINT = 'https://blowfish-absolute-absolutely.ngrok-free.app/api/generate';

// ============================
// 基礎工具：字串化、雜湊、正規化
// ============================
function toStr(x) {
  return typeof x === 'string' ? x : String(x ?? '');
}

function normalizeResolved(v) {
  const m = toStr(v).trim();
  return ['是', '否', '部分', '未知'].includes(m) ? m : '未知';
}

function normalizeAccuracy(v) {
  if (typeof v === 'number') return Math.max(0, Math.min(100, v)) + '%';
  if (typeof v === 'string') {
    const num = parseFloat(v.replace(/%/, ''));
    if (Number.isFinite(num)) return Math.max(0, Math.min(100, num)) + '%';
  }
  return '0%';
}

// 簡單 DJB2 雜湊避免超長 Map key
function hashQA(model, q, a) {
  const s = `${model}\nQ:${q}\nA:${a}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) + s.charCodeAt(i);
    h |= 0; // 32-bit
  }
  return h >>> 0; // 無號
}

// ============================
// 全域並發控制（簡單 semaphore）
// ============================
const MAX_CONCURRENCY = 4; // 全域最大外呼並發
let inFlight = 0;
const queue = [];

function acquire() {
  return new Promise((resolve) => {
    const tryAcquire = () => {
      if (inFlight < MAX_CONCURRENCY) {
        inFlight++;
        resolve(() => {
          inFlight = Math.max(0, inFlight - 1);
          const next = queue.shift();
          if (next) next();
        });
      } else {
        queue.push(tryAcquire);
      }
    };
    tryAcquire();
  });
}

// ============================
// 安全取用：逾時與重試
// ============================
async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function safeFetchJSON(url, options, cfg = {}) {
  const timeoutMs = Number.isInteger(cfg.timeoutMs) ? cfg.timeoutMs : 20000;
  const retries = Number.isInteger(cfg.retries) ? cfg.retries : 2;
  const retryOn = cfg.retryOn || ((status) => status === 429 || (status >= 500 && status < 600));

  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(new Error('timeout')), timeoutMs);
    try {
      const res = await fetch(url, { ...(options || {}), signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        if (attempt < retries && retryOn(res.status)) {
          attempt++;
          const backoff = Math.min(2000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 150);
          await sleep(backoff);
          continue;
        }
        const txt = await res.text().catch(() => '');
        throw new Error(`LLM HTTP ${res.status}${txt ? `: ${txt.slice(0, 200)}` : ''}`);
      }
      // 嘗試 JSON；若失敗回傳空物件
      const data = await res.json().catch(() => ({}));
      return data;
    } catch (e) {
      clearTimeout(id);
      // AbortError or network：可重試
      const isAbort = (e && (e.name === 'AbortError' || /timeout/i.test(String(e))));
      if (attempt < retries && (isAbort || /NetworkError|Failed to fetch/i.test(String(e)))) {
        attempt++;
        const backoff = Math.min(2000, 300 * Math.pow(2, attempt)) + Math.floor(Math.random() * 150);
        await sleep(backoff);
        continue;
      }
      throw e;
    }
  }
}

// ============================
// 背景層快取與去重（TTL）
// ============================
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 分鐘
const resultCache = new Map(); // key -> { q, a, model, result, expiry }
const inflightCache = new Map(); // key -> Promise

function getCachedResult(key, q, a, model) {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (entry.model !== model) return null;
  if (entry.q !== q || entry.a !== a) return null; // 輕量避免雜湊碰撞
  if (Date.now() > entry.expiry) {
    resultCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCachedResult(key, q, a, model, result) {
  resultCache.set(key, { q, a, model, result, expiry: Date.now() + CACHE_TTL_MS });
}

// ============================
// LLM 呼叫（經過：快取 -> 併發閥 -> safeFetch）
// ============================
async function callLLM(question, answer, model = DEFAULT_MODEL) {
  // 規範化輸入
  const q = toStr(question);
  const a = toStr(answer);
  const m = toStr(model || DEFAULT_MODEL);

  // 背景層快取
  const key = hashQA(m, q, a);
  const cached = getCachedResult(key, q, a, m);
  if (cached) return cached;

  // in-flight 去重
  if (inflightCache.has(key)) {
    return inflightCache.get(key);
  }

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
用戶問題:"${q}"
GPT回答:"${a}"`;

  const runner = (async () => {
    const release = await acquire();
    try {
      const body = { model: m, prompt, stream: false };
      const data = await safeFetchJSON(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify(body)
      }, { timeoutMs: 20000, retries: 2 });

      // 服務假設回傳 { response: '...文本...' } 或 { data: '...'} 或 直接 { resolved, accuracy }
      let resolved = '未知';
      let accuracy = '0%';

      if (data && typeof data === 'object' && ('resolved' in data || 'accuracy' in data)) {
        resolved = normalizeResolved(data.resolved);
        accuracy = normalizeAccuracy(data.accuracy);
      } else {
        const text = (data && (data.response || data.data)) ? (data.response || data.data) : JSON.stringify(data || {});
        try {
          const match = String(text).match(/\{[\s\S]*\}/);
          if (match) {
            const obj = JSON.parse(match[0]);
            resolved = normalizeResolved(obj.resolved);
            accuracy = normalizeAccuracy(obj.accuracy);
          }
        } catch (_) { /* ignore parse error */ }
      }

      const result = { ok: true, resolved, accuracy };
      setCachedResult(key, q, a, m, result);
      return result;
    } finally {
      release();
      inflightCache.delete(key);
    }
  })();

  inflightCache.set(key, runner);
  return runner;
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
