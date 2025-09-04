# UserChat Daily Unique Users Counter

這是一個 Chrome/Edge (Manifest V3) 擴充功能。當你開啟 MIS Bot 平台的查詢頁面時，會在頁面右下角顯示統計面板，計算每日唯一使用人數（同一 user 在同一天內對同一 GPT 使用 1~N 次均只算 1）。

支援：
- 當頁快速統計
- 透過分頁導覽列抓取同條件的所有頁次，進行聚合
- 匯出 CSV

## 安裝與使用
1. 打開瀏覽器 chrome://extensions 或 edge://extensions。
2. 開啟「開發人員模式」。
3. 點「載入未封裝項目」，選擇本資料夾 `extension`。
4. 進入目標頁面（URL 以 `https://misbot-beta.mitac.com.tw/pms/platformAnalysis/UserChat` 開頭）。
5. 右下角面板會自動出現：
   - 「聚合全部頁」：透過分頁列把所有頁面的資料抓回來統計。
   - 「匯出 CSV」：將統計結果下載為 CSV。

## 統計規則
- 以 anchor `a.textChat-icon.icon` 上的 `data-userid`, `data-gptid`, `data-time` 為準。
- `data-time` 取日期部分 (YYYY-MM-DD) 作為分組 key。
- 每天以 Set 方式去重 userId，得到每日唯一人次。

## 可能差異
- 若頁面結構有改動（無 `data-*` 或不同的表格結構），腳本會退回以表格欄位猜測，但結果可能不完整；請回報以便調整選擇器。

## 權限說明
- 僅使用 content_scripts 注入需要的頁面，不需背景權限。
- `host_permissions` 僅包含目標網域，以便在分頁聚合時以 fetch 取回其他頁。
