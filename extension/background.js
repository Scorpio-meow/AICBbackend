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
});
