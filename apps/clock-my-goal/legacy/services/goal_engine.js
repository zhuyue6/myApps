/**
 * 目标进度、周期、打卡资格核算（纯函数 + 小状态，便于单测与后续服务端对齐）
 */
const {
  toYMD,
  parseYMD,
  todayYMD,
  diffDays,
  weekday,
  isoWeekKey,
  monthKey,
  yearKey,
  eachDayInclusive,
  isNowInHmWindow,
} = require('../utils/date_util');

/** @typedef {'not_started'|'in_progress'|'completed'|'incomplete'|'paused'|'archived'|'deleted'} GoalStatus */

/**
 * @param {object} rule
 * @param {string} startYmd
 * @param {string} endYmd
 * @returns {string[]} 周期 key 列表
 */
function listCycleKeys(rule, startYmd, endYmd) {
  const t = rule && rule.cycleType ? rule.cycleType : 'day';
  const days = eachDayInclusive(startYmd, endYmd);
  if (t === 'day') {
    const pick = rule && rule.dayDates && rule.dayDates.length ? rule.dayDates : null;
    if (!pick) return days;
    const set = {};
    pick.forEach((d) => {
      set[d] = true;
    });
    return days.filter((d) => set[d]);
  }
  if (t === 'week') {
    const set = {};
    days.forEach((d) => {
      set[isoWeekKey(d).key] = true;
    });
    return Object.keys(set).sort();
  }
  if (t === 'month') {
    const set = {};
    days.forEach((d) => {
      set[monthKey(d)] = true;
    });
    return Object.keys(set).sort();
  }
  if (t === 'year') {
    const set = {};
    days.forEach((d) => {
      set[yearKey(d)] = true;
    });
    return Object.keys(set).sort();
  }
  return days;
}

/**
 * 判断某日是否允许打卡（探索版：day 恒为 true；week 按 weekDays 过滤）
 * @param {object} rule
 * @param {string} dayYmd
 */
function isDayActiveForRule(rule, dayYmd) {
  const t = rule.cycleType || 'day';
  if (t === 'week') {
    const wd = rule.weekDays && rule.weekDays.length ? rule.weekDays : [0, 1, 2, 3, 4, 5, 6];
    return wd.indexOf(weekday(dayYmd)) >= 0;
  }
  // day 周期：所有自然日均为「计划日」，每日计划次数由 dayTimeWindows 决定
  if (t === 'day') {
    const list = rule.dayDates && rule.dayDates.length ? rule.dayDates : null;
    if (!list) return true;
    return list.indexOf(dayYmd) >= 0;
  }
  if (t === 'month') {
    const dom = parseYMD(dayYmd).getDate();
    const md = rule.monthDays && rule.monthDays.length ? rule.monthDays : null;
    if (!md) return true;
    const last = new Date(parseYMD(dayYmd).getFullYear(), parseYMD(dayYmd).getMonth() + 1, 0).getDate();
    return md.some((d) => {
      const target = Math.min(d, last);
      return target === dom;
    });
  }
  if (t === 'year') {
    const mdPart = dayYmd.slice(5);
    const list = rule.yearMdList && rule.yearMdList.length ? rule.yearMdList : null;
    if (!list) return true;
    return list.indexOf(mdPart) >= 0;
  }
  return true;
}

/**
 * 当日「计划打卡次数」
 *  - day：dayTimeWindows 长度
 *  - week：weekDays 命中则 1，否则 0
 * @param {object} rule
 * @param {string} ymd
 */
function plannedCountOnDay(rule, ymd) {
  const t = rule.cycleType || 'day';
  if (t === 'week') {
    return isDayActiveForRule(rule, ymd) ? 1 : 0;
  }
  if (t === 'day') {
    if (!isDayActiveForRule(rule, ymd)) return 0;
    const wins = Array.isArray(rule.dayTimeWindows) ? rule.dayTimeWindows.length : 0;
    if (wins > 0) return wins;
    return Math.max(1, Number(rule.timesPerCycle) || 1);
  }
  // month / year 兼容
  return isDayActiveForRule(rule, ymd) ? Math.max(1, Number(rule.timesPerCycle) || 1) : 0;
}

