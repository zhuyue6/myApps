/**
 * 《目标打卡》标准 API 层（Promise）。当前由本地 storage 实现，后续可替换为 HTTP 客户端，页面调用不变。
 */
const store = require('../storage/clock_in_store');
const engine = require('../services/goal_engine');
const {
  PRESET_TAGS,
  GOAL_TEMPLATES_BY_TAG,
  ACHIEVEMENT_DEFS,
  MAKEUP_WINDOW,
  MAX_MAKEUP_PER_GOAL,
  TRASH_RETENTION_DAYS,
  AUTO_ARCHIVE_AFTER_END_DAYS,
} = require('../utils/constants');
const dateUtil = require('../utils/date_util');

function genId() {
  return `ci_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** @param {any} x */
function clone(x) {
  return JSON.parse(JSON.stringify(x));
}

/** @param {object[]} checkIns */
function groupCheckInsByGoal(checkIns) {
  const m = {};
  (checkIns || []).forEach((c) => {
    if (!m[c.goalId]) m[c.goalId] = [];
    m[c.goalId].push(c);
  });
  return m;
}

/**
 * @param {object} s state
 * @param {string} id
 */
function findGoal(s, id) {
  return (s.goals || []).find((g) => g.id === id);
}

/**
 * @param {object} s
 * @returns {{id:string,name:string,type:string}[]}
 */
function listAllTagsMerged(s) {
  const hidden = new Set(s.hiddenPresetTagIds || []);
  const presets = PRESET_TAGS.filter((t) => !hidden.has(t.id)).map((t) => ({
    id: t.id,
    name: t.name,
    type: 'preset',
  }));
  const customs = (s.tags || []).map((t) => ({ id: t.id, name: t.name, type: 'custom' }));
  return presets.concat(customs);
}

/**
 * @param {object} s
 */
function resolveState(s) {
  const byG = groupCheckInsByGoal(s.checkIns || []);
  const today = dateUtil.todayYMD();
  (s.goals || []).forEach((g) => {
    if (g.status === 'deleted' || g.status === 'archived') return;
    if (g.type === 'sub') {
      const rule = g.checkInRule || { cycleType: 'day', timesPerCycle: 1 };
      const prog = engine.computeSubProgress(g, rule, byG[g.id] || []);
      g.progress = prog;
      if (dateUtil.diffDays(today, g.endDate) <= 0) {
        g.finalizedRate = null;
      }
      g.resolvedStatus = resolveSubStatus(g, prog, today);
      if (today > g.endDate && g.resolvedStatus === 'incomplete') {
        g.finalizedRate = g.finalizedRate == null ? prog : g.finalizedRate;
      }
      if (g.resolvedStatus === 'completed' && !g.completedAt) {
        g.completedAt = Date.now();
      }
    } else if (g.type === 'main') {
      if (dateUtil.diffDays(today, g.endDate) <= 0) {
        g.finalizedRate = null;
      }
      // 主目标可以不关联子目标：无关联时按日期推导状态，进度为 0，不再标记 mainBroken
      g.mainBroken = false;
      if (!g.subLinks || !g.subLinks.length) {
        g.progress = 0;
        g.resolvedStatus = resolveMainAuto(g, 0, today);
      } else {
        const prog = engine.computeMainProgress(g, s.goals, byG);
        g.progress = prog;
        g.resolvedStatus = resolveMainStatus(g, prog, today);
        if (today > g.endDate && g.resolvedStatus === 'incomplete') {
          g.finalizedRate = g.finalizedRate == null ? prog : g.finalizedRate;
        }
        if (g.resolvedStatus === 'completed' && !g.completedAt) {
          g.completedAt = Date.now();
        }
      }
    }
    if (g.status !== 'archived' && g.status !== 'deleted') {
      g.status = g.resolvedStatus;
    }
  });
  autoArchive(s, today);
  trashExpiry(s, today);
  refreshAchievements(s);
}

function resolveSubStatus(g, prog, today) {
  if (g.paused) return 'paused';
  if (dateUtil.diffDays(today, g.startDate) < 0) return 'not_started';
  if (prog >= 100) return 'completed';
  if (dateUtil.diffDays(today, g.endDate) > 0) return 'incomplete';
  return 'in_progress';
}

function resolveMainAuto(g, prog, today) {
  if (g.paused) return 'paused';
  if (dateUtil.diffDays(today, g.startDate) < 0) return 'not_started';
  if (prog >= 100) return 'completed';
  if (dateUtil.diffDays(today, g.endDate) > 0) return 'incomplete';
  return 'in_progress';
}

function resolveMainStatus(g, prog, today) {
  return resolveMainAuto(g, prog, today);
}

/**
 * @param {object} s
 * @param {string} today
 */
function autoArchive(s, today) {
  (s.goals || []).forEach((g) => {
    if (g.status !== 'completed' && g.status !== 'incomplete') return;
    if (g.status === 'archived' || g.status === 'deleted') return;
    const end = g.endDate;
    if (dateUtil.diffDays(today, end) <= AUTO_ARCHIVE_AFTER_END_DAYS) return;
    g.status = 'archived';
    g.archivedAt = g.archivedAt || Date.now();
    g.archiveReason = 'auto';
  });
}

/**
 * @param {object} s
 * @param {string} today
 */
function trashExpiry(s, today) {
  const ms = TRASH_RETENTION_DAYS * 86400000;
  (s.goals || []).forEach((g) => {
    if (g.status !== 'deleted' || !g.deletedAt) return;
    if (Date.now() - g.deletedAt > ms) {
      g.purged = true;
    }
  });
  s.goals = (s.goals || []).filter((g) => !g.purged);
  s.checkIns = (s.checkIns || []).filter((c) => {
    const gg = findGoal(s, c.goalId);
    return !!gg;
  });
}

/**
 * @param {object} s
 */
function refreshAchievements(s) {
  const goals = s.goals || [];
  const completedGoalsCount = goals.filter(
    (g) => g.status === 'completed' || g.progress >= 100,
  ).length;
  let maxStreak = 0;
  const byG = groupCheckInsByGoal(s.checkIns || []);
  Object.keys(byG).forEach((gid) => {
    maxStreak = Math.max(maxStreak, engine.streakNormalDays(byG[gid]));
  });
  const hasPerfectOnce = goals.some(
    (g) => (g.finalizedRate != null && g.finalizedRate >= 100) || g.status === 'completed',
  );
  const ctx = { completedGoalsCount, maxStreak, hasPerfectOnce };
  const unlocked = new Set(s.achievementsUnlocked || []);
  ACHIEVEMENT_DEFS.forEach((a) => {
    if (a.check(ctx)) unlocked.add(a.id);
  });
  s.achievementsUnlocked = Array.from(unlocked);
}

/**
 * @param {(s:object)=>void} fn
 */
async function sync(fn) {
  return new Promise((resolve, reject) => {
    try {
      const s = store.readState();
      fn(s);
      resolveState(s);
      store.writeState(s);
      resolve(true);
    } catch (e) {
      reject(e);
    }
  });
}

async function bootstrap() {
  return sync(() => {});
}

async function onAppShow() {
  return sync(() => {});
}

async function getOnboardingState() {
  const s = store.readState();
  return clone(s.onboarding || {});
}

async function completeWelcome() {
  return sync((s) => {
    s.onboarding = s.onboarding || {};
    s.onboarding.welcomeDone = true;
  });
}

async function saveOnboardingTags(presetIds, customNames) {
  return sync((s) => {
    s.onboarding = s.onboarding || {};
    s.onboarding.welcomeDone = true;
    s.onboarding.tagsSelected = true;
    s.onboarding.presetTagIds = presetIds || [];
    (customNames || []).forEach((name) => {
      const n = (name || '').trim();
      if (!n) return;
      if ((s.tags || []).some((t) => t.name === n)) return;
      s.tags = s.tags || [];
      s.tags.push({ id: genId(), name: n, createdAt: Date.now() });
    });
  });
}

async function skipOnboardingTags() {
  return sync((s) => {
    s.onboarding = s.onboarding || {};
    s.onboarding.tagsSelected = true;
  });
}

/**
 * 更新引导进度：'main' / 'sub' / 'link' / 'done'
 * @param {string} stage
 */
async function updateGuideStage(stage) {
  return sync((s) => {
    s.onboarding = s.onboarding || {};
    if (stage === 'main') s.onboarding.mainGoalCreated = true;
    else if (stage === 'sub') s.onboarding.subGoalCreated = true;
    else if (stage === 'link') s.onboarding.linkDone = true;
    else if (stage === 'done') {
      s.onboarding.guideDone = true;
      s.onboarding.firstGoalCreated = true;
    }
  });
}

async function completeFirstGoalFlow() {
  return sync((s) => {
    s.onboarding = s.onboarding || {};
    s.onboarding.firstGoalCreated = true;
    s.onboarding.guideDone = true;
  });
}

async function listTags() {
  const s = store.readState();
  return listAllTagsMerged(s);
}

async function createCustomTag(name) {
  const n = (name || '').trim();
  if (!n || n.length > 20) throw new Error('标签名称不合法');
  let id = '';
  await sync((s) => {
    s.tags = s.tags || [];
    if (s.tags.some((t) => t.name === n)) throw new Error('标签名称已存在');
    if (PRESET_TAGS.some((p) => p.name === n)) throw new Error('与预设标签重名');
    id = genId();
    s.tags.push({ id, name: n, createdAt: Date.now() });
  });
  return { id };
}

async function updateTag(id, name) {
  const n = (name || '').trim();
  if (!n) throw new Error('名称不能为空');
  await sync((s) => {
    const t = (s.tags || []).find((x) => x.id === id);
    if (!t) throw new Error('仅自定义标签可编辑');
    t.name = n;
  });
}

async function deleteTag(id) {
  await sync((s) => {
    if (PRESET_TAGS.some((p) => p.id === id)) {
      s.hiddenPresetTagIds = s.hiddenPresetTagIds || [];
      if (s.hiddenPresetTagIds.indexOf(id) < 0) s.hiddenPresetTagIds.push(id);
    } else {
      s.tags = (s.tags || []).filter((t) => t.id !== id);
    }
    (s.goals || []).forEach((g) => {
      if (g.tagId === id) g.tagId = '';
    });
  });
}

async function restorePresetTag(id) {
  await sync((s) => {
    s.hiddenPresetTagIds = (s.hiddenPresetTagIds || []).filter((x) => x !== id);
  });
}

/**
 * @param {{status?:string,tagId?:string}} query
 */
async function listGoals(query) {
  const s = store.readState();
  resolveState(s);
  store.writeState(s);
  let list = (s.goals || []).filter((g) => !g.purged);
  const q = query || {};
  if (q.includeDeleted) {
    /* keep */
  } else if (q.trashOnly) {
    list = list.filter((g) => g.status === 'deleted');
  } else if (q.archiveOnly) {
    list = list.filter((g) => g.status === 'archived');
  } else {
    list = list.filter((g) => g.status !== 'archived' && g.status !== 'deleted');
  }
  if (q.status) list = list.filter((g) => g.status === q.status);
  if (q.tagId) list = list.filter((g) => g.tagId === q.tagId);
  if (q.type) list = list.filter((g) => g.type === q.type);
  if (q.activeOnly) {
    list = list.filter((g) => ['not_started', 'in_progress', 'paused'].indexOf(g.status) >= 0);
  }
  list.sort((a, b) => dateUtil.diffDays(b.endDate, a.endDate));
  return clone(list);
}

async function getGoal(id) {
  const s = store.readState();
  resolveState(s);
  store.writeState(s);
  const g = findGoal(s, id);
  if (!g) return null;
  const byG = groupCheckInsByGoal(s.checkIns || []);
  return clone({ ...g, checkIns: byG[id] || [] });
}

/**
 * @param {object} payload
 */
function validateGoalPayload(payload) {
  if (!payload.name || !payload.name.trim()) throw new Error('请填写目标名称');
  if (!payload.startDate || !payload.endDate) throw new Error('请填写起止时间');
  if (dateUtil.diffDays(payload.endDate, payload.startDate) < 0)
    throw new Error('结束时间不能早于开始时间');
}

async function createGoal(payload) {
  validateGoalPayload(payload);
  let gid = '';
  await sync((s) => {
    const g = buildGoalFromPayload(payload, false);
    gid = g.id;
    if (g.type === 'main') {
      if (g.subLinks && g.subLinks.length) {
        assertWeights(g.subLinks);
        assertMainCoverDates(g, s.goals || []);
      }
    }
    if (g.type === 'sub') {
      assertRuleInRange(g, g.checkInRule);
    }
    s.goals = s.goals || [];
    s.goals.push(g);
  });
  return { id: gid };
}

/**
 * @param {object} payload
 * @param {boolean} isEdit
 */
function buildGoalFromPayload(payload, isEdit) {
  const id = payload.id || genId();
  const rule = payload.checkInRule;
  const normalizedRule =
    payload.type === 'main'
      ? null
      : rule && rule.cycleType
        ? normalizeRule(rule)
        : normalizeRule({ cycleType: 'day' });
  const g = {
    id,
    type: payload.type === 'main' ? 'main' : 'sub',
    name: payload.name.trim(),
    description: (payload.description || '').trim(),
    tagId: payload.tagId || '',
    startDate: payload.startDate,
    endDate: payload.endDate,
    paused: !!payload.paused,
    status: 'in_progress',
    completedAt: null,
    finalizedRate: null,
    createdAt: isEdit ? payload.createdAt || Date.now() : Date.now(),
    updatedAt: Date.now(),
    subLinks: payload.subLinks || [],
    checkInRule: normalizedRule,
    makeupCountTotal: payload.makeupCountTotal || 0,
    mainBroken: false,
  };
  return g;
}

/**
 * 规则标准化：探索版只支持 day / week
 * - day: dayTimeWindows: [{from,to}]；timesPerCycle = len(dayTimeWindows)
 * - week: weekDays: [0..6]；timesPerCycle = len(weekDays)
 */
function normalizeRule(rule) {
  const ct = rule.cycleType === 'week' ? 'week' : 'day';
  if (ct === 'day') {
    const wins = Array.isArray(rule.dayTimeWindows) ? rule.dayTimeWindows.filter(Boolean) : [];
    const normalized = wins
      .map((w) => ({
        from: (w && w.from) || '00:00',
        to: (w && w.to) || '23:59',
      }))
      .filter((w) => w.from && w.to);
    const finalWins = normalized.length ? normalized : [{ from: '00:00', to: '23:59' }];
    return {
      cycleType: 'day',
      timesPerCycle: finalWins.length,
      dayTimeWindows: finalWins,
      dayValidFrom: finalWins[0].from,
      dayValidTo: finalWins[finalWins.length - 1].to,
      weekDays: [0, 1, 2, 3, 4, 5, 6],
    };
  }
  const wd = Array.isArray(rule.weekDays) && rule.weekDays.length
    ? Array.from(new Set(rule.weekDays.map((x) => Number(x)))).sort((a, b) => a - b)
    : [1, 2, 3, 4, 5];
  return {
    cycleType: 'week',
    timesPerCycle: wd.length,
    weekDays: wd,
    dayValidFrom: '00:00',
    dayValidTo: '23:59',
  };
}

/**
 * @param {{subGoalId:string,weight:number}[]} links
 */
function assertWeights(links) {
  const sum = links.reduce((a, b) => a + (Number(b.weight) || 0), 0);
  if (Math.round(sum) !== 100) throw new Error('子目标权重之和需为 100%');
}

/**
 * @param {object} main
 * @param {object[]} allGoals
 */
function assertMainCoverDates(main, allGoals) {
  (main.subLinks || []).forEach((l) => {
    const sub =
      allGoals.find((x) => x.id === l.subGoalId) || findGoal({ goals: allGoals }, l.subGoalId);
    if (!sub) return;
    if (dateUtil.diffDays(sub.startDate, main.startDate) < 0) {
      throw new Error('子目标开始时间不能早于主目标');
    }
    if (dateUtil.diffDays(main.endDate, sub.endDate) < 0) {
      throw new Error('子目标结束时间不能晚于主目标');
    }
  });
}

function assertRuleInRange(goal, rule) {
  /* 探索版：规则时间窗仅约束当日，不跨目标日期再校验 */
  void goal;
  void rule;
}

async function updateGoal(id, payload) {
  validateGoalPayload(payload);
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g) throw new Error('目标不存在');
    if (g.status === 'deleted') throw new Error('已删除目标不可编辑');
    const locked = g.status === 'completed' || g.status === 'archived';
    if (locked) {
      g.name = payload.name.trim();
      g.description = (payload.description || '').trim();
      g.tagId = payload.tagId || '';
      g.updatedAt = Date.now();
      return;
    }
    if (g.status === 'paused' && payload.unlockPaused) {
      g.paused = false;
    }
    const normalizedRule =
      g.type === 'main'
        ? null
        : payload.checkInRule
          ? normalizeRule(payload.checkInRule)
          : g.checkInRule;
    Object.assign(g, {
      name: payload.name.trim(),
      description: (payload.description || '').trim(),
      tagId: payload.tagId || '',
      startDate: payload.startDate,
      endDate: payload.endDate,
      subLinks: payload.subLinks != null ? payload.subLinks : g.subLinks,
      checkInRule: normalizedRule,
      updatedAt: Date.now(),
    });
    if (g.type === 'main') {
      if (g.subLinks && g.subLinks.length) {
        assertWeights(g.subLinks);
        assertMainCoverDates(g, s.goals || []);
      }
    }
    if (g.type === 'sub' && g.checkInRule) assertRuleInRange(g, g.checkInRule);
  });
}

async function pauseGoal(id) {
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g) throw new Error('目标不存在');
    if (g.status !== 'in_progress' && g.status !== 'not_started')
      throw new Error('当前状态不可暂停');
    g.paused = true;
    g.status = 'paused';
  });
}

async function resumeGoal(id) {
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g) throw new Error('目标不存在');
    g.paused = false;
  });
}

async function archiveGoal(id) {
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g) throw new Error('目标不存在');
    if (g.status !== 'completed' && g.status !== 'incomplete')
      throw new Error('仅已完成或未完成目标可归档');
    g.status = 'archived';
    g.archivedAt = Date.now();
  });
}

async function deleteGoal(id) {
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g) throw new Error('目标不存在');
    g.status = 'deleted';
    g.deletedAt = Date.now();
  });
}

async function restoreGoal(id) {
  await sync((s) => {
    const g = findGoal(s, id);
    if (!g || g.status !== 'deleted') throw new Error('不可恢复');
    g.deletedAt = null;
    g.paused = false;
    g.status = 'in_progress';
  });
}

async function purgeGoal(id) {
  await sync((s) => {
    s.goals = (s.goals || []).filter((g) => g.id !== id);
    s.checkIns = (s.checkIns || []).filter((c) => c.goalId !== id);
  });
}

async function checkIn(goalId) {
  await sync((s) => {
    const g = findGoal(s, goalId);
    if (!g || g.type !== 'sub') throw new Error('仅子目标可打卡');
    resolveState(s);
    const byG = groupCheckInsByGoal(s.checkIns || []);
    const rule = g.checkInRule || { cycleType: 'day', timesPerCycle: 1 };
    const res = engine.canCheckInSubNow(g, rule, byG[g.id] || []);
    if (!res.ok) throw new Error(res.reason || '暂不可打卡');
    const ck = engine.cycleKeyForTimestamp(rule, Date.now());
    s.checkIns = s.checkIns || [];
    s.checkIns.push({
      id: genId(),
      goalId,
      ts: Date.now(),
      cycleKey: ck,
      type: 'normal',
    });
  });
}

/**
 * @param {string} goalId
 * @param {string} cycleKey
 * @param {string} note
 */
async function makeupCheckIn(goalId, cycleKey, note) {
  await sync((s) => {
    const g = findGoal(s, goalId);
    if (!g || g.type !== 'sub') throw new Error('仅子目标可补卡');
    if (g.status === 'incomplete' || g.status === 'completed' || g.status === 'archived') {
      throw new Error('当前状态不可补卡');
    }
    const rule = g.checkInRule || { cycleType: 'day', timesPerCycle: 1 };
    const win = MAKEUP_WINDOW[rule.cycleType || 'day'] || 7;
    const keys = engine.listCycleKeys(rule, g.startDate, g.endDate);
    const idx = keys.indexOf(cycleKey);
    const curKey = engine.cycleKeyForTimestamp(rule, Date.now());
    const curIdx = keys.indexOf(curKey);
    if (idx < 0 || curIdx - idx > win) throw new Error('超出补卡期限');
    const makeupTotal = (s.checkIns || []).filter(
      (c) => c.goalId === goalId && c.type === 'makeup',
    ).length;
    if (makeupTotal >= MAX_MAKEUP_PER_GOAL) throw new Error('已达补卡上限');
    s.checkIns = s.checkIns || [];
    s.checkIns.push({
      id: genId(),
      goalId,
      ts: Date.now(),
      cycleKey,
      type: 'makeup',
      note: (note || '').trim(),
    });
    g.makeupCountTotal = (g.makeupCountTotal || 0) + 1;
  });
}

async function listCheckIns(goalId) {
  const s = store.readState();
  return clone(
    (s.checkIns || []).filter((c) => c.goalId === goalId).sort((a, b) => b.ts - a.ts),
  );
}

async function submitPeriodFeedback(goalId, cycleKey, presetReason, text) {
  await sync((s) => {
    s.feedbacks = s.feedbacks || [];
    s.feedbacks.push({
      id: genId(),
      kind: 'period',
      goalId,
      cycleKey,
      presetReason: presetReason || '',
      text: (text || '').trim(),
      createdAt: Date.now(),
    });
  });
}

async function submitGoalFinalFeedback(goalId, presetReason, text, intent) {
  await sync((s) => {
    s.feedbacks = s.feedbacks || [];
    s.feedbacks.push({
      id: genId(),
      kind: 'goal_final',
      goalId,
      presetReason,
      text: (text || '').trim(),
      intent: intent || '',
      createdAt: Date.now(),
    });
  });
}

async function listFeedbacks(goalId) {
  const s = store.readState();
  return clone((s.feedbacks || []).filter((f) => f.goalId === goalId));
}

async function getDashboard() {
  const s = store.readState();
  resolveState(s);
  store.writeState(s);
  const goals = s.goals || [];
  const active = goals.filter((g) => g.status !== 'deleted' && g.status !== 'archived');
  const done = goals.filter(
    (g) => g.status === 'completed' || g.progress >= 100,
  ).length;
  const totalCheck = (s.checkIns || []).length;
  const byG = groupCheckInsByGoal(s.checkIns || []);
  let maxStreak = 0;
  Object.keys(byG).forEach((gid) => {
    maxStreak = Math.max(maxStreak, engine.streakNormalDays(byG[gid]));
  });
  // 只列出有目标的标签；主子目标均参与；显示个数 + 完成率（以 finalizedRate 兜底到 progress）
  const tagStats = {};
  listAllTagsMerged(s).forEach((t) => {
    const gs = goals.filter(
      (g) => g.tagId === t.id && g.status !== 'deleted' && g.status !== 'archived',
    );
    if (!gs.length) return;
    const avg =
      gs.reduce(
        (a, gg) => a + (gg.finalizedRate != null ? gg.finalizedRate : gg.progress || 0),
        0,
      ) / gs.length;
    tagStats[t.id] = {
      id: t.id,
      name: t.name,
      goals: gs.length,
      avgRate: Math.round(avg * 10) / 10,
    };
  });
  return {
    totalGoals: active.length,
    completedGoals: done,
    totalCheckIns: totalCheck,
    maxStreak,
    tagStats,
  };
}

async function getAchievements() {
  const s = store.readState();
  resolveState(s);
  store.writeState(s);
  const unlocked = new Set(s.achievementsUnlocked || []);
  return ACHIEVEMENT_DEFS.map((a) => ({ ...a, unlocked: unlocked.has(a.id) }));
}

async function getSettings() {
  const s = store.readState();
  return clone(s.settings || {});
}

async function updateSettings(partial) {
  await sync((s) => {
    s.settings = { ...(s.settings || {}), ...partial };
  });
}

async function clearAllData() {
  await sync((s) => {
    const empty = store.defaultState();
    Object.keys(empty).forEach((k) => {
      s[k] = empty[k];
    });
  });
}

/**
 * @param {string} goalId
 * @param {string} note
 */
async function saveReviewNote(goalId, note) {
  await sync((s) => {
    const g = findGoal(s, goalId);
    if (!g) throw new Error('目标不存在');
    g.reviewNote = (note || '').trim();
    g.updatedAt = Date.now();
  });
}

/**
 * 打卡日历打点：返回某年-月内存在打卡的自然日 YYYY-MM-DD 列表
 * @param {string} yearMonth 形如 2026-04
 */
async function listCalendarDots(yearMonth) {
  const s = store.readState();
  const ym = (yearMonth || '').slice(0, 7);
  const set = {};
  (s.checkIns || []).forEach((c) => {
    const key = dateUtil.toYMD(new Date(c.ts));
    if (key.slice(0, 7) === ym) set[key] = true;
  });
  return Object.keys(set).sort();
}

/**
 * 月内与子目标规则相交的自然日列表（保留兼容）
 */
async function listCalendarGoalPlanDays(yearMonth) {
  const stats = await listCalendarMonthStats(yearMonth);
  return Object.keys(stats)
    .filter((k) => stats[k].planned > 0)
    .sort();
}

/**
 * 月内按天统计：计划次数与打卡次数
 * @param {string} yearMonth 形如 2026-04
 * @returns {Promise<Record<string, {planned:number,checked:number}>>}
 */
async function listCalendarMonthStats(yearMonth) {
  const s = store.readState();
  resolveState(s);
  store.writeState(s);
  const ym = (yearMonth || '').slice(0, 7);
  const parts = ym.split('-');
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const out = {};
  if (!Number.isFinite(y) || !Number.isFinite(mo)) return out;
  const pad = (n) => `${n}`.padStart(2, '0');
  const lastDay = new Date(y, mo, 0).getDate();
  const goals = (s.goals || []).filter(
    (g) =>
      g.type === 'sub' &&
      !g.purged &&
      g.status !== 'deleted' &&
      g.status !== 'archived',
  );
  for (let dom = 1; dom <= lastDay; dom += 1) {
    const ymd = `${y}-${pad(mo)}-${pad(dom)}`;
    let planned = 0;
    goals.forEach((g) => {
      if (dateUtil.diffDays(ymd, g.startDate) < 0) return;
      if (dateUtil.diffDays(g.endDate, ymd) < 0) return;
      const rule = g.checkInRule || {};
      planned += engine.plannedCountOnDay(rule, ymd);
    });
    out[ymd] = { planned, checked: 0 };
  }
  (s.checkIns || []).forEach((c) => {
    const key = dateUtil.toYMD(new Date(c.ts));
    if (key.slice(0, 7) !== ym) return;
    if (!out[key]) out[key] = { planned: 0, checked: 0 };
    out[key].checked += 1;
  });
  return out;
}

module.exports = {
  bootstrap,
  onAppShow,
  getOnboardingState,
  completeWelcome,
  saveOnboardingTags,
  skipOnboardingTags,
  updateGuideStage,
  completeFirstGoalFlow,
  listTags,
  createCustomTag,
  updateTag,
  deleteTag,
  restorePresetTag,
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  pauseGoal,
  resumeGoal,
  archiveGoal,
  deleteGoal,
  restoreGoal,
  purgeGoal,
  checkIn,
  makeupCheckIn,
  listCheckIns,
  submitPeriodFeedback,
  submitGoalFinalFeedback,
  listFeedbacks,
  getDashboard,
  getAchievements,
  getSettings,
  updateSettings,
  clearAllData,
  saveReviewNote,
  listCalendarDots,
  listCalendarGoalPlanDays,
  listCalendarMonthStats,
  /** 供页面直接引用常量 */
  PRESET_TAGS,
  GOAL_TEMPLATES_BY_TAG,
};
