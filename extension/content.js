(() => {
    // Excluded accounts (not counted in main stats), but logged separately
    const EXCLUDED_USERS = new Set([
        // 實習生
        'yalkyao', 'chenxi', 'yingzhiw', 'yutachen', 'yziang',
        // PM成員
        'yuyuanwang', 'dorislin920', 'emmalai',
        // 高度相關人員
        'oscarchiu', 'richen', 'allenchen0411', 'yangjo', 'nancyw', 'iiskkchi', 'jackch'
    ]);
    // Compute current week range (Monday to Friday) in YYYY-MM-DD
    const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
    const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const getCurrentWeekRange = (now = new Date()) => {
        const dow = now.getDay(); // 0=Sun ... 6=Sat
        // days since Monday: Mon=0, Tue=1, ..., Sun=6
        const daysSinceMonday = (dow + 6) % 7;
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - daysSinceMonday);
        const end = new Date(start);
        end.setDate(start.getDate() + 4); // Monday + 4 = Friday
        return { startDate: toYMD(start), endDate: toYMD(end) };
    };

    // Parse timestamp like "YYYY-MM-DD HH:mm:ss" as UTC, then use local getters (GMT+8 on client)
    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000; // GMT+8 (kept for reference, not applied directly)
    const parseUtcTimestamp = (ts) => {
        if (!ts) return null;
        const m = ts.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        const [_, y, mo, d, h, mi, s] = m;
        const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
        return dt;
    };

    // Utility: compute local day string in GMT+8 from UTC timestamp string
    const toDay = (ts) => {
        const dt = parseUtcTimestamp(ts);
        if (!dt) return null;
        // Use local timezone (machine time, expected GMT+8)
        return toYMD(dt);
    };

    // Utility: extract hour (0-23) from timestamp string like "YYYY-MM-DD HH:mm:ss"
    const toHour = (ts) => {
        const dt = parseUtcTimestamp(ts);
        if (!dt) return null;
        // Local hour in client timezone (GMT+8)
        return dt.getHours();
    };

    // Ensure start/end date inputs are set to this week; submit query if URL not already using them
    const ensureWeekRangeAndQuery = () => {
        const { startDate, endDate } = getCurrentWeekRange();
        const url = new URL(location.href);
        const urlStart = url.searchParams.get('startDate');
        const urlEnd = url.searchParams.get('endDate');

        const startEl = document.querySelector('input[name="startDate"], #startDate');
        const endEl = document.querySelector('input[name="endDate"], #endDate');
        const queryBtn = document.getElementById('queryButton');

        // If URL already has the desired range, don't submit again
        if (urlStart === startDate && urlEnd === endDate) {
            return false; // no action needed
        }

        // If inputs exist, set them and submit
        if (startEl && endEl && queryBtn) {
            if (startEl.value !== startDate) startEl.value = startDate;
            if (endEl.value !== endDate) endEl.value = endDate;
            // Reset to first page if a hidden input exists
            const pageEl = document.querySelector('input[name="page"]');
            if (pageEl) pageEl.value = '0';
            // Trigger form submission via button click
            console.debug('ucduc: auto-set week range and submit', { startDate, endDate });
            queryBtn.click();
            return true; // submitted
        }
        return false; // nothing to do
    };

    // Extract data rows from current page DOM (robust against missing data-* attributes)
    const extractRows = (root = document) => {
        const rows = [];
        const tableBody = root.querySelector('.kernel-table-ui tbody');
        if (!tableBody) return rows;

        const trList = tableBody.querySelectorAll('tr');
        trList.forEach((tr) => {
            const tds = Array.from(tr.querySelectorAll('td'));
            if (tds.length === 0) return;

            // 0: account, 1: source, 2: content, 3: time, 4: control
            const account = (tds[0]?.textContent || '').trim();
            const sourceText = (tds[1]?.textContent || '').trim();
            const timeText = (tds[3]?.textContent || '').trim();

            const a = tr.querySelector('a[onclick*="openChatDetailDialog"]');
            const gptFromAttr = a ? a.getAttribute('data-gptid') : null;
            const timeFromAttr = a ? a.getAttribute('data-time') : null;
            const contentFromAttr = a ? a.getAttribute('data-content') : null;

            const uid = account; // always trust visible account
            const gpt = (gptFromAttr || sourceText || 'unknown');
            const t = (timeFromAttr || timeText || '').trim();

            if (uid && t) {
                const day = toDay(t);
                if (!day) return;
                rows.push({ userId: uid, gptId: gpt.toString().trim(), time: t, day, source: sourceText, content: contentFromAttr || (tds[2]?.textContent || '').trim() });
            }
        });

        return rows;
    };

    // Format a Date to 'YYYY-MM-DD HH:mm:ss'
    const formatYMDHMS = (d) => {
        return `${toYMD(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    };

    // Convert visible table times (4th td) from UTC string to GMT+8 for display only
    const fixPageTimes = () => {
        const tableBody = document.querySelector('.kernel-table-ui tbody');
        if (!tableBody) return;
        const trList = tableBody.querySelectorAll('tr');
        trList.forEach((tr) => {
            const tds = tr.querySelectorAll('td');
            if (tds.length < 4) return;
            const a = tr.querySelector('a[onclick*="openChatDetailDialog"]');
            const tAttr = a ? a.getAttribute('data-time') : null;
            const src = (tAttr || tds[3]?.textContent || '').trim();
            const dt = parseUtcTimestamp(src);
            if (!dt) return;
            const formatted = formatYMDHMS(dt); // local formatting
            const span = tds[3].querySelector('span') || tds[3];
            span.textContent = formatted;
            // Optional: keep original as title
            span.title = `原始(UTC): ${src} → 本地(GMT+8): ${formatted}`;
        });
    };

    // Compute hour distribution for User-originated queries only
    const computeHourDistribution = (rows) => {
        const hourTotals = Array.from({ length: 24 }, () => 0);
        const hourByUser = {}; // hour index string -> { uid: count }
        const userTotals = new Map(); // uid -> total count across all hours

        rows.forEach((r) => {
            if (!r || r.source !== 'User') return; // only count queries from users
            if (EXCLUDED_USERS.has(r.userId)) return; // excluded from global stats
            const h = toHour(r.time);
            if (h == null || isNaN(h) || h < 0 || h > 23) return;
            hourTotals[h] += 1;
            if (!hourByUser[h]) hourByUser[h] = {};
            hourByUser[h][r.userId] = (hourByUser[h][r.userId] || 0) + 1;
            userTotals.set(r.userId, (userTotals.get(r.userId) || 0) + 1);
        });

        // Sort users by total descending to keep columns meaningful
        const userList = Array.from(userTotals.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([uid]) => uid);

        return { hourTotals, hourByUser, userList };
    };

    // Aggregate unique users per day (and per GPT optionally)
    const aggregateDailyUnique = (rows) => {
        const byDay = new Map(); // day -> Set of userIds
        const byDayGpt = new Map(); // key day|gpt -> Set of userIds

        rows.forEach(({ userId, gptId, day }) => {
            if (!day || !userId) return;
            if (EXCLUDED_USERS.has(userId)) return; // excluded from global stats
            const uid = userId.toString().trim();
            const gid = (gptId || 'unknown').toString().trim();

            if (!byDay.has(day)) byDay.set(day, new Set());
            byDay.get(day).add(uid);

            const key = `${day}|${gid}`;
            if (!byDayGpt.has(key)) byDayGpt.set(key, new Set());
            byDayGpt.get(key).add(uid);
        });

        const daily = Array.from(byDay.entries())
            .map(([day, set]) => ({ day, uniqueUsers: set.size }))
            .sort((a, b) => a.day.localeCompare(b.day));

        const dailyByGpt = {};
        byDayGpt.forEach((set, key) => {
            const [day, gptId] = key.split('|');
            if (!dailyByGpt[day]) dailyByGpt[day] = {};
            dailyByGpt[day][gptId] = set.size;
        });

        return { daily, dailyByGpt };
    };

    // Build raw log for excluded users (for CSV export)
    const buildExcludedRawLog = (rows) => {
        const out = [];
        rows.forEach((r) => {
            if (!r || r.source !== 'User') return;
            if (!EXCLUDED_USERS.has(r.userId)) return;
            const dt = parseUtcTimestamp(r.time);
            if (!dt) return;
            out.push({
                userId: r.userId,
                content: r.content || '',
                resolved: '',
                accuracy: '',
                time: formatYMDHMS(dt)
            });
        });
        // sort by time asc
        out.sort((a, b) => a.time.localeCompare(b.time));
        return out;
    };
    // Render floating panel
    const ensurePanel = () => {
        let panel = document.getElementById('ucduc-panel');
        if (panel) return panel;
        panel = document.createElement('div');
        panel.id = 'ucduc-panel';
        panel.innerHTML = `
      <div class="ucduc-header">
        <strong>每日使用人次</strong>
        <div class="ucduc-actions">
          <button id="ucduc-scan">聚合全部頁</button>
          <button id="ucduc-export">匯出 CSV</button>
          <button id="ucduc-close">×</button>
        </div>
      </div>
            <div class="ucduc-body">
                <div id="ucduc-summary">掃描中或等待資料…</div>
                <div style="overflow:auto; margin-bottom:8px;">
                    <table id="ucduc-table"><thead><tr><th>日期</th><th>唯一人次</th></tr></thead><tbody></tbody></table>
                </div>
                <div style="font-weight:600; margin:6px 0 2px;">使用時段_分佈</div>
                <div style="overflow:auto">
                    <table id="ucduc-hour-table"><thead><tr><th>時段 (0-23)</th><th>查詢數</th></tr></thead><tbody></tbody></table>
                </div>

                <div style="font-weight:600; margin:10px 0 2px;">每日使用log</div>
                <div style="overflow:auto; max-height:300px;">
                    <table id="ucduc-incl-log-table">
                        <thead>
                            <tr>
                                <th>UserId</th>
                                <th>對話內容</th>
                                <th>是否得到解決</th>
                                <th>回答正確率</th>
                                <th>對話時間</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
                
            </div>
    `;
        document.body.appendChild(panel);

        panel.querySelector('#ucduc-close')?.addEventListener('click', () => panel.remove());
    panel.querySelector('#ucduc-export')?.addEventListener('click', () => exportCSV());
    panel.querySelector('#ucduc-scan')?.addEventListener('click', () => scanAllPages());
        return panel;
    };

    const renderData = ({ daily, dailyByGpt, hourDist, inclRawLog }) => {
        const tbody = document.querySelector('#ucduc-table tbody');
        const thead = document.querySelector('#ucduc-table thead tr');
        const summary = document.getElementById('ucduc-summary');
        if (!tbody || !summary || !thead) return;

        // collect all gpt ids across days to build dynamic columns
        const gptSet = new Set();
        Object.values(dailyByGpt || {}).forEach((byGpt) => {
            Object.keys(byGpt).forEach(g => gptSet.add(g));
        });
        const gptList = Array.from(gptSet).sort();

        // rebuild header
        thead.innerHTML = '';
        const headRow = document.createElement('tr');
        headRow.appendChild(Object.assign(document.createElement('th'), { textContent: '日期' }));
        headRow.appendChild(Object.assign(document.createElement('th'), { textContent: '唯一人次' }));
        gptList.forEach(g => headRow.appendChild(Object.assign(document.createElement('th'), { textContent: g })));
        thead.appendChild(headRow);

        tbody.innerHTML = '';
        let total = 0;
        daily.forEach(({ day, uniqueUsers }) => {
            total += uniqueUsers;
            const tr = document.createElement('tr');
            tr.appendChild(Object.assign(document.createElement('td'), { textContent: day }));
            tr.appendChild(Object.assign(document.createElement('td'), { textContent: uniqueUsers }));
            gptList.forEach((g) => {
                const v = (dailyByGpt[day] && dailyByGpt[day][g]) ? dailyByGpt[day][g] : 0;
                tr.appendChild(Object.assign(document.createElement('td'), { textContent: v }));
            });
            tbody.appendChild(tr);
        });
        summary.textContent = `合計天數：${daily.length}；加總唯一人次：${total}`;

    // Render hour distribution
    renderHourTable(hourDist);

    // Render included raw log (統計名單)
    renderIncludedRawLogTable(inclRawLog);

    };

    const renderHourTable = (hourDist) => {
        const table = document.getElementById('ucduc-hour-table');
        if (!table) return;
        const theadRow = table.querySelector('thead tr');
        const tbody = table.querySelector('tbody');
        if (!theadRow || !tbody) return;

        const userList = (hourDist && hourDist.userList) ? hourDist.userList : [];
        const hourTotals = (hourDist && hourDist.hourTotals) ? hourDist.hourTotals : Array.from({ length: 24 }, () => 0);
        const hourByUser = (hourDist && hourDist.hourByUser) ? hourDist.hourByUser : {};

        // header: 時段, 查詢數, <實際帳號1>, <實際帳號2>, ...
        theadRow.innerHTML = '';
        theadRow.appendChild(Object.assign(document.createElement('th'), { textContent: '時段 (0-23)' }));
        theadRow.appendChild(Object.assign(document.createElement('th'), { textContent: '查詢數' }));
        userList.forEach((uid) => {
            const th = document.createElement('th');
            th.textContent = uid; // 直接顯示用戶帳號
            th.title = uid;
            theadRow.appendChild(th);
        });

        // body rows for 0..23
        tbody.innerHTML = '';
        for (let h = 0; h < 24; h++) {
            const tr = document.createElement('tr');
            tr.appendChild(Object.assign(document.createElement('td'), { textContent: String(h) }));
            tr.appendChild(Object.assign(document.createElement('td'), { textContent: String(hourTotals[h] || 0) }));
            userList.forEach(uid => {
                const v = (hourByUser[h] && hourByUser[h][uid]) ? hourByUser[h][uid] : 0;
                tr.appendChild(Object.assign(document.createElement('td'), { textContent: String(v) }));
            });
            tbody.appendChild(tr);
        }
    };

    // Build included (non-excluded) raw log entries for display
    const buildIncludedRawLog = (rows) => {
        const out = [];
        rows.forEach((r) => {
            if (!r || r.source !== 'User') return;
            const dt = parseUtcTimestamp(r.time);
            if (!dt) return;
            out.push({
                userId: r.userId,
                content: r.content || '',
                resolved: '',
                accuracy: '',
                time: formatYMDHMS(dt)
            });
        });
        out.sort((a, b) => a.time.localeCompare(b.time));
        return out;
    };

    // Render the included raw log table
    const renderIncludedRawLogTable = (logs) => {
        const table = document.getElementById('ucduc-incl-log-table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        (logs || []).forEach((r) => {
            const tr = document.createElement('tr');
            const tdUser = document.createElement('td');
            tdUser.textContent = r.userId || '';
            const tdContent = document.createElement('td');
            tdContent.textContent = (r.content || '').replace(/\s+/g, ' ').trim();
            const tdResolved = document.createElement('td');
            tdResolved.textContent = r.resolved || '';
            const tdAcc = document.createElement('td');
            tdAcc.textContent = r.accuracy || '';
            const tdTime = document.createElement('td');
            tdTime.textContent = r.time || '';
            tr.appendChild(tdUser);
            tr.appendChild(tdContent);
            tr.appendChild(tdResolved);
            tr.appendChild(tdAcc);
            tr.appendChild(tdTime);
            tbody.appendChild(tr);
        });
    };

    


    // CSV export
    const exportCSV = () => {
        const data = window.__ucduc_data;
        if (!data) return;

        // collect GPT columns
        const gptSet = new Set();
        Object.values(data.dailyByGpt || {}).forEach((byGpt) => {
            Object.keys(byGpt).forEach(g => gptSet.add(g));
        });
        const gptList = Array.from(gptSet).sort();

        const headers = ['日期', '唯一人次', ...gptList];
        const lines = [headers.join(',')];

        data.daily.forEach(({ day, uniqueUsers }) => {
            const row = [day, uniqueUsers];
            gptList.forEach((g) => {
                const v = (data.dailyByGpt[day] && data.dailyByGpt[day][g]) ? data.dailyByGpt[day][g] : 0;
                row.push(v);
            });
            // escape commas if any (dates and numbers safe)
            lines.push(row.join(','));
        });

        const blob = new Blob(["\uFEFF" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'daily_unique_users_by_gpt.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Scan current page only
    const scanCurrent = () => {
    const rows = extractRows();
    // Filter out excluded users entirely
    const rowsIncluded = rows.filter(r => !EXCLUDED_USERS.has(r.userId));
    console.debug('ucduc: scanCurrent included rows count', rowsIncluded.length);
    const data = aggregateDailyUnique(rowsIncluded);
    const hourDist = computeHourDistribution(rowsIncluded);
    const inclRawLog = buildIncludedRawLog(rowsIncluded);
    data.hourDist = hourDist;
    data.inclRawLog = inclRawLog;
        window.__ucduc_data = data;
        renderData(data);
    };

    // Scan all pages by navigating pager links and fetching content
    const scanAllPages = async () => {
        const table = document.querySelector('.kernel-table-ui');
        const container = table?.closest('.kernel-table-ui');
        const currentUrl = new URL(location.href);
        const size = currentUrl.searchParams.get('size') || '100';

        // Discover available pages from pager numbers; if only one, still process
        const pageLinks = Array.from(document.querySelectorAll('.ui-pager a[href*="/UserChat?"]'))
            .map(a => a.getAttribute('href'))
            .filter(Boolean)
            .map(href => new URL(href, location.origin))
            .map(u => u.toString());

        // Unique URLs (may include first/prev/next/last). Normalize by page param.
        const byPage = new Map();
        pageLinks.forEach((urlStr) => {
            try {
                const u = new URL(urlStr, location.origin);
                const p = u.searchParams.get('page');
                if (p !== null && Number(p) >= 0) byPage.set(p, u.toString());
            } catch { }
        });
        if (!byPage.has(currentUrl.searchParams.get('page') || '0')) {
            byPage.set(currentUrl.searchParams.get('page') || '0', currentUrl.toString());
        }

        // Fetch each page and parse with DOMParser.
    const allRows = [];
        for (const urlStr of byPage.values()) {
            try {
                const res = await fetch(urlStr, { credentials: 'include' });
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const tbody = doc.querySelector('.kernel-table-ui tbody');
                if (!tbody) continue;
                // use the same robust extractor on the fetched document
        const pageRows = extractRows(doc).filter(r => !EXCLUDED_USERS.has(r.userId));
        console.debug('ucduc: fetched', urlStr, 'included rows', pageRows.length);
                pageRows.forEach(r => allRows.push(r));
            } catch (e) {
                console.warn('抓取頁面失敗', urlStr, e);
            }
        }
    console.debug('ucduc: total aggregated included rows from pages', allRows.length);

    const data = aggregateDailyUnique(allRows);
    const hourDist = computeHourDistribution(allRows);
    const inclRawLog = buildIncludedRawLog(allRows);
    data.hourDist = hourDist;
    data.inclRawLog = inclRawLog;
        window.__ucduc_data = data;
        renderData(data);
    };

    const exportPmTemplateCSV = () => {
        const headers = ['UserId', '對話內容', '是否得到解決', '回答正確率', '對話時間'];
        const content = "\uFEFF" + headers.join(',') + '\n';
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'pm_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Init when DOM ready
    const init = () => {
        ensurePanel();
        // 1) Ensure this week range is applied; if not yet on URL, submit and let page reload
        const submitted = ensureWeekRangeAndQuery();
        if (submitted) return; // navigation expected; skip further work now

        // 2) Fix visible times to GMT+8 for the current page
        fixPageTimes();

        // 3) Automatically aggregate across pager (includes single page)
        scanAllPages();
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