/**
 * 将打卡时间映射到周期 key
 * @param {object} rule
 * @param {number} ts ms
 */
function cycleKeyForTimestamp(rule, ts) {
  const d = toYMD(new Date(ts));
  const t = rule.cycleType || 'day';
  if (t === 'day') return d;
  if (t === 'week') return isoWeekKey(d).key;
  if (t === 'month') return monthKey(d);
  if (t === 'year') return yearKey(d);
  return d;
}

/**
 * 某周期内「活跃自然日」数量（用于估算需求上限，探索版按次数累计）
 * @param {object} rule
 * @param {string} cycleKey
 * @param {string} startYmd
 * @param {string} endYmd
 */
function activeDaysInCycle(rule, cycleKey, startYmd, endYmd) {
  const days = eachDayInclusive(startYmd, endYmd).filter((d) => {
    if (d < startYmd || d > endYmd) return false;
    const ck =
      rule.cycleType === 'week'
        ? isoWeekKey(d).key
        : rule.cycleType === 'month'
          ? monthKey(d)
          : rule.cycleType === 'year'
            ? yearKey(d)
            : d;
    return ck === cycleKey && isDayActiveForRule(rule, d);
  });
  return days.length;
}

/**
 * 子目标全周期应完成「打卡点」总数（每周期 cap 在 timesPerCycle）
 * @param {object} goal
 * @param {object} rule
 */
function totalRequiredPoints(goal, rule) {
  if (!rule || goal.type !== 'sub') return 0;
  const start = goal.startDate;
  const end = goal.endDate;
  const t = rule.cycleType || 'day';
  const n = Math.max(1, Number(rule.timesPerCycle) || 1);
  if (t === 'day') {
    const dayCount = eachDayInclusive(start, end).filter((d) => isDayActiveForRule(rule, d)).length;
    return dayCount * n;
  }
  const keys = listCycleKeys(rule, start, end);
  let sum = 0;
  keys.forEach((k) => {
    const active = activeDaysInRuleCycle(rule, k, start, end);
    const cap = Math.max(1, active);
    sum += Math.min(n, cap);
  });
  return sum;
}

/**
 * @param {object} rule
 * @param {string} cycleKey
 * @param {string} startYmd
 * @param {string} endYmd
 */
function activeDaysInRuleCycle(rule, cycleKey, startYmd, endYmd) {
  const days = eachDayInclusive(startYmd, endYmd).filter((d) => {
    const ck =
      rule.cycleType === 'week'
        ? isoWeekKey(d).key
        : rule.cycleType === 'month'
          ? monthKey(d)
          : rule.cycleType === 'year'
            ? yearKey(d)
            : d;
    return ck === cycleKey && isDayActiveForRule(rule, d);
  });
  return days.length;
}

/**
 * 统计某周期已打卡次数（含补卡）
 * @param {object[]} records {ts,cycleKey,type}
 * @param {string} cycleKey
 */
function countInCycle(records, cycleKey) {
  return records.filter((r) => r.cycleKey === cycleKey).length;
}

/**
 * 子目标进度 0-100
 * @param {object} goal
 * @param {object} rule
 * @param {object[]} checkIns 属于该 goal
 */
function computeSubProgress(goal, rule, checkIns) {
  const req = totalRequiredPoints(goal, rule);
  if (req <= 0) return 0;
  const keys = listCycleKeys(rule, goal.startDate, goal.endDate);
  const n = Math.max(1, Number(rule.timesPerCycle) || 1);
  let credited = 0;
  keys.forEach((k) => {
    const c = countInCycle(checkIns, k);
    let cap = n;
    if (rule.cycleType !== 'day') {
      const active = activeDaysInRuleCycle(rule, k, goal.startDate, goal.endDate);
      cap = Math.min(n, Math.max(1, active));
    }
    credited += Math.min(c, cap);
  });
  const p = (credited / req) * 100;
  return Math.max(0, Math.min(100, Math.round(p * 100) / 100));
}

/**
 * 主目标进度
 * @param {object} mainGoal
 * @param {object[]} allGoals
 * @param {Record<string, object[]>} checkInsByGoalId
 */
