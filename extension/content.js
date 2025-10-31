(() => {
    const sanitizeContent = (content) => {
        if (typeof content !== 'string') return '';
        return content
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;')
            .replace(/\//g, '&#x2F;')
            .replace(/\\/g, '&#x5C;')
            .replace(/`/g, '&#x60;');
    };

    const createSafeElement = (tagName, textContent = '', attributes = {}) => {
        const element = document.createElement(tagName);
        if (textContent) {
            element.textContent = textContent;
        }
        Object.keys(attributes).forEach(key => {
            if (key === 'textContent') {
                element.textContent = attributes[key];
            } else if (key === 'innerHTML') {
                console.warn('Security: innerHTML blocked, use textContent instead');
            } else {
                element.setAttribute(key, attributes[key]);
            }
        });
        return element;
    };

    const createPanelBodyStructure = () => {
        const body = document.createElement('div');
        body.className = 'ucduc-body';

        const kpiSection = document.createElement('div');
        kpiSection.id = 'ucduc-kpi-section';
        kpiSection.style.display = 'block';

        const kpiTitle = document.createElement('div');
        kpiTitle.style.cssText = 'font-weight:600; margin:6px 0 8px; color:#0366d6;';
        kpiTitle.textContent = '📊 摘要_KPI';

        const kpiTableWrapper = document.createElement('div');
        kpiTableWrapper.style.cssText = 'overflow:auto; margin-bottom:16px;';

        const kpiTable = document.createElement('table');
        kpiTable.id = 'ucduc-kpi-table';

        const kpiThead = document.createElement('thead');
        const kpiHeaderRow = document.createElement('tr');
        const kpiHeaders = ['指標', '數值', '備註'];
        const kpiWidths = ['200px', '100px', ''];
        kpiHeaders.forEach((headerText, index) => {
            const th = document.createElement('th');
            th.textContent = headerText;
            if (kpiWidths[index]) th.style.width = kpiWidths[index];
            kpiHeaderRow.appendChild(th);
        });
        kpiThead.appendChild(kpiHeaderRow);

        const kpiTbody = document.createElement('tbody');
        const kpiRows = [
            ['週起 (Week Start)', 'kpi-week-start', ''],
            ['週終 (Week End)', 'kpi-week-end', ''],
            ['日活平均 DAU (avg)', 'kpi-avg-dau', ''],
            ['活躍用戶 AU (Active Users)', 'kpi-wau', ''],
            ['查詢總數', 'kpi-total-queries', ''],
            ['高峰時段 (時)', 'kpi-peak-hour', ''],
            ['高峰時段查詢數', 'kpi-peak-hour-queries', ''],
            ['每用戶平均查詢 (週)', 'kpi-avg-queries-per-user', ''],
            ['解決率 (%)', 'kpi-resolution-rate', 'AI分析'],
            ['平均回答正確率 (%)', 'kpi-avg-accuracy', 'AI分析'],
            ['平均解決嘗試次數', 'kpi-avg-attempts', ''],
            ['未解決數量', 'kpi-unresolved', '否+部分']
        ];
        kpiRows.forEach(([label, id, note]) => {
            const tr = document.createElement('tr');
            const tdLabel = document.createElement('td');
            tdLabel.textContent = label;
            const tdValue = document.createElement('td');
            tdValue.id = id;
            tdValue.textContent = '-';
            const tdNote = document.createElement('td');
            tdNote.textContent = note;
            tr.appendChild(tdLabel);
            tr.appendChild(tdValue);
            tr.appendChild(tdNote);
            kpiTbody.appendChild(tr);
        });

        kpiTable.appendChild(kpiThead);
        kpiTable.appendChild(kpiTbody);
        kpiTableWrapper.appendChild(kpiTable);
        kpiSection.appendChild(kpiTitle);
        kpiSection.appendChild(kpiTableWrapper);

        const dailySection = document.createElement('div');
        dailySection.id = 'ucduc-daily-section';
        dailySection.style.display = 'none';

        const dailyTitle = document.createElement('div');
        dailyTitle.style.cssText = 'font-weight:600; margin:6px 0 8px; color:#0366d6;';
        dailyTitle.textContent = '📅 每日使用人次';

        const dailySummary = document.createElement('div');
        dailySummary.id = 'ucduc-summary';
        dailySummary.textContent = '掃描中或等待資料…';

        const dailyTableWrapper = document.createElement('div');
        dailyTableWrapper.style.cssText = 'overflow:auto; margin-bottom:8px;';

        const dailyTable = document.createElement('table');
        dailyTable.id = 'ucduc-table';
        const dailyThead = document.createElement('thead');
        const dailyHeaderRow = document.createElement('tr');
        ['日期', '唯一人次'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            dailyHeaderRow.appendChild(th);
        });
        dailyThead.appendChild(dailyHeaderRow);
        const dailyTbody = document.createElement('tbody');
        dailyTable.appendChild(dailyThead);
        dailyTable.appendChild(dailyTbody);
        dailyTableWrapper.appendChild(dailyTable);

        dailySection.appendChild(dailyTitle);
        dailySection.appendChild(dailySummary);
        dailySection.appendChild(dailyTableWrapper);

        const hourSection = document.createElement('div');
        hourSection.id = 'ucduc-hour-section';
        hourSection.style.display = 'none';

        const hourTitle = document.createElement('div');
        hourTitle.style.cssText = 'font-weight:600; margin:6px 0 8px; color:#0366d6;';
        hourTitle.textContent = '⏰ 時段分布 (0-23小時)';

        const hourTableWrapper = document.createElement('div');
        hourTableWrapper.style.cssText = 'overflow:auto; margin-bottom:8px;';

        const hourTable = document.createElement('table');
        hourTable.id = 'ucduc-hour-table';
        const hourThead = document.createElement('thead');
        const hourHeaderRow = document.createElement('tr');
        hourThead.appendChild(hourHeaderRow);
        const hourTbody = document.createElement('tbody');
        hourTable.appendChild(hourThead);
        hourTable.appendChild(hourTbody);
        hourTableWrapper.appendChild(hourTable);

        hourSection.appendChild(hourTitle);
        hourSection.appendChild(hourTableWrapper);

        const logSection = document.createElement('div');
        logSection.id = 'ucduc-log-section';
        logSection.style.display = 'none';

        const logTitle = document.createElement('div');
        logTitle.style.cssText = 'font-weight:600; margin:6px 0 8px; color:#0366d6;';
        logTitle.textContent = '📋 詳細 log（統計名單）';

        const logTableWrapper = document.createElement('div');
        logTableWrapper.style.cssText = 'overflow:auto; margin-bottom:8px; max-height:400px;';

        const logTable = document.createElement('table');
        logTable.id = 'ucduc-incl-log-table';
        const logThead = document.createElement('thead');
        const logHeaderRow = document.createElement('tr');
        ['用戶', '問題內容', 'GPT回答', '解決狀態', '正確率', '時間'].forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            logHeaderRow.appendChild(th);
        });
        logThead.appendChild(logHeaderRow);
        const logTbody = document.createElement('tbody');
        logTable.appendChild(logThead);
        logTable.appendChild(logTbody);
        logTableWrapper.appendChild(logTable);

        logSection.appendChild(logTitle);
        logSection.appendChild(logTableWrapper);

        body.appendChild(kpiSection);
        body.appendChild(dailySection);
        body.appendChild(hourSection);
        body.appendChild(logSection);

        return body;
    };

    const createPanelStructure = () => {
        const panel = document.createElement('div');
        panel.id = 'ucduc-panel';
        
        const header = document.createElement('div');
        header.className = 'ucduc-header';
        
        const title = document.createElement('strong');
        title.textContent = '每日使用人次';
        
        const actions = document.createElement('div');
        actions.className = 'ucduc-actions';
        
        const buttons = [
            { id: 'ucduc-toggle-kpi', text: '隱藏KPI', 'data-active': 'true' },
            { id: 'ucduc-toggle-daily', text: '每日統計' },
            { id: 'ucduc-toggle-hour', text: '時段分析' },
            { id: 'ucduc-toggle-log', text: '詳細log' }
        ];
        
        buttons.forEach(btn => {
            const button = document.createElement('button');
            button.id = btn.id;
            button.textContent = btn.text;
            if (btn['data-active']) button.setAttribute('data-active', btn['data-active']);
            actions.appendChild(button);
        });
        
        const startLabel = document.createElement('label');
        startLabel.style.cssText = 'display:flex;align-items:center;gap:6px;margin-left:8px;font-size:12px;';
        const startText = document.createTextNode('起');
        const startBr = document.createElement('br');
        const startInput = document.createElement('input');
        startInput.id = 'ucduc-start-input';
        startInput.type = 'date';
        startInput.style.cssText = 'padding:2px 4px;';
        startLabel.appendChild(startText);
        startLabel.appendChild(startBr);
        startLabel.appendChild(startInput);
        
        const endLabel = document.createElement('label');
        endLabel.style.cssText = 'display:flex;align-items:center;gap:6px;font-size:12px;';
        const endText = document.createTextNode('迄');
        const endBr = document.createElement('br');
        const endInput = document.createElement('input');
        endInput.id = 'ucduc-end-input';
        endInput.type = 'date';
        endInput.style.cssText = 'padding:2px 4px;';
        endLabel.appendChild(endText);
        endLabel.appendChild(endBr);
        endLabel.appendChild(endInput);
        
        const applyBtn = document.createElement('button');
        applyBtn.id = 'ucduc-apply-range';
        applyBtn.textContent = '套用';
        applyBtn.title = '套用自訂範圍';
        
        const clearBtn = document.createElement('button');
        clearBtn.id = 'ucduc-clear-range';
        clearBtn.textContent = '清除';
        clearBtn.title = '清除自訂範圍';
        
        const scanBtn = document.createElement('button');
        scanBtn.id = 'ucduc-scan';
        scanBtn.textContent = '聚合全頁';
        
        const exportBtn = document.createElement('button');
        exportBtn.id = 'ucduc-export';
        exportBtn.textContent = '匯出CSV';
        
        const aiReviewBtn = document.createElement('button');
        aiReviewBtn.id = 'ucduc-ai-review';
        aiReviewBtn.textContent = '開始AI審核';
        aiReviewBtn.title = '點擊開始AI品質評估';
        aiReviewBtn.style.cssText = 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;';
        
        const closeBtn = document.createElement('button');
        closeBtn.id = 'ucduc-close';
        closeBtn.textContent = '×';
        
        actions.append(startLabel, endLabel, applyBtn, clearBtn, scanBtn, exportBtn, aiReviewBtn, closeBtn);
        header.append(title, actions);
        
        const body = createPanelBodyStructure();
        
        panel.append(header, body);
        return panel;
    };

    const EXCLUDED_USERS = new Set([
        'yalkyao','chenxi', 'yingzhiw', 'yutachen', 'yziang',
        'yuyuanwang', 'dorislin920', 'emmalai',
        'oscarchiu', 'richen', 'allenchen0411', 'yangjo', 'nancyw', 'iiskkchi', 'jackch'
    ]);
    const pad2 = (n) => (n < 10 ? '0' + n : '' + n);
    const toYMD = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const getCurrentWeekRange = (now = new Date()) => {
        const dow = now.getDay();
        const daysSinceMonday = (dow + 6) % 7;
        const start = new Date(now);
        start.setHours(0, 0, 0, 0);
        start.setDate(start.getDate() - daysSinceMonday);
        const end = new Date(start);
        end.setDate(start.getDate() + 4);
        return { startDate: toYMD(start), endDate: toYMD(end) };
    };

    const TZ_OFFSET_MS = 8 * 60 * 60 * 1000;
    const parseUtcTimestamp = (ts) => {
        if (!ts) return null;
        const m = ts.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
        if (!m) return null;
        const [_, y, mo, d, h, mi, s] = m;
        const dt = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)));
        return dt;
    };

    const toDay = (ts) => {
        const dt = parseUtcTimestamp(ts);
        if (!dt) return null;
        return toYMD(dt);
    };

    const toHour = (ts) => {
        const dt = parseUtcTimestamp(ts);
        if (!dt) return null;
        return dt.getHours();
    };

    const STORAGE_KEY = 'ucduc_custom_range';
    const PANEL_POS_KEY = 'ucduc_panel_pos';

    function waitForTableUpdate(timeoutMs = 10000) {
        return new Promise((resolve) => {
            try {
                const tableBody = document.querySelector('.kernel-table-ui tbody');
                if (!tableBody) return resolve();
                let done = false;
                const mo = new MutationObserver(() => {
                    if (done) return;
                    done = true;
                    mo.disconnect();
                    resolve();
                });
                mo.observe(tableBody, { childList: true, subtree: true, characterData: true });
                setTimeout(() => {
                    if (done) return;
                    done = true;
                    try { mo.disconnect(); } catch {}
                    resolve();
                }, timeoutMs);
            } catch {
                resolve();
            }
        });
    }

    let __rangeApplyLock = false;
    let __rangeApplyPromise = null;
    async function safeApplyRange(range) {
        if (!range || !range.startDate || !range.endDate) return false;
        if (__rangeApplyLock && __rangeApplyPromise) return __rangeApplyPromise;
        __rangeApplyLock = true;
        __rangeApplyPromise = (async () => {
            try {
                const cur = new URL(location.href);
                const curStart = cur.searchParams.get('startDate');
                const curEnd = cur.searchParams.get('endDate');
                const curSize = cur.searchParams.get('size');
                
                const needsRangeUpdate = curStart !== range.startDate || curEnd !== range.endDate;
                const needsSizeUpdate = curSize !== '100';
                
                if (!needsRangeUpdate && !needsSizeUpdate) return false;

                const startEl = document.querySelector('input[name="startDate"], #startDate');
                const endEl = document.querySelector('input[name="endDate"], #endDate');
                if (startEl && endEl) {
                    if (startEl.value !== range.startDate) startEl.value = range.startDate;
                    if (endEl.value !== range.endDate) endEl.value = range.endDate;
                    const pageEl = document.querySelector('input[name="page"]');
                    if (pageEl) pageEl.value = '0';
                    
                    const sizeEl = document.querySelector('input[name="size"], select[name="size"]');
                    if (sizeEl && sizeEl.value !== '100') {
                        sizeEl.value = '100';
                        console.debug('ucduc: 設定頁面大小為 100');
                    }
                }

                try {
                    const newUrl = new URL(location.href);
                    newUrl.searchParams.set('startDate', range.startDate);
                    newUrl.searchParams.set('endDate', range.endDate);
                    newUrl.searchParams.set('size', '100');
                    history.replaceState(history.state, '', newUrl.toString());
                } catch {}

                if (typeof window.__refreshData === 'function') {
                    try {
                        await window.__refreshData(range);
                        setTimeout(() => setPagerSizeTo100(), 200);
                        return true;
                    } catch {
                    }
                }

                const queryBtn = document.getElementById('queryButton');
                if (queryBtn) {
                    if (queryBtn.disabled) return false;
                    queryBtn.dataset.ucducPending = '1';
                    queryBtn.click();
                    await waitForTableUpdate(10000);
                    delete queryBtn.dataset.ucducPending;
                    
                    setTimeout(() => setPagerSizeTo100(), 300);
                    return true;
                }
                return false;
            } finally {
                __rangeApplyLock = false;
            }
        })();
        return __rangeApplyPromise;
    }

    const applyRangeToPage = (range) => {
        if (!range || !range.startDate || !range.endDate) return false;
        const startEl = document.querySelector('input[name="startDate"], #startDate');
        const endEl = document.querySelector('input[name="endDate"], #endDate');
        const queryBtn = document.getElementById('queryButton');
        if (startEl && endEl && queryBtn) {
            if (startEl.value !== range.startDate) startEl.value = range.startDate;
            if (endEl.value !== range.endDate) endEl.value = range.endDate;
            const pageEl = document.querySelector('input[name="page"]');
            if (pageEl) pageEl.value = '0';
            console.debug('ucduc: applyRangeToPage and submit', range);
            queryBtn.click();
            return true;
        }
        return false;
    };

    const savePanelPos = (pos) => {
        try {
            chrome.storage && chrome.storage.sync && chrome.storage.sync.set({ [PANEL_POS_KEY]: pos });
        } catch (e) { }
    };

    const loadPanelPos = (cb) => {
        try {
            chrome.storage && chrome.storage.sync && chrome.storage.sync.get([PANEL_POS_KEY], (res) => {
                cb && cb(res && res[PANEL_POS_KEY] ? res[PANEL_POS_KEY] : null);
            });
        } catch (e) { cb && cb(null); }
    };

    const ensureWeekRangeAndQuery = async () => {
        const getCustom = () => new Promise(resolve => {
            try {
                chrome.storage && chrome.storage.sync && chrome.storage.sync.get([STORAGE_KEY], (res) => {
                    resolve(res && res[STORAGE_KEY] ? res[STORAGE_KEY] : null);
                });
            } catch (e) { resolve(null); }
        });

        const custom = await getCustom();
        const defaultRange = getCurrentWeekRange();
        const useRange = (custom && custom.active && custom.startDate && custom.endDate) ? { startDate: custom.startDate, endDate: custom.endDate } : defaultRange;

        const url = new URL(location.href);
        const urlStart = url.searchParams.get('startDate');
        const urlEnd = url.searchParams.get('endDate');
        const urlSize = url.searchParams.get('size');

        if (urlStart === useRange.startDate && urlEnd === useRange.endDate && urlSize === '100') {
            return false;
        }

        const rangeWithSize = { ...useRange, size: '100' };

        const changed = await safeApplyRange(rangeWithSize);
        return changed;
    };

    const extractRows = (root = document) => {
        const rows = [];
        const tableBody = root.querySelector('.kernel-table-ui tbody');
        if (!tableBody) return rows;

        const trList = tableBody.querySelectorAll('tr');
        trList.forEach((tr) => {
            const tds = Array.from(tr.querySelectorAll('td'));
            if (tds.length === 0) return;

            const account = (tds[0]?.textContent || '').trim();
            const sourceText = (tds[1]?.textContent || '').trim();
            const timeText = (tds[3]?.textContent || '').trim();

            const a = tr.querySelector('a[onclick*="openChatDetailDialog"]');
            const gptFromAttr = a ? a.getAttribute('data-gptid') : null;
            const timeFromAttr = a ? a.getAttribute('data-time') : null;
            const contentFromAttr = a ? a.getAttribute('data-content') : null;
            const chatIdFromAttr = a ? a.getAttribute('data-chatid') : null;

            const uid = account;
            const gpt = (gptFromAttr || sourceText || 'unknown');
            const t = (timeFromAttr || timeText || '').trim();

            if (uid && t) {
                const day = toDay(t);
                if (!day) return;
                rows.push({ 
                    userId: uid, 
                    gptId: gpt.toString().trim(), 
                    time: t, 
                    day, 
                    source: sourceText, 
                    content: contentFromAttr || (tds[2]?.textContent || '').trim(),
                    chatId: chatIdFromAttr
                });
            }
        });

        return rows;
    };

    const formatYMDHMS = (d) => {
        return `${toYMD(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
    };

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
            const formatted = formatYMDHMS(dt);
            const span = tds[3].querySelector('span') || tds[3];
            span.textContent = formatted;
            span.title = `原始(UTC): ${src} → 本地(GMT+8): ${formatted}`;
        });
    };

    const computeHourDistribution = (rows) => {
        const hourTotals = Array.from({ length: 24 }, () => 0);
        const hourByUser = {};
        const userTotals = new Map();

        rows.forEach((r) => {
            if (!r || r.source !== 'User') return;
            if (EXCLUDED_USERS.has(r.userId)) return;
            const h = toHour(r.time);
            if (h == null || isNaN(h) || h < 0 || h > 23) return;
            hourTotals[h] += 1;
            if (!hourByUser[h]) hourByUser[h] = {};
            hourByUser[h][r.userId] = (hourByUser[h][r.userId] || 0) + 1;
            userTotals.set(r.userId, (userTotals.get(r.userId) || 0) + 1);
        });

        const userList = Array.from(userTotals.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([uid]) => uid);

        return { hourTotals, hourByUser, userList };
    };

    const aggregateDailyUnique = (rows) => {
        const byDay = new Map();
        const byDayGpt = new Map();

        rows.forEach(({ userId, gptId, day }) => {
            if (!day || !userId) return;
            if (EXCLUDED_USERS.has(userId)) return;
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

    const buildExcludedRawLog = (rows) => {
        const out = [];
        const excludedRows = rows.filter(r => r && r.source === 'User' && EXCLUDED_USERS.has(r.userId));
        const userGptPairs = groupUserGptPairs(excludedRows);
        
        userGptPairs.forEach((pair) => {
            if (!pair.userQuestion) return;
            
            const dt = parseUtcTimestamp(pair.userQuestion.time);
            if (!dt) return;
            
            let assessment = { resolved: '未知', accuracy: '0%' };
            if (pair.gptResponse && pair.gptResponse.content) {
                assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
            }
            
            const pushed = {
                userId: pair.userQuestion.userId,
                content: pair.userQuestion.content || '',
                gptResponse: pair.gptResponse ? pair.gptResponse.content || '' : '無回應',
                resolved: assessment.resolved,
                accuracy: assessment.accuracy,
                time: formatYMDHMS(dt)
            };

            if (pair.gptResponse && pair.gptResponse.content) {
                pushed.resolved = '待審核';
                pushed.accuracy = '待審核';
            }

            out.push(pushed);
        });
        
        out.sort((a, b) => a.time.localeCompare(b.time));
        return out;
    };

    const calculateKpiSummary = (rows, customRange) => {
        let startDate, endDate;
        if (customRange && customRange.startDate && customRange.endDate) {
            startDate = customRange.startDate;
            endDate = customRange.endDate;
        } else {
            try {
                const sEl = document.getElementById('ucduc-start-input');
                const eEl = document.getElementById('ucduc-end-input');
                if (sEl && eEl && sEl.value && eEl.value) {
                    startDate = sEl.value;
                    endDate = eEl.value;
                }
            } catch (e) { }
        }
        if (!startDate || !endDate) {
            const def = getCurrentWeekRange();
            startDate = def.startDate; endDate = def.endDate;
        }
        
        const weekRows = rows.filter(r => {
            if (!r || r.source !== 'User') return false;
            if (EXCLUDED_USERS.has(r.userId)) return false;
            return r.day >= startDate && r.day <= endDate;
        });

        const uniqueUsers = new Set();
        const dailyActiveUsers = new Map();
        const hourlyQueries = new Map();
        const userQueryCounts = new Map();
        
    let totalQueries = 0;
        let peakHour = 0;
        let peakHourQueries = 0;
        let resolvedCount = 0;
        let totalAccuracyScore = 0;
        let resolutionAttempts = 0;
        const allHistoricalUsers = new Set();
        rows.forEach(r => {
            if (!r || r.source !== 'User') return;
            if (EXCLUDED_USERS.has(r.userId)) return;
            if (r.day < startDate) {
                allHistoricalUsers.add(r.userId);
            }
        });

        const allWeekRows = rows.filter(r => {
            if (!r) return false;
            if (EXCLUDED_USERS.has(r.userId)) return false;
            return r.day >= startDate && r.day <= endDate;
        });

        const userGptPairs = groupUserGptPairs(allWeekRows);

        console.debug('ucduc: KPI calculation - userGptPairs count:', userGptPairs.length);
        
        userGptPairs.forEach(pair => {
            if (!pair.userQuestion) return;
            const hour = toHour(pair.userQuestion.time);
            let assessment = { resolved: '未知', accuracy: '0%' };

            if (pair.gptResponse && pair.gptResponse.content) {
                try {
                    const key = hashKey(pair.userQuestion.content || '', pair.gptResponse.content || '');
                    if (__llmCache.has(key)) {
                        const cached = __llmCache.get(key);
                        const isInFlight = cached && typeof cached.then === 'function';
                        const isFinal = !isInFlight && cached && cached.resolved;
                        if (isFinal) {
                            assessment = { resolved: cached.resolved, accuracy: cached.accuracy };
                        } else {
                            assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
                        }
                    } else {
                        assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
                    }
                    console.debug('ucduc: GPT response assessment (pair):', {
                        user: pair.userQuestion.userId,
                        question: pair.userQuestion.content,
                        resolved: assessment.resolved,
                        accuracy: assessment.accuracy,
                        hasGptResponse: !!pair.gptResponse
                    });
                } catch (e) {
                    assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
                }
            } else {
                console.debug('ucduc: No GPT response found for user:', pair.userQuestion.userId);
            }

            uniqueUsers.add(pair.userQuestion.userId);
            totalQueries++;
            resolutionAttempts++;
            
            if (assessment && typeof assessment.resolved === 'string') {
                if (assessment.resolved === '是') {
                    resolvedCount++;
                }
            }

            let accuracyNum = 0;
            if (assessment && assessment.accuracy && typeof assessment.accuracy === 'string') {
                const cleaned = assessment.accuracy.replace('%', '').replace(/[^0-9.]/g, '').trim();
                if (cleaned.length > 0) {
                    const parsed = parseFloat(cleaned);
                    if (!isNaN(parsed)) {
                        accuracyNum = parsed;
                        totalAccuracyScore += accuracyNum;
                    }
                }
            }
            
            if (!dailyActiveUsers.has(pair.userQuestion.day)) {
                dailyActiveUsers.set(pair.userQuestion.day, new Set());
            }
            dailyActiveUsers.get(pair.userQuestion.day).add(pair.userQuestion.userId);
            
            if (hour !== null) {
                hourlyQueries.set(hour, (hourlyQueries.get(hour) || 0) + 1);
            }
            
            userQueryCounts.set(pair.userQuestion.userId, (userQueryCounts.get(pair.userQuestion.userId) || 0) + 1);
        });

        let maxQueries = 0;
        hourlyQueries.forEach((count, hour) => {
            if (count > maxQueries) {
                maxQueries = count;
                peakHour = hour;
                peakHourQueries = count;
            }
        });

        const activeDays = dailyActiveUsers.size;
        const totalDailyUsers = Array.from(dailyActiveUsers.values()).reduce((sum, users) => sum + users.size, 0);
        const avgDau = activeDays > 0 ? (totalDailyUsers / activeDays).toFixed(1) : '0';

        const wau = uniqueUsers.size;

        const avgQueriesPerUser = wau > 0 ? (totalQueries / wau).toFixed(1) : '0';

        const resolutionRate = totalQueries > 0 ? ((resolvedCount / totalQueries) * 100).toFixed(1) : '0';
        
        const avgAccuracyRate = totalQueries > 0 ? (totalAccuracyScore / totalQueries).toFixed(1) : '0';
        
        const avgResolutionAttempts = resolvedCount > 0 ? (totalQueries / resolvedCount).toFixed(1) : '1.0';

        const unresolvedQueries = totalQueries - resolvedCount;

        console.debug('ucduc: KPI calculation results:', {
            totalQueries,
            resolvedCount,
            totalAccuracyScore,
            resolutionRate,
            avgAccuracyRate,
            unresolvedQueries
        });

        return {
            weekStart: startDate,
            weekEnd: endDate,
            avgDau: avgDau,
            wau: wau,
            totalQueries: totalQueries,
            peakHour: peakHour,
            peakHourQueries: peakHourQueries,
            avgQueriesPerUser: avgQueriesPerUser,
            resolutionRate: resolutionRate,
            avgAccuracyRate: avgAccuracyRate,
            avgResolutionAttempts: avgResolutionAttempts,
            unresolvedQueries: unresolvedQueries
        };
    };
    const ensurePanel = () => {
        let panel = document.getElementById('ucduc-panel');
        if (panel) return panel;
        
        panel = createPanelStructure();
        document.body.appendChild(panel);

        loadPanelPos((pos) => {
            try {
                if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
                    panel.style.right = 'auto';
                    panel.style.left = (pos.left) + 'px';
                    panel.style.top = (pos.top) + 'px';
                    panel.style.bottom = 'auto';
                }
            } catch (e) { }
        });

        const header = panel.querySelector('.ucduc-header');
        if (header) {
            header.style.cursor = 'grab';
            header.setAttribute('role', 'button');
            header.setAttribute('aria-label', '拖動面板');
        }

        let isDragging = false;
        let dragStart = { x: 0, y: 0 };
        let panelStart = { left: 0, top: 0 };

        const onPointerDown = (ev) => {
            try {
                const targ = (ev.target && ev.target.closest) ? ev.target.closest('button, a, input, select, textarea, .ucduc-actions') : null;
                if (targ) return;
            } catch (e) { }

            try {
                ev.preventDefault();
            } catch (e) {}
            const p = ev.touches ? ev.touches[0] : ev;
            isDragging = true;
            panel.classList.add('dragging');
            header.style.cursor = 'grabbing';
            panel.style.transition = 'none';
            dragStart = { x: p.clientX, y: p.clientY };
            const rect = panel.getBoundingClientRect();
            const left = rect.left + window.scrollX;
            const top = rect.top + window.scrollY;
            panelStart = { left, top };
            if (ev.pointerId && header.setPointerCapture) header.setPointerCapture(ev.pointerId);
        };

        const onPointerMove = (ev) => {
            if (!isDragging) return;
            const p = ev.touches ? ev.touches[0] : ev;
            const dx = p.clientX - dragStart.x;
            const dy = p.clientY - dragStart.y;
            const newLeft = Math.max(8, Math.min(window.innerWidth - panel.offsetWidth - 8, panelStart.left + dx));
            const newTop = Math.max(8, Math.min(window.innerHeight - panel.offsetHeight - 8, panelStart.top + dy));
            panel.style.left = newLeft + 'px';
            panel.style.top = newTop + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
        };

        const onPointerUp = (ev) => {
            if (!isDragging) return;
            isDragging = false;
            panel.classList.remove('dragging');
            header.style.cursor = 'grab';
            setTimeout(() => { panel.style.transition = ''; }, 50);
            try {
                const rect = panel.getBoundingClientRect();
                const pos = { left: Math.round(rect.left + window.scrollX), top: Math.round(rect.top + window.scrollY) };
                savePanelPos(pos);
            } catch (e) { }
        };

        header.addEventListener('pointerdown', onPointerDown, { passive: false });
        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });

        header.addEventListener('touchstart', onPointerDown, { passive: false });
        window.addEventListener('touchmove', onPointerMove, { passive: false });
        window.addEventListener('touchend', onPointerUp, { passive: false });

        header.addEventListener('dblclick', () => {
            panel.style.left = Math.round((window.innerWidth - panel.offsetWidth) / 2) + 'px';
            panel.style.top = Math.round((window.innerHeight - panel.offsetHeight) / 2) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            try { const rect = panel.getBoundingClientRect(); savePanelPos({ left: Math.round(rect.left + window.scrollX), top: Math.round(rect.top + window.scrollY) }); } catch (e) {}
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                panel.style.left = 'auto';
                panel.style.top = 'auto';
                panel.style.right = '16px';
                panel.style.bottom = '16px';
                try { chrome.storage && chrome.storage.sync && chrome.storage.sync.remove([PANEL_POS_KEY]); } catch (ex) {}
            }
        });

        panel.querySelector('#ucduc-close')?.addEventListener('click', () => panel.remove());
        panel.querySelector('#ucduc-export')?.addEventListener('click', () => exportCSV());
        panel.querySelector('#ucduc-scan')?.addEventListener('click', () => scanAllPages());
        
        panel.querySelector('#ucduc-ai-review')?.addEventListener('click', async () => {
            const btn = panel.querySelector('#ucduc-ai-review');
            if (!btn) return;
            
            if (!window.__ucduc_data || !window.__ucduc_data.inclRawLog) {
                alert('請先進行資料掃描後再執行AI審核');
                return;
            }
            
            const originalText = btn.textContent;
            btn.textContent = 'AI審核中...';
            btn.disabled = true;
            btn.style.opacity = '0.6';
            
            try {
                await startBatchAiReview();
                btn.textContent = '審核完成';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }, 2000);
            } catch (error) {
                console.error('AI審核失敗:', error);
                btn.textContent = '審核失敗';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.disabled = false;
                    btn.style.opacity = '1';
                }, 2000);
            }
        });
        const loadCustomRangeToInputs = () => {
            try {
                chrome.storage && chrome.storage.sync && chrome.storage.sync.get([STORAGE_KEY], (res) => {
                    const val = res && res[STORAGE_KEY];
                    if (val && val.startDate) document.getElementById('ucduc-start-input').value = val.startDate;
                    if (val && val.endDate) document.getElementById('ucduc-end-input').value = val.endDate;
                });
            } catch (e) { }
        };
        loadCustomRangeToInputs();

        panel.querySelector('#ucduc-apply-range')?.addEventListener('click', async () => {
            const s = document.getElementById('ucduc-start-input').value;
            const e = document.getElementById('ucduc-end-input').value;
            if (!s || !e) {
                alert('請同時選擇起訖日期');
                return;
            }
            const payload = { active: true, startDate: s, endDate: e };
            try {
                chrome.storage && chrome.storage.sync && chrome.storage.sync.set({ [STORAGE_KEY]: payload }, () => {
                    console.debug('ucduc: saved custom range', payload);
                    try { window.__ucduc_custom_range = payload; } catch (e) {}
                    safeApplyRange(payload).then(() => scanAllPages());
                });
            } catch (err) { console.warn('storage set failed', err); }
        });

        panel.querySelector('#ucduc-clear-range')?.addEventListener('click', async () => {
            try {
                chrome.storage && chrome.storage.sync && chrome.storage.sync.remove([STORAGE_KEY], () => {
                    console.debug('ucduc: cleared custom range');
                    try { window.__ucduc_custom_range = null; } catch (e) {}
                    const { startDate, endDate } = getCurrentWeekRange();
                    document.getElementById('ucduc-start-input').value = startDate;
                    document.getElementById('ucduc-end-input').value = endDate;
                    safeApplyRange({ startDate, endDate }).then(() => scanAllPages());
                });
            } catch (err) { console.warn('storage remove failed', err); }
        });
        
        const hideAllSections = () => {
            document.getElementById('ucduc-kpi-section').style.display = 'none';
            document.getElementById('ucduc-daily-section').style.display = 'none';
            document.getElementById('ucduc-hour-section').style.display = 'none';
            document.getElementById('ucduc-log-section').style.display = 'none';
        };

        const resetAllButtonTexts = () => {
            const buttons = [
                { selector: '#ucduc-toggle-kpi', text: 'KPI摘要' },
                { selector: '#ucduc-toggle-daily', text: '每日統計' },
                { selector: '#ucduc-toggle-hour', text: '時段分析' },
                { selector: '#ucduc-toggle-log', text: '詳細log' }
            ];
            
            buttons.forEach(({ selector, text }) => {
                const btn = panel.querySelector(selector);
                if (btn) {
                    btn.textContent = text;
                    btn.removeAttribute('data-active');
                }
            });
        };
        
        panel.querySelector('#ucduc-toggle-kpi')?.addEventListener('click', () => {
            const kpiSection = document.getElementById('ucduc-kpi-section');
            const btn = panel.querySelector('#ucduc-toggle-kpi');
            if (kpiSection.style.display === 'none') {
                hideAllSections();
                resetAllButtonTexts();
                kpiSection.style.display = 'block';
                btn.textContent = '隱藏KPI';
                btn.setAttribute('data-active', 'true');
            } else {
                hideAllSections();
                resetAllButtonTexts();
            }
        });

        panel.querySelector('#ucduc-toggle-daily')?.addEventListener('click', () => {
            const dailySection = document.getElementById('ucduc-daily-section');
            const btn = panel.querySelector('#ucduc-toggle-daily');
            if (dailySection.style.display === 'none') {
                hideAllSections();
                resetAllButtonTexts();
                dailySection.style.display = 'block';
                btn.textContent = '隱藏每日統計';
                btn.setAttribute('data-active', 'true');
            } else {
                hideAllSections();
                resetAllButtonTexts();
            }
        });

        panel.querySelector('#ucduc-toggle-hour')?.addEventListener('click', () => {
            const hourSection = document.getElementById('ucduc-hour-section');
            const btn = panel.querySelector('#ucduc-toggle-hour');
            if (hourSection.style.display === 'none') {
                hideAllSections();
                resetAllButtonTexts();
                hourSection.style.display = 'block';
                btn.textContent = '隱藏時段分析';
                btn.setAttribute('data-active', 'true');
            } else {
                hideAllSections();
                resetAllButtonTexts();
            }
        });

        panel.querySelector('#ucduc-toggle-log')?.addEventListener('click', () => {
            const logSection = document.getElementById('ucduc-log-section');
            const btn = panel.querySelector('#ucduc-toggle-log');
            if (logSection.style.display === 'none') {
                hideAllSections();
                resetAllButtonTexts();
                logSection.style.display = 'block';
                btn.textContent = '隱藏詳細log';
                btn.setAttribute('data-active', 'true');
            } else {
                hideAllSections();
                resetAllButtonTexts();
            }
        });
        return panel;
    };

    const ensureResetViewport = () => {
        if (document.getElementById('ucduc-reset-viewport')) return;
        const vp = document.createElement('div');
        vp.id = 'ucduc-reset-viewport';
        vp.title = '重置統計面板位置';
        vp.textContent = '\u21BB';
        vp.addEventListener('click', () => {
            let panel = document.getElementById('ucduc-panel');
            if (!panel) panel = ensurePanel();
            panel.style.left = 'auto';
            panel.style.top = 'auto';
            panel.style.right = '16px';
            panel.style.bottom = '16px';
            try { chrome.storage && chrome.storage.sync && chrome.storage.sync.remove([PANEL_POS_KEY]); } catch (e) {}
        });
        document.body.appendChild(vp);
    };

    const renderData = ({ daily, dailyByGpt, hourDist, inclRawLog, kpiSummary }) => {
        const tbody = document.querySelector('#ucduc-table tbody');
        const thead = document.querySelector('#ucduc-table thead tr');
        const summary = document.getElementById('ucduc-summary');
        if (!tbody || !summary || !thead) return;

        const gptSet = new Set();
        Object.values(dailyByGpt || {}).forEach((byGpt) => {
            Object.keys(byGpt).forEach(g => gptSet.add(g));
        });
        const gptList = Array.from(gptSet).sort();

        while (thead.firstChild) {
            thead.removeChild(thead.firstChild);
        }
        const headRow = document.createElement('tr');
        headRow.appendChild(Object.assign(document.createElement('th'), { textContent: '日期' }));
        headRow.appendChild(Object.assign(document.createElement('th'), { textContent: '唯一人次' }));
        gptList.forEach(g => headRow.appendChild(Object.assign(document.createElement('th'), { textContent: g })));
        thead.appendChild(headRow);

        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
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

        renderHourTable(hourDist);

        renderIncludedRawLogTable(inclRawLog);

        renderKpiSummary(kpiSummary);
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

        while (theadRow.firstChild) {
            theadRow.removeChild(theadRow.firstChild);
        }
        theadRow.appendChild(Object.assign(document.createElement('th'), { textContent: '時段 (0-23)' }));
        theadRow.appendChild(Object.assign(document.createElement('th'), { textContent: '查詢數' }));
        userList.forEach((uid) => {
            const th = document.createElement('th');
            th.textContent = uid;
            th.title = uid;
            theadRow.appendChild(th);
        });

        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
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

    const assessGptResponseQuality = (content, userQuestion = '') => {
        if (!content) return { resolved: '未知', accuracy: '0%' };
        return { resolved: '未知', accuracy: '0%' };
    };

    const startBatchAiReview = async () => {
        if (!window.__ucduc_data || !window.__ucduc_data.inclRawLog) {
            throw new Error('沒有可審核的資料');
        }
        
        const logs = window.__ucduc_data.inclRawLog;
        const reviewPromises = [];
        
        logs.forEach((log) => {
            if (log.gptResponse && log.gptResponse !== '無回應' && 
                (log.resolved === '待審核' || log.resolved === '未知' || log.accuracy === '待審核' || log.accuracy === '0%')) {
                
                const promise = requestLlmAssessment(log.content || '', log.gptResponse || '').then(r => {
                    if (r && r.resolved) {
                        log.resolved = r.resolved;
                        log.accuracy = r.accuracy;
                    }
                    return r;
                }).catch(err => {
                    console.warn('單項AI審核失敗:', err);
                    return null;
                });
                
                reviewPromises.push(promise);
            }
        });
        
        if (reviewPromises.length === 0) {
            throw new Error('沒有需要審核的項目');
        }
        
        await Promise.all(reviewPromises);
        
        if (window.__ucduc_data) {
            renderIncludedRawLogTable(window.__ucduc_data.inclRawLog);
            
            const stored = (window.__ucduc_custom_range && window.__ucduc_custom_range.startDate && window.__ucduc_custom_range.endDate) ? window.__ucduc_custom_range : null;
            const kpi = calculateKpiSummary(window.__ucduc_allRowsForKpi || [], stored);
            window.__ucduc_data.kpiSummary = kpi;
            renderKpiSummary(kpi);
        }
    };

    const __llmCache = new Map();
    const hashKey = (q,a) => {
        try {
            return btoa(unescape(encodeURIComponent(q.slice(0,500) + '||' + a.slice(0,800))));
        } catch { return q.length + ':' + a.length; }
    };
    const requestLlmAssessment = (question, answer) => {
        if (!question || !answer) return Promise.resolve(null);
        const key = hashKey(question, answer);

        if (__llmCache.has(key)) {
            const v = __llmCache.get(key);
            if (v && typeof v.then === 'function') return v;
            return Promise.resolve(v);
        }

        const p = new Promise((resolve) => {
            try {
                chrome.runtime.sendMessage({ type: 'llmAssess', question, answer }, (resp) => {
                    if (!resp || !resp.ok) {
                        __llmCache.delete(key);
                        resolve(null);
                        return;
                    }
                    __llmCache.set(key, resp);
                    resolve(resp);
                });
            } catch (e) {
                console.warn('ucduc: LLM assessment sendMessage failed', e);
                __llmCache.delete(key);
                resolve(null);
            }
        });

        __llmCache.set(key, p);
        return p;
    };

    const groupUserGptPairs = (rows) => {
        const pairs = [];
        
        const byChatId = new Map();
        rows.forEach(row => {
            if (row.chatId) {
                if (!byChatId.has(row.chatId)) {
                    byChatId.set(row.chatId, []);
                }
                byChatId.get(row.chatId).push(row);
            }
        });
        
        byChatId.forEach((chatRows, chatId) => {
            const userRows = chatRows.filter(r => r.source === 'User').sort((a, b) => a.time.localeCompare(b.time));
            const gptRows = chatRows.filter(r => r.source === 'Gpt').sort((a, b) => a.time.localeCompare(b.time));
            
            userRows.forEach(userRow => {
                let bestGptRow = null;
                let minTimeDiff = Infinity;
                
                gptRows.forEach(gptRow => {
                    const timeDiff = Math.abs(new Date(gptRow.time) - new Date(userRow.time));
                    if (timeDiff < minTimeDiff) {
                        minTimeDiff = timeDiff;
                        bestGptRow = gptRow;
                    }
                });
                
                pairs.push({
                    userQuestion: userRow,
                    gptResponse: bestGptRow
                });
            });
        });
        
        const noChatIdRows = rows.filter(r => !r.chatId);
        if (noChatIdRows.length > 0) {
            const sortedRows = [...noChatIdRows].sort((a, b) => a.time.localeCompare(b.time));
            
            for (let i = 0; i < sortedRows.length; i++) {
                const currentRow = sortedRows[i];
                
                if (currentRow.source !== 'User') continue;
                
                let gptResponse = null;
                for (let j = i + 1; j < sortedRows.length; j++) {
                    const nextRow = sortedRows[j];
                    if (nextRow.userId === currentRow.userId && nextRow.source === 'Gpt') {
                        const timeDiff = Math.abs(new Date(nextRow.time) - new Date(currentRow.time));
                        if (timeDiff <= 60000) {
                            gptResponse = nextRow;
                            break;
                        }
                    }
                    if (nextRow.userId === currentRow.userId && nextRow.source === 'User') {
                        break;
                    }
                }
                
                pairs.push({
                    userQuestion: currentRow,
                    gptResponse: gptResponse
                });
            }
        }
        
        return pairs;
    };

    const buildIncludedRawLog = (rows) => {
        const out = [];
        const userGptPairs = groupUserGptPairs(rows.filter(r => !EXCLUDED_USERS.has(r.userId)));
        
        userGptPairs.forEach((pair) => {
            if (!pair.userQuestion) return;
            
            const dt = parseUtcTimestamp(pair.userQuestion.time);
            if (!dt) return;
            
            let assessment = { resolved: '未知', accuracy: '0%' };
            if (pair.gptResponse && pair.gptResponse.content) {
                assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
            }
            
            const pushed = {
                userId: pair.userQuestion.userId,
                content: pair.userQuestion.content || '',
                gptResponse: pair.gptResponse ? pair.gptResponse.content || '' : '無回應',
                resolved: assessment.resolved,
                accuracy: assessment.accuracy,
                time: formatYMDHMS(dt)
            };

            if (pair.gptResponse && pair.gptResponse.content) {
                pushed.resolved = '待審核';
                pushed.accuracy = '待審核';
            }

            out.push(pushed);
        });
        
        out.sort((a, b) => a.time.localeCompare(b.time));
        return out;
    };
    const renderIncludedRawLogTable = (logs) => {
        const table = document.getElementById('ucduc-incl-log-table');
        if (!table) return;
        const tbody = table.querySelector('tbody');
        if (!tbody) return;
        while (tbody.firstChild) {
            tbody.removeChild(tbody.firstChild);
        }
        (logs || []).forEach((r) => {
            const tr = document.createElement('tr');
            
            const tdUser = document.createElement('td');
            tdUser.textContent = r.userId || '';
            
            const tdContent = document.createElement('td');
            tdContent.textContent = (r.content || '').replace(/\s+/g, ' ').trim();
            tdContent.style.maxWidth = '200px';
            tdContent.style.overflow = 'hidden';
            tdContent.style.textOverflow = 'ellipsis';
            tdContent.title = r.content || '';
            
            const tdGptResponse = document.createElement('td');
            tdGptResponse.textContent = (r.gptResponse || '').replace(/\s+/g, ' ').trim();
            tdGptResponse.style.maxWidth = '250px';
            tdGptResponse.style.overflow = 'hidden';
            tdGptResponse.style.textOverflow = 'ellipsis';
            tdGptResponse.title = r.gptResponse || '';
            
            const tdResolved = document.createElement('td');
            tdResolved.textContent = r.resolved || '';
            if (r.resolved === '是') {
                tdResolved.style.color = '#2da44e';
                tdResolved.style.background = '#f0fff4';
            } else if (r.resolved === '否') {
                tdResolved.style.color = '#cf222e';
                tdResolved.style.background = '#fff5f5';
            } else if (r.resolved === '部分') {
                tdResolved.style.color = '#bf8700';
                tdResolved.style.background = '#fffbeb';
            } else if (r.resolved === '待審核') {
                tdResolved.style.color = '#0969da';
                tdResolved.style.background = '#dbeafe';
            }
            
            const tdAcc = document.createElement('td');
            tdAcc.textContent = r.accuracy || '';
            const accuracyNum = parseFloat((r.accuracy || '0%').replace('%', ''));
            if (accuracyNum >= 80) {
                tdAcc.style.color = '#2da44e';
            } else if (accuracyNum >= 60) {
                tdAcc.style.color = '#bf8700';
            } else {
                tdAcc.style.color = '#cf222e';
            }
            
            const tdTime = document.createElement('td');
            tdTime.textContent = r.time || '';
            
            tr.appendChild(tdUser);
            tr.appendChild(tdContent);
            tr.appendChild(tdGptResponse);
            tr.appendChild(tdResolved);
            tr.appendChild(tdAcc);
            tr.appendChild(tdTime);
            tbody.appendChild(tr);
        });
    };
    const renderKpiSummary = (kpiData) => {
        if (!kpiData) return;
        
        document.getElementById('kpi-week-start').textContent = kpiData.weekStart || '-';
        document.getElementById('kpi-week-end').textContent = kpiData.weekEnd || '-';
        document.getElementById('kpi-avg-dau').textContent = kpiData.avgDau || '-';
        document.getElementById('kpi-wau').textContent = kpiData.wau || '-';
        document.getElementById('kpi-total-queries').textContent = kpiData.totalQueries || '-';
        document.getElementById('kpi-peak-hour').textContent = (kpiData.peakHour !== undefined) ? kpiData.peakHour + ':00' : '-';
        document.getElementById('kpi-peak-hour-queries').textContent = kpiData.peakHourQueries || '-';
        document.getElementById('kpi-avg-queries-per-user').textContent = kpiData.avgQueriesPerUser || '-';
        document.getElementById('kpi-resolution-rate').textContent = (kpiData.resolutionRate !== undefined) ? kpiData.resolutionRate + '%' : '-';
        document.getElementById('kpi-avg-accuracy').textContent = (kpiData.avgAccuracyRate !== undefined) ? kpiData.avgAccuracyRate + '%' : '-';
        document.getElementById('kpi-avg-attempts').textContent = kpiData.avgResolutionAttempts || '-';
        document.getElementById('kpi-unresolved').textContent = kpiData.unresolvedQueries || '-';
    };
    const setPagerSizeTo100 = () => {
        try {
            const pagerAnchors = Array.from(document.querySelectorAll('.ui-pager a[href*="/UserChat?"]'));
            pagerAnchors.forEach(a => {
                try {
                    const href = a.getAttribute('href');
                    if (!href) return;
                    const u = new URL(href, location.origin);
                    u.searchParams.set('size', '100');
                    a.setAttribute('href', u.toString());
                } catch (e) { }
            });

            const sizeAnchors = Array.from(document.querySelectorAll('.ui-page-size a[href*="/UserChat?"]'));
            sizeAnchors.forEach(a => {
                try {
                    const href = a.getAttribute('href');
                    if (!href) return;
                    const u = new URL(href, location.origin);
                    u.searchParams.set('size', '100');
                    a.setAttribute('href', u.toString());
                    const span = a.querySelector('span');
                    const txt = span ? span.textContent.trim() : (a.textContent || '').trim();
                    if (txt === '100') {
                        a.classList.add('ui-page-size-current');
                    } else {
                        a.classList.remove('ui-page-size-current');
                    }
                } catch (e) { }
            });

            try {
                const cur = new URL(location.href);
                if (cur.searchParams.get('size') !== '100') {
                    cur.searchParams.set('size', '100');
                    console.debug('ucduc: 更新頁面大小為 100 筆資料');
                    cur.searchParams.set('size', '100');
                    history.replaceState(null, '', cur.toString());
                }
            } catch (e) { }

            const sizeInputs = document.querySelectorAll('input[name="size"], select[name="size"]');
            sizeInputs.forEach(input => {
                if (input.value !== '100') {
                    input.value = '100';
                    console.debug('ucduc: 更新頁面大小輸入框為 100');
                }
            });

            setTimeout(() => {
                const currentSize = new URL(location.href).searchParams.get('size');
                if (currentSize !== '100') {
                    console.warn('ucduc: 頁面大小未正確設為 100，當前為:', currentSize);
                }
            }, 1000);

        } catch (e) {
            console.warn('ucduc: setPagerSizeTo100 failed', e);
        }
    };

    

    const exportCSV = () => {
        const data = window.__ucduc_data;
        if (!data) return;

        const esc = (v) => {
            if (v === null || v === undefined) return '""';
            const s = String(v);
            return '"' + s.replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
        };

        const parts = [];

        if (data.kpiSummary) {
            parts.push('=== KPI摘要 ===');
            parts.push(['指標', '數值', '備註'].map(esc).join(','));
            const k = data.kpiSummary;
            parts.push([ '週起', k.weekStart || '-', '' ].map(esc).join(','));
            parts.push([ '週終', k.weekEnd || '-', '' ].map(esc).join(','));
            parts.push([ '日活平均DAU', k.avgDau || '-', '' ].map(esc).join(','));
            parts.push([ '活躍用戶AU', k.wau || '-', '' ].map(esc).join(','));
            parts.push([ '查詢總數', k.totalQueries || '-', '' ].map(esc).join(','));
            parts.push([ '高峰時段', (k.peakHour !== undefined) ? (k.peakHour + ':00') : '-', '' ].map(esc).join(','));
            parts.push([ '高峰時段查詢數', k.peakHourQueries || '-', '' ].map(esc).join(','));
            parts.push([ '每用戶平均查詢', k.avgQueriesPerUser || '-', '' ].map(esc).join(','));
            parts.push([ '解決率(%)', (k.kpiPending ? '計算中' : (k.resolutionRate !== undefined ? k.resolutionRate + '%' : '-')), 'AI分析' ].map(esc).join(','));
            parts.push([ '平均回答正確率(%)', (k.kpiPending ? '計算中' : (k.avgAccuracyRate !== undefined ? k.avgAccuracyRate + '%' : '-')), 'AI分析' ].map(esc).join(','));
            parts.push([ '平均解決嘗試次數', (k.kpiPending ? '計算中' : (k.avgResolutionAttempts || '-')), '' ].map(esc).join(','));
            parts.push([ '未解決數量', (k.kpiPending ? '計算中' : (k.unresolvedQueries || '-')), '' ].map(esc).join(','));
        }

        parts.push('');
        parts.push('=== 每日統計 ===');
        const gptSet = new Set();
        Object.values(data.dailyByGpt || {}).forEach((byGpt) => {
            Object.keys(byGpt).forEach(g => gptSet.add(g));
        });
        const gptList = Array.from(gptSet).sort();
        const dailyHeaders = ['日期', '唯一人次', ...gptList];
        parts.push(dailyHeaders.map(esc).join(','));
        (data.daily || []).forEach(({ day, uniqueUsers }) => {
            const row = [day, uniqueUsers];
            gptList.forEach((g) => {
                const v = (data.dailyByGpt && data.dailyByGpt[day] && data.dailyByGpt[day][g]) ? data.dailyByGpt[day][g] : 0;
                row.push(v);
            });
            parts.push(row.map(esc).join(','));
        });

        parts.push('');
        parts.push('=== 時段分析 ===');
        const hourDist = data.hourDist || { hourTotals: Array.from({ length: 24 }, () => 0), hourByUser: {}, userList: [] };
        const hourHeaders = ['時段(0-23)', '查詢數', ... (hourDist.userList || [])];
        parts.push(hourHeaders.map(esc).join(','));
        const hourTotals = hourDist.hourTotals || Array.from({ length: 24 }, () => 0);
        for (let h = 0; h < 24; h++) {
            const row = [String(h), hourTotals[h] || 0];
            (hourDist.userList || []).forEach(uid => {
                const v = (hourDist.hourByUser && hourDist.hourByUser[h] && hourDist.hourByUser[h][uid]) ? hourDist.hourByUser[h][uid] : 0;
                row.push(v);
            });
            parts.push(row.map(esc).join(','));
        }

        parts.push('');
        parts.push('=== 詳細log ===');
        const logHeaders = ['UserId', '用戶問題', 'GPT回答', '是否得到解決', '回答正確率', '對話時間'];
        parts.push(logHeaders.map(esc).join(','));
        (data.inclRawLog || []).forEach((r) => {
            const row = [
                r.userId || '',
                r.content || '',
                r.gptResponse || '',
                r.resolved || '',
                r.accuracy || '',
                r.time || ''
            ];
            parts.push(row.map(esc).join(','));
        });

        const csvContent = parts.join('\n');

        const weekStart = (data.kpiSummary && data.kpiSummary.weekStart) ? data.kpiSummary.weekStart : null;
        const weekEnd = (data.kpiSummary && data.kpiSummary.weekEnd) ? data.kpiSummary.weekEnd : null;
        const nameSuffix = (weekStart && weekEnd) ? `${weekStart}_to_${weekEnd}` : new Date().toISOString().slice(0,10);
        const filename = `user_chat_analysis_${nameSuffix}.csv`;

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };
    const scanCurrent = () => {
        const rows = extractRows();
        const rowsIncluded = rows.filter(r => !EXCLUDED_USERS.has(r.userId));
        console.debug('ucduc: scanCurrent included rows count', rowsIncluded.length);
        const data = aggregateDailyUnique(rowsIncluded);
        const hourDist = computeHourDistribution(rowsIncluded);
        const inclRawLog = buildIncludedRawLog(rowsIncluded);
        const storedRange = (window.__ucduc_custom_range && window.__ucduc_custom_range.startDate && window.__ucduc_custom_range.endDate) ? window.__ucduc_custom_range : null;
        const kpiSummary = calculateKpiSummary(rows, storedRange);
        data.hourDist = hourDist;
        data.inclRawLog = inclRawLog;
        data.kpiSummary = kpiSummary;
        window.__ucduc_data = data;
        renderData(data);
    };

    let __scanAbortController = null;
    let __scanInFlight = null;
    const __rangeCache = new Map();
    const scanAllPages = async () => {
        try { if (__scanAbortController) __scanAbortController.abort(); } catch {}
        __scanAbortController = new AbortController();
        const signal = __scanAbortController.signal;

        setPagerSizeTo100();

        const table = document.querySelector('.kernel-table-ui');
        const container = table?.closest('.kernel-table-ui');
        const currentUrl = new URL(location.href);
        
        const size = '100';
        if (currentUrl.searchParams.get('size') !== '100') {
            currentUrl.searchParams.set('size', '100');
            console.debug('ucduc: scanAllPages - 強制設定頁面大小為 100');
        }
        
        const startParam = currentUrl.searchParams.get('startDate') || '';
        const endParam = currentUrl.searchParams.get('endDate') || '';

        const cacheKey = `${startParam}|${endParam}|${size}`;
        if (__rangeCache.has(cacheKey)) {
            const cached = __rangeCache.get(cacheKey);
            if (cached && typeof cached.then === 'function') {
                return cached;
            }
            window.__ucduc_data = cached;
            renderData(cached);
            return cached;
        }

        const pageLinks = Array.from(document.querySelectorAll('.ui-pager a[href*="/UserChat?"]'))
            .map(a => a.getAttribute('href'))
            .filter(Boolean)
            .map(href => {
                try {
                    const u = new URL(href, location.origin);
                    u.searchParams.set('size', '100');
                    return u.toString();
                } catch (e) { return null; }
            })
            .filter(Boolean);

        const byPage = new Map();
        pageLinks.forEach((urlStr) => {
                try {
                    const u = new URL(urlStr, location.origin);
                    u.searchParams.set('size', '100');
                    const p = u.searchParams.get('page');
                    if (p !== null && Number(p) >= 0) byPage.set(p, u.toString());
                } catch { }
        });
        
        const currentPageParam = currentUrl.searchParams.get('page') || '0';
        if (!byPage.has(currentPageParam)) {
            const currentUrlWith100 = new URL(currentUrl);
            currentUrlWith100.searchParams.set('size', '100');
            byPage.set(currentPageParam, currentUrlWith100.toString());
        }

        console.debug('ucduc: scanAllPages - 將掃描', byPage.size, '個頁面，每頁 100 筆資料');

        const fetchOpts = { credentials: 'include', signal };
        const pageUrls = Array.from(byPage.values());
        const pageDocs = await Promise.all(pageUrls.map(async (urlStr) => {
            try {
                const res = await fetch(urlStr, fetchOpts);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const html = await res.text();
                return new DOMParser().parseFromString(html, 'text/html');
            } catch (e) {
                if (e.name === 'AbortError') return null;
                console.warn('抓取頁面失敗', urlStr, e);
                return null;
            }
        }));

        const allRows = [];
        pageDocs.forEach((doc, idx) => {
            if (!doc) return;
            const tbody = doc.querySelector('.kernel-table-ui tbody');
            if (!tbody) return;
            const pageRows = extractRows(doc).filter(r => !EXCLUDED_USERS.has(r.userId));
            console.debug('ucduc: fetched', pageUrls[idx], 'included rows', pageRows.length);
            pageRows.forEach(r => allRows.push(r));
        });
        console.debug('ucduc: total aggregated included rows from pages', allRows.length);

        const allRowsForKpi = [];
        pageDocs.forEach((doc) => {
            if (!doc) return;
            const tbody = doc.querySelector('.kernel-table-ui tbody');
            if (!tbody) return;
            const pageRows = extractRows(doc);
            pageRows.forEach(r => allRowsForKpi.push(r));
        });

        const data = aggregateDailyUnique(allRows);
        const hourDist = computeHourDistribution(allRows);
        const inclRawLog = buildIncludedRawLog(allRows);
        const storedRange2 = (window.__ucduc_custom_range && window.__ucduc_custom_range.startDate && window.__ucduc_custom_range.endDate) ? window.__ucduc_custom_range : null;
        const kpiSummary = calculateKpiSummary(allRowsForKpi, storedRange2);
        data.hourDist = hourDist;
        data.inclRawLog = inclRawLog;
        data.kpiSummary = kpiSummary;
        window.__ucduc_data = data;
        window.__ucduc_allRowsForKpi = allRowsForKpi;

        __rangeCache.set(cacheKey, data);
        renderData(data);
        return data;
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
    const init = async () => {
        const panel = ensurePanel();
        ensureResetViewport();
        try {
            chrome.storage && chrome.storage.sync && chrome.storage.sync.get([STORAGE_KEY], (res) => {
                const val = res && res[STORAGE_KEY];
                if (val && val.startDate) {
                    const el = document.getElementById('ucduc-start-input'); if (el) el.value = val.startDate;
                }
                if (val && val.endDate) {
                    const el2 = document.getElementById('ucduc-end-input'); if (el2) el2.value = val.endDate;
                }
                try { window.__ucduc_custom_range = val || null; } catch (e) {}
            });
        } catch (e) { }

        try {
            await ensureWeekRangeAndQuery();
        } catch (e) {
            console.warn('ucduc: ensureWeekRangeAndQuery failed', e);
        }

        setPagerSizeTo100();
        fixPageTimes();

        scanAllPages();

        const setupPageSizeObserver = () => {
            try {
                const targetNode = document.body;
                const config = { childList: true, subtree: true };
                
                const callback = (mutationsList) => {
                    for (let mutation of mutationsList) {
                        if (mutation.type === 'childList') {
                            const addedNodes = Array.from(mutation.addedNodes);
                            const hasPagerChanges = addedNodes.some(node => 
                                node.nodeType === Node.ELEMENT_NODE && 
                                (node.classList?.contains('ui-pager') || 
                                 node.querySelector?.('.ui-pager'))
                            );
                            
                            if (hasPagerChanges) {
                                setTimeout(() => setPagerSizeTo100(), 100);
                            }
                        }
                    }
                };
                
                const observer = new MutationObserver(callback);
                observer.observe(targetNode, config);
                
                console.debug('ucduc: 設置頁面大小監聽器成功');
            } catch (e) {
                console.warn('ucduc: 設置頁面大小監聽器失敗', e);
            }
        };
        
        setupPageSizeObserver();
    };

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
    } else {
        document.addEventListener('DOMContentLoaded', init);
    }
})();
