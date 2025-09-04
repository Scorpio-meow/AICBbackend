// Quick test for aggregateDailyUnique logic
(function(){
  // copy of aggregateDailyUnique from content.js (trim-only uid, per-gpt)
  function aggregateDailyUnique(rows) {
    const byDay = new Map();
    const byDayGpt = new Map();
    rows.forEach(({ userId, gptId, day }) => {
      if (!day || !userId) return;
      const uid = userId.toString().trim();
      const gid = (gptId || 'unknown').toString().trim();
      if (!byDay.has(day)) byDay.set(day, new Set());
      byDay.get(day).add(uid);
      const key = `${day}|${gid}`;
      if (!byDayGpt.has(key)) byDayGpt.set(key, new Set());
      byDayGpt.get(key).add(uid);
    });
    const daily = Array.from(byDay.entries()).map(([day,set]) => ({ day, uniqueUsers: set.size })).sort((a,b)=>a.day.localeCompare(b.day));
    const dailyByGpt = {};
    byDayGpt.forEach((set,key)=>{
      const [day,gptId] = key.split('|');
      if (!dailyByGpt[day]) dailyByGpt[day] = {};
      dailyByGpt[day][gptId] = set.size;
    });
    return { daily, dailyByGpt };
  }

  const rows = [
    { userId: 'ccl', gptId: 'chat5', time: '2025-09-02 06:05:20', day: '2025-09-02' },
    { userId: 'dorislin920', gptId: 'chat5', time: '2025-09-02 02:29:38', day: '2025-09-02' },
    { userId: 'dorislin920', gptId: 'chat5', time: '2025-09-02 02:29:07', day: '2025-09-02' },
    { userId: 'monica820228316', gptId: 'chat5', time: '2025-09-02 02:04:56', day: '2025-09-02' },
    { userId: 'jony', gptId: 'chat5', time: '2025-09-01 08:05:12', day: '2025-09-01' }
  ];

  const out = aggregateDailyUnique(rows);
  console.log(JSON.stringify(out, null, 2));
})();