function computeMainProgress(mainGoal, allGoals, checkInsByGoalId) {
  const links = mainGoal.subLinks || [];
  if (!links.length) return 0;
  let sum = 0;
  links.forEach((l) => {
    const sub = allGoals.find((g) => g.id === l.subGoalId && g.type === 'sub');
    if (!sub) return;
    const prog = computeSubProgress(sub, sub.checkInRule || {}, checkInsByGoalId[sub.id] || []);
    sum += (Number(l.weight) || 0) * (prog / 100);
  });
  return Math.max(0, Math.min(100, Math.round(sum * 100) / 100));
}

/**
 * 根据业务规则推导展示用状态（结合已有 status、pause）
 * @param {object} goal
 * @param {number} progress01_100
 */
function deriveAutoStatus(goal, progress01_100) {
  const today = todayYMD();
  if (goal.status === 'archived' || goal.status === 'deleted') return goal.status;
  if (goal.status === 'paused') return 'paused';
  if (diffDays(today, goal.startDate) < 0) return 'not_started';
  if (diffDays(today, goal.endDate) > 0) {
    if (progress01_100 >= 100) return 'completed';
    return 'incomplete';
  }
  if (progress01_100 >= 100) return 'completed';
  return 'in_progress';
}

/**
 * 子目标是否允许打卡按钮（状态 + 时间窗 + 周期 cap）
 * @param {object} goal
 * @param {object} rule
 * @param {object[]} checkIns
 */
function canCheckInSubNow(goal, rule, checkIns) {
  const today = todayYMD();
  const st = goal.displayStatus || goal.status;
  if (st !== 'in_progress') {
    return { ok: false, reason: st === 'not_started' ? '目标尚未开始' : '当前状态不可打卡' };
  }
  if (today < goal.startDate) return { ok: false, reason: `开始时间为 ${goal.startDate}` };
  if (today > goal.endDate) return { ok: false, reason: '目标已结束' };
  if (!isDayActiveForRule(rule, today)) return { ok: false, reason: '今日不在计划打卡日' };
  // day 周期支持多时段：任一时段命中即可
  if (rule.cycleType === 'day' && Array.isArray(rule.dayTimeWindows) && rule.dayTimeWindows.length) {
    const hit = rule.dayTimeWindows.some((w) =>
      isNowInHmWindow(w.from || '00:00', w.to || '23:59'),
    );
    if (!hit) {
      const wins = rule.dayTimeWindows.map((w) => `${w.from}-${w.to}`).join('、');
      return { ok: false, reason: `请在时段 ${wins} 内打卡` };
    }
  } else {
    const from = rule.dayValidFrom || '00:00';
    const to = rule.dayValidTo || '23:59';
    if (!isNowInHmWindow(from, to)) return { ok: false, reason: `请在 ${from}-${to} 内打卡` };
  }
  const ck = cycleKeyForTimestamp(rule, Date.now());
  const done = countInCycle(checkIns, ck);
  const need = Math.max(1, Number(rule.timesPerCycle) || 1);
  let cap = need;
  if (rule.cycleType !== 'day') {
    const active = activeDaysInRuleCycle(rule, ck, goal.startDate, goal.endDate);
    cap = Math.min(need, Math.max(1, active));
  }
  if (done >= cap) return { ok: false, reason: '本周期打卡次数已完成' };
  return { ok: true, reason: '' };
}

/**
 * 连续打卡天数（不含补卡）：按自然日连续有正常打卡
 * @param {object[]} checkIns
 */
function streakNormalDays(checkIns) {
  const days = {};
  checkIns.forEach((r) => {
    if (r.type === 'makeup') return;
    const d = toYMD(new Date(r.ts));
    days[d] = true;
  });
  let cur = todayYMD();
  let n = 0;
  while (days[cur]) {
    n += 1;
    const t = parseYMD(cur);
    t.setDate(t.getDate() - 1);
    cur = toYMD(t);
  }
  return n;
}

module.exports = {
  listCycleKeys,
  isDayActiveForRule,
  plannedCountOnDay,
  cycleKeyForTimestamp,
  totalRequiredPoints,
  computeSubProgress,
  computeMainProgress,
  deriveAutoStatus,
  canCheckInSubNow,
  streakNormalDays,
  eachDayInclusive,
  activeDaysInRuleCycle,
};
