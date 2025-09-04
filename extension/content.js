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
            const chatIdFromAttr = a ? a.getAttribute('data-chatid') : null;

            const uid = account; // always trust visible account
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
        const excludedRows = rows.filter(r => r && r.source === 'User' && EXCLUDED_USERS.has(r.userId));
        const userGptPairs = groupUserGptPairs(excludedRows);
        
        userGptPairs.forEach((pair) => {
            if (!pair.userQuestion) return;
            
            const dt = parseUtcTimestamp(pair.userQuestion.time);
            if (!dt) return;
            
            // Analyze GPT response quality if available
            let assessment = { resolved: '未知', accuracy: '0%' };
            if (pair.gptResponse && pair.gptResponse.content) {
                assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
            }
            
            out.push({
                userId: pair.userQuestion.userId,
                content: pair.userQuestion.content || '',
                gptResponse: pair.gptResponse ? pair.gptResponse.content || '' : '無回應',
                resolved: assessment.resolved,
                accuracy: assessment.accuracy,
                time: formatYMDHMS(dt)
            });
        });
        
        // sort by time asc
        out.sort((a, b) => a.time.localeCompare(b.time));
        return out;
    };

    // Calculate KPI summary for the week
    const calculateKpiSummary = (rows) => {
        const { startDate, endDate } = getCurrentWeekRange();
        
        // Filter to only include data within current week and from users only
        const weekRows = rows.filter(r => {
            if (!r || r.source !== 'User') return false;
            if (EXCLUDED_USERS.has(r.userId)) return false;
            return r.day >= startDate && r.day <= endDate;
        });

        const uniqueUsers = new Set();
        const dailyActiveUsers = new Map(); // day -> Set of users
        const hourlyQueries = new Map(); // hour -> count
        const userQueryCounts = new Map(); // userId -> count
        const newUsers = new Set(); // users appearing for first time this week
        const returningUsers = new Set(); // users who appeared before this week
        
        let totalQueries = 0;
        let peakHour = 0;
        let peakHourQueries = 0;
        let resolvedCount = 0;
        let totalAccuracyScore = 0;
        let resolutionAttempts = 0;

        // Process all historical data to identify new vs returning users
        const allHistoricalUsers = new Set();
        rows.forEach(r => {
            if (!r || r.source !== 'User') return;
            if (EXCLUDED_USERS.has(r.userId)) return;
            if (r.day < startDate) {
                allHistoricalUsers.add(r.userId);
            }
        });

        // Get all week rows including GPT responses for proper pairing
        const allWeekRows = rows.filter(r => {
            if (!r) return false;
            if (EXCLUDED_USERS.has(r.userId)) return false;
            return r.day >= startDate && r.day <= endDate;
        });

        // Process current week data with GPT response analysis
        const userGptPairs = groupUserGptPairs(allWeekRows);
        console.debug('ucduc: KPI calculation - userGptPairs count:', userGptPairs.length);
        
        userGptPairs.forEach(pair => {
            if (!pair.userQuestion) return;
            
            const hour = toHour(pair.userQuestion.time);
            let assessment = { resolved: '未知', accuracy: '0%' };
            
            // Analyze GPT response quality if available
            if (pair.gptResponse && pair.gptResponse.content) {
                assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
                console.debug('ucduc: GPT response assessment:', {
                    user: pair.userQuestion.userId,
                    question: pair.userQuestion.content,
                    resolved: assessment.resolved,
                    accuracy: assessment.accuracy,
                    hasGptResponse: !!pair.gptResponse
                });
            } else {
                console.debug('ucduc: No GPT response found for user:', pair.userQuestion.userId);
            }
            
            uniqueUsers.add(pair.userQuestion.userId);
            totalQueries++;
            resolutionAttempts++;
            
            // Calculate resolution statistics based on GPT response quality
            if (assessment.resolved === '是') {
                resolvedCount++;
            } else if (assessment.resolved === '部分') {
                resolvedCount += 0.5; // Partial resolution counts as half
            }
            
            // Calculate accuracy score (convert percentage to number)
            const accuracyNum = parseFloat(assessment.accuracy.replace('%', '')) || 0;
            totalAccuracyScore += accuracyNum;
            
            // Daily active users
            if (!dailyActiveUsers.has(pair.userQuestion.day)) {
                dailyActiveUsers.set(pair.userQuestion.day, new Set());
            }
            dailyActiveUsers.get(pair.userQuestion.day).add(pair.userQuestion.userId);
            
            // Hourly distribution
            if (hour !== null) {
                hourlyQueries.set(hour, (hourlyQueries.get(hour) || 0) + 1);
            }
            
            // User query counts
            userQueryCounts.set(pair.userQuestion.userId, (userQueryCounts.get(pair.userQuestion.userId) || 0) + 1);
            
            // New vs returning users
            if (allHistoricalUsers.has(pair.userQuestion.userId)) {
                returningUsers.add(pair.userQuestion.userId);
            } else {
                newUsers.add(pair.userQuestion.userId);
            }
        });

        // Find peak hour
        let maxQueries = 0;
        hourlyQueries.forEach((count, hour) => {
            if (count > maxQueries) {
                maxQueries = count;
                peakHour = hour;
                peakHourQueries = count;
            }
        });

        // Calculate DAU average (total unique users across all days / number of days)
        const activeDays = dailyActiveUsers.size;
        const totalDailyUsers = Array.from(dailyActiveUsers.values()).reduce((sum, users) => sum + users.size, 0);
        const avgDau = activeDays > 0 ? (totalDailyUsers / activeDays).toFixed(1) : '0';

        // Calculate weekly active users (WAU)
        const wau = uniqueUsers.size;

        // Calculate average queries per user
        const avgQueriesPerUser = wau > 0 ? (totalQueries / wau).toFixed(1) : '0';

        // Calculate actual resolution rate based on content analysis
        const resolutionRate = totalQueries > 0 ? ((resolvedCount / totalQueries) * 100).toFixed(1) : '0';
        
        // Calculate average accuracy rate
        const avgAccuracyRate = totalQueries > 0 ? (totalAccuracyScore / totalQueries).toFixed(1) : '0';
        
        // Calculate average resolution attempts (queries per resolved issue)
        const avgResolutionAttempts = resolvedCount > 0 ? (totalQueries / resolvedCount).toFixed(1) : '1.0';
        
        // Unresolved queries
        const unresolvedQueries = Math.round(totalQueries - resolvedCount);

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
            unresolvedQueries: unresolvedQueries,
            newUsers: newUsers.size,
            returningUsers: returningUsers.size
        };
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
          <button id="ucduc-toggle-kpi" data-active="true">隱藏KPI</button>
          <button id="ucduc-toggle-daily">每日統計</button>
          <button id="ucduc-toggle-hour">時段分析</button>
          <button id="ucduc-toggle-log">詳細log</button>
          <button id="ucduc-scan">聚合全頁</button>
          <button id="ucduc-export">匯出CSV</button>
          <button id="ucduc-close">×</button>
        </div>
      </div>
            <div class="ucduc-body">
                <!-- KPI Summary Section -->
                <div id="ucduc-kpi-section" style="display:block;">
                    <div style="font-weight:600; margin:6px 0 8px; color:#0366d6;">📊 摘要_KPI</div>
                    <div style="overflow:auto; margin-bottom:16px;">
                        <table id="ucduc-kpi-table">
                            <thead>
                                <tr><th style="width:200px;">指標</th><th style="width:100px;">數值</th><th>備註</th></tr>
                            </thead>
                            <tbody>
                                <tr><td>週起 (Week Start)</td><td id="kpi-week-start">-</td><td></td></tr>
                                <tr><td>週終 (Week End)</td><td id="kpi-week-end">-</td><td></td></tr>
                                <tr><td>日活平均 DAU (avg)</td><td id="kpi-avg-dau">-</td><td></td></tr>
                                <tr><td>週活 WAU (weekly active users)</td><td id="kpi-wau">-</td><td></td></tr>
                                <tr><td>本週查詢總數</td><td id="kpi-total-queries">-</td><td></td></tr>
                                <tr><td>高峰時段 (時)</td><td id="kpi-peak-hour">-</td><td></td></tr>
                                <tr><td>高峰時段查詢數</td><td id="kpi-peak-hour-queries">-</td><td></td></tr>
                                <tr><td>每用戶平均查詢 (週)</td><td id="kpi-avg-queries-per-user">-</td><td></td></tr>
                                <tr><td>解決率 (%)</td><td id="kpi-resolution-rate">-</td><td>基於內容分析</td></tr>
                                <tr><td>平均回答正確率 (%)</td><td id="kpi-avg-accuracy">-</td><td>基於內容分析</td></tr>
                                <tr><td>平均解決嘗試次數</td><td id="kpi-avg-attempts">-</td><td>基於解決數量</td></tr>
                                <tr><td>未解決數量</td><td id="kpi-unresolved">-</td><td></td></tr>
                                <tr><td>本週新用戶</td><td id="kpi-new-users">-</td><td></td></tr>
                                <tr><td>本週回訪用戶</td><td id="kpi-returning-users">-</td><td></td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Daily Users Section -->
                <div id="ucduc-daily-section" style="display:none;">
                    <div style="font-weight:600; margin:6px 0 8px; color:#0366d6;">📅 每日使用人次</div>
                    <div id="ucduc-summary">掃描中或等待資料…</div>
                    <div style="overflow:auto; margin-bottom:8px;">
                        <table id="ucduc-table"><thead><tr><th>日期</th><th>唯一人次</th></tr></thead><tbody></tbody></table>
                    </div>
                </div>

                <!-- Hour Distribution Section -->
                <div id="ucduc-hour-section" style="display:none;">
                    <div style="font-weight:600; margin:6px 0 8px; color:#0366d6;">⏰ 使用時段_分佈</div>
                    <div style="overflow:auto">
                        <table id="ucduc-hour-table"><thead><tr><th>時段 (0-23)</th><th>查詢數</th></tr></thead><tbody></tbody></table>
                    </div>
                </div>

                <!-- Usage Log Section -->
                <div id="ucduc-log-section" style="display:none;">
                    <div style="font-weight:600; margin:6px 0 8px; color:#0366d6;">📋 每日使用log</div>
                    <div style="overflow:auto; max-height:300px;">
                        <table id="ucduc-incl-log-table">
                            <thead>
                                <tr>
                                    <th>UserId</th>
                                    <th>用戶問題</th>
                                    <th>GPT回答</th>
                                    <th>是否得到解決</th>
                                    <th>回答正確率</th>
                                    <th>對話時間</th>
                                </tr>
                            </thead>
                            <tbody></tbody>
                        </table>
                    </div>
                </div>
            </div>
    `;
        document.body.appendChild(panel);

        panel.querySelector('#ucduc-close')?.addEventListener('click', () => panel.remove());
        panel.querySelector('#ucduc-export')?.addEventListener('click', () => exportCSV());
        panel.querySelector('#ucduc-scan')?.addEventListener('click', () => scanAllPages());
        
        // Function to hide all sections
        const hideAllSections = () => {
            document.getElementById('ucduc-kpi-section').style.display = 'none';
            document.getElementById('ucduc-daily-section').style.display = 'none';
            document.getElementById('ucduc-hour-section').style.display = 'none';
            document.getElementById('ucduc-log-section').style.display = 'none';
        };

        // Function to reset all button texts and states
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
        
        // Toggle KPI section
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

        // Toggle Daily section
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

        // Toggle Hour section
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

        // Toggle Log section
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

    const renderData = ({ daily, dailyByGpt, hourDist, inclRawLog, kpiSummary }) => {
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

        // Render KPI summary
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

    // Intelligent resolution and accuracy assessment for GPT responses
    // Assess the quality of GPT responses based on content analysis
    const assessGptResponseQuality = (content, userQuestion = '') => {
        if (!content) return { resolved: '未知', accuracy: '0%' };
        
        const contentLower = content.toLowerCase().trim();
        const questionLower = userQuestion ? userQuestion.toLowerCase().trim() : '';
        
        // Keywords indicating comprehensive/helpful responses
        const goodResponseKeywords = [
            '根據公司', '根據', '文件', '程序', '作業程序', '以下是', '以下', 
            '詳細步驟', '具體方法', '完整說明', '範例', '示例', '教學', '指導',
            '解決方案', '建議', '推薦', '參考', '如下', '按照', '依照',
            'step by step', 'example', 'tutorial', 'guide', 'solution',
            '首先', '其次', '然後', '最後', '接下來', '另外', '希望這樣的答案',
            '可以知道', '處理方式如下', '相關的資訊', '有效期為'
        ];
        
        // Keywords indicating incomplete/unclear responses
        const poorResponseKeywords = [
            '抱歉', '無法', '不能', '不清楚', '不確定', '可能', '或許',
            '請聯繫', '請諮詢', '建議聯繫', '無法提供', '資訊不足', '沒有相關',
            'sorry', 'unable', 'cannot', 'unclear', 'uncertain', 'maybe',
            '很抱歉', '不好意思', '暫時無法', '目前無法', '並沒有被提及',
            '建議您直接聯繫', '進一步諮詢', '沒有相關的資訊'
        ];
        
        // Quality indicators
        const hasStructuredContent = /[1-9]\.|步驟|方法|流程|程序/.test(contentLower);
        const hasExamples = /例如|比如|舉例|範例|示例|example/.test(contentLower);
        const hasDetailedExplanation = contentLower.length > 100;
        const hasDocumentReference = /根據.*文件|根據公司|作業程序|faq|\.docx/.test(contentLower);
        const hasApology = poorResponseKeywords.some(keyword => contentLower.includes(keyword));
        const hasHelpfulKeywords = goodResponseKeywords.some(keyword => contentLower.includes(keyword));
        const hasStructuredList = /\*\s|•\s|-\s/.test(content);
        const hasSpecificInfo = /期限|有效期|發生日|個月|時間|折算|薪資/.test(contentLower);
        
        // Check for "no information available" responses - these should be marked as unresolved
        const isNoInfoResponse = /沒有.*資訊|目前沒有|沒有相關|無法直接找到|並沒有被提及|建議您直接聯繫|無法提供|沒有提到|並未提及|沒有明確提及|請查詢|請洽詢|sorry.*can't find|no relevant content/.test(contentLower);
        
        // Check for potential topic mismatch based on user question keywords
        let isPotentialMismatch = false;
        if (questionLower) {
            // Common question types and their expected answer indicators
            const questionTopics = {
                '特休': ['特休', '特別休假', '年假', '休假天數', '天數'],
                '喪假': ['喪假', '喪葬假', '請假', '假期'],
                '婚假': ['婚假', '結婚假', '請假', '假期'],
                '調薪': ['調薪', '加薪', '薪資調整', '加薪制度'],
                '職等': ['職等', '職級', '階級', '等級'],
                '會議室': ['會議室', '預約', '使用流程', '申請']
            };
            
            for (const [topic, indicators] of Object.entries(questionTopics)) {
                if (questionLower.includes(topic)) {
                    const hasRelevantContent = indicators.some(indicator => contentLower.includes(indicator));
                    if (!hasRelevantContent && !isNoInfoResponse) {
                        isPotentialMismatch = true;
                        break;
                    }
                }
            }
        }
        
        // Response quality assessment
        let resolved = '未知';
        let accuracy = '50%'; // Default middle value
        
        // Handle clear "no information" responses
        if (isNoInfoResponse) {
            resolved = '否';
            accuracy = '30%';
        }
        // Handle potential topic mismatch (answering different topic than asked)
        else if (isPotentialMismatch && hasDetailedExplanation) {
            resolved = '否';
            accuracy = '40%';
        }
        // Check if it's a genuinely poor response (short apology with no substance)
        else if ((hasApology || contentLower.includes('無法') || contentLower.includes('不能')) 
            && !hasDocumentReference && !hasStructuredContent && contentLower.length < 50) {
            resolved = '否';
            accuracy = '20%';
        }
        // Perfect response: comprehensive answer with all indicators
        else if (hasDocumentReference && hasStructuredContent && hasDetailedExplanation && hasHelpfulKeywords && !isNoInfoResponse) {
            // Perfect response: has document reference, structure, detail, and helpful content
            resolved = '是';
            accuracy = '95%';
        } else if ((hasStructuredContent || hasStructuredList) && hasDetailedExplanation && hasDocumentReference) {
            // Very good response: structured, detailed, with document reference
            resolved = '是';
            accuracy = '90%';
        } else if (hasHelpfulKeywords && hasDetailedExplanation && (hasStructuredContent || hasDocumentReference)) {
            // Good response: helpful, detailed, with some structure or reference
            resolved = '是';
            accuracy = '85%';
        } else if ((hasStructuredContent || hasExamples || hasSpecificInfo) && hasDetailedExplanation) {
            // Decent response: some structure/examples and detailed
            resolved = '部分';
            accuracy = '75%';
        } else if (hasHelpfulKeywords && hasDetailedExplanation) {
            // Okay response: helpful and detailed
            resolved = '部分';
            accuracy = '70%';
        } else if (hasDetailedExplanation) {
            // Basic response: just detailed
            resolved = '部分';
            accuracy = '60%';
        } else if (contentLower.length > 50) {
            // Short but substantial response
            resolved = '部分';
            accuracy = '50%';
        } else {
            // Very short or inadequate response
            resolved = '否';
            accuracy = '30%';
        }
        
        return { resolved, accuracy };
    };

    // Group user questions with corresponding GPT responses using chatId and time-based logic
    const groupUserGptPairs = (rows) => {
        const pairs = [];
        
        // Group by chatId first (most reliable method)
        const byChatId = new Map();
        rows.forEach(row => {
            if (row.chatId) {
                if (!byChatId.has(row.chatId)) {
                    byChatId.set(row.chatId, []);
                }
                byChatId.get(row.chatId).push(row);
            }
        });
        
        // Process chat groups - handle multiple user questions in same chatId
        byChatId.forEach((chatRows, chatId) => {
            const userRows = chatRows.filter(r => r.source === 'User').sort((a, b) => a.time.localeCompare(b.time));
            const gptRows = chatRows.filter(r => r.source === 'Gpt').sort((a, b) => a.time.localeCompare(b.time));
            
            // Pair each user question with the closest GPT response by time
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
        
        // Handle rows without chatId - fallback to time-based pairing
        const noChatIdRows = rows.filter(r => !r.chatId);
        if (noChatIdRows.length > 0) {
            const sortedRows = [...noChatIdRows].sort((a, b) => a.time.localeCompare(b.time));
            
            for (let i = 0; i < sortedRows.length; i++) {
                const currentRow = sortedRows[i];
                
                // Skip if current row is not from User
                if (currentRow.source !== 'User') continue;
                
                // Find the next GPT response for the same user within reasonable time window
                let gptResponse = null;
                for (let j = i + 1; j < sortedRows.length; j++) {
                    const nextRow = sortedRows[j];
                    if (nextRow.userId === currentRow.userId && nextRow.source === 'Gpt') {
                        // Check if time difference is reasonable (within 1 minute)
                        const timeDiff = Math.abs(new Date(nextRow.time) - new Date(currentRow.time));
                        if (timeDiff <= 60000) { // 1 minute in milliseconds
                            gptResponse = nextRow;
                            break;
                        }
                    }
                    // Stop if we find another user question from same user
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

    // Build included (non-excluded) raw log entries for display
    const buildIncludedRawLog = (rows) => {
        const out = [];
        const userGptPairs = groupUserGptPairs(rows.filter(r => !EXCLUDED_USERS.has(r.userId)));
        
        userGptPairs.forEach((pair) => {
            if (!pair.userQuestion) return;
            
            const dt = parseUtcTimestamp(pair.userQuestion.time);
            if (!dt) return;
            
            // Analyze GPT response quality if available
            let assessment = { resolved: '未知', accuracy: '0%' };
            if (pair.gptResponse && pair.gptResponse.content) {
                assessment = assessGptResponseQuality(pair.gptResponse.content, pair.userQuestion.content);
            }
            
            out.push({
                userId: pair.userQuestion.userId,
                content: pair.userQuestion.content || '',
                gptResponse: pair.gptResponse ? pair.gptResponse.content || '' : '無回應',
                resolved: assessment.resolved,
                accuracy: assessment.accuracy,
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
            // Add color coding for resolution status
            if (r.resolved === '是') {
                tdResolved.style.color = '#2da44e';
                tdResolved.style.background = '#f0fff4';
            } else if (r.resolved === '否') {
                tdResolved.style.color = '#cf222e';
                tdResolved.style.background = '#fff5f5';
            } else if (r.resolved === '部分') {
                tdResolved.style.color = '#bf8700';
                tdResolved.style.background = '#fffbeb';
            }
            
            const tdAcc = document.createElement('td');
            tdAcc.textContent = r.accuracy || '';
            // Add color coding for accuracy
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

    // Render KPI Summary table
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
        document.getElementById('kpi-new-users').textContent = kpiData.newUsers || '-';
        document.getElementById('kpi-returning-users').textContent = kpiData.returningUsers || '-';
    };

    


    // CSV export
    const exportCSV = () => {
        const data = window.__ucduc_data;
        if (!data) return;

        // Export both daily summary and detailed log
        let csvContent = '';
        
        // Daily Summary Section
        const gptSet = new Set();
        Object.values(data.dailyByGpt || {}).forEach((byGpt) => {
            Object.keys(byGpt).forEach(g => gptSet.add(g));
        });
        const gptList = Array.from(gptSet).sort();

        const headers = ['日期', '唯一人次', ...gptList];
        csvContent += '=== 每日使用人次統計 ===\n';
        csvContent += headers.join(',') + '\n';

        data.daily.forEach(({ day, uniqueUsers }) => {
            const row = [day, uniqueUsers];
            gptList.forEach((g) => {
                const v = (data.dailyByGpt[day] && data.dailyByGpt[day][g]) ? data.dailyByGpt[day][g] : 0;
                row.push(v);
            });
            csvContent += row.join(',') + '\n';
        });

        // Detailed Log Section
        csvContent += '\n=== 詳細使用記錄 ===\n';
        const logHeaders = ['UserId', '用戶問題', 'GPT回答', '是否得到解決', '回答正確率', '對話時間'];
        csvContent += logHeaders.join(',') + '\n';
        
        (data.inclRawLog || []).forEach((r) => {
            const userQuestion = (r.content || '').replace(/[,\n\r]/g, ' ').trim();
            const gptResponse = (r.gptResponse || '').replace(/[,\n\r]/g, ' ').trim();
            const row = [
                r.userId || '',
                `"${userQuestion}"`,
                `"${gptResponse}"`,
                r.resolved || '',
                r.accuracy || '',
                r.time || ''
            ];
            csvContent += row.join(',') + '\n';
        });

        // KPI Summary Section
        if (data.kpiSummary) {
            csvContent += '\n=== KPI摘要 ===\n';
            csvContent += '指標,數值,備註\n';
            csvContent += `週起,${data.kpiSummary.weekStart || '-'},\n`;
            csvContent += `週終,${data.kpiSummary.weekEnd || '-'},\n`;
            csvContent += `日活平均DAU,${data.kpiSummary.avgDau || '-'},\n`;
            csvContent += `週活WAU,${data.kpiSummary.wau || '-'},\n`;
            csvContent += `本週查詢總數,${data.kpiSummary.totalQueries || '-'},\n`;
            csvContent += `高峰時段,${(data.kpiSummary.peakHour !== undefined) ? data.kpiSummary.peakHour + ':00' : '-'},\n`;
            csvContent += `高峰時段查詢數,${data.kpiSummary.peakHourQueries || '-'},\n`;
            csvContent += `每用戶平均查詢,${data.kpiSummary.avgQueriesPerUser || '-'},\n`;
            csvContent += `解決率(%),${(data.kpiSummary.resolutionRate !== undefined) ? data.kpiSummary.resolutionRate + '%' : '-'},基於內容分析\n`;
            csvContent += `平均回答正確率(%),${(data.kpiSummary.avgAccuracyRate !== undefined) ? data.kpiSummary.avgAccuracyRate + '%' : '-'},基於內容分析\n`;
            csvContent += `平均解決嘗試次數,${data.kpiSummary.avgResolutionAttempts || '-'},基於解決數量\n`;
            csvContent += `未解決數量,${data.kpiSummary.unresolvedQueries || '-'},\n`;
            csvContent += `本週新用戶,${data.kpiSummary.newUsers || '-'},\n`;
            csvContent += `本週回訪用戶,${data.kpiSummary.returningUsers || '-'},\n`;
        }

        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'user_chat_analysis_complete.csv';
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
        const kpiSummary = calculateKpiSummary(rows); // Use all rows for KPI calculation
        data.hourDist = hourDist;
        data.inclRawLog = inclRawLog;
        data.kpiSummary = kpiSummary;
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

        // Get all rows (including excluded users) for KPI calculation
        const allRowsForKpi = [];
        for (const urlStr of byPage.values()) {
            try {
                const res = await fetch(urlStr, { credentials: 'include' });
                const html = await res.text();
                const doc = new DOMParser().parseFromString(html, 'text/html');
                const tbody = doc.querySelector('.kernel-table-ui tbody');
                if (!tbody) continue;
                const pageRows = extractRows(doc); // Don't filter for KPI
                pageRows.forEach(r => allRowsForKpi.push(r));
            } catch (e) {
                console.warn('抓取頁面失敗', urlStr, e);
            }
        }

        const data = aggregateDailyUnique(allRows);
        const hourDist = computeHourDistribution(allRows);
        const inclRawLog = buildIncludedRawLog(allRows);
        const kpiSummary = calculateKpiSummary(allRowsForKpi);
        data.hourDist = hourDist;
        data.inclRawLog = inclRawLog;
        data.kpiSummary = kpiSummary;
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
