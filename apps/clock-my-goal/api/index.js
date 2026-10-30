/**
 * 页面只调用本模块。
 * 计划、标签走后端 REST。状态使用接口返回的 status（1 进行中 / 2 已完成 / 3 已过期）。
 * 目标次数由服务端按周期与截止时间计算，创建/更新不再提交。
 */
const planUtil = require('../utils/plan');
const datetime = require('../utils/datetime');
const backend = require('./backend');

const CYCLE_TO_API = { day: 1, week: 2, month: 3 };
const CYCLE_FROM_API = { 1: 'day', 2: 'week', 3: 'month' };
const STATUS_FROM_API = { 1: 'ongoing', 2: 'completed', 3: 'expired' };

function asId(id) {
  if (id == null || id === '') return '';
  return String(id);
}

function toNumberId(id) {
  const value = Number(id);
  return Number.isFinite(value) ? value : 0;
}

function mapTag(label) {
  return {
    id: asId(label.id),
    type: label.labelType || '',
    name: label.labelName || '',
  };
}

function mapGoal(goal, tags) {
  const named = !!(goal.labelName || goal.labelType);
  const tag = named
    ? (tags || []).find((item) => item.type === (goal.labelType || '') && item.name === (goal.labelName || ''))
    : null;
  return {
    id: asId(goal.id),
    name: goal.goalName || '',
    remark: goal.remark || '',
    deadline: goal.expirationTime || '',
    cycle: CYCLE_FROM_API[goal.clockInCycle] || '',
    targetCount: goal.targetClockInCount || 0,
    checkedCount: goal.clockInCount || 0,
    tagId: tag ? tag.id : '',
    createdAt: goal.createTime || '',
    status: STATUS_FROM_API[Number(goal.status)] || '',
  };
}

function loadTags() {
  return backend.getLabelList().then((labels) => (labels || []).map(mapTag));
}

function loadPlans() {
  return Promise.all([backend.getGoals(), loadTags()]).then(([goals, tags]) => {
    return (goals || [])
      .map((goal) => planUtil.decorate(mapGoal(goal, tags), tags))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  });
}

function listPlans() {
  return loadPlans();
}

function getPlan(id) {
  const key = asId(id);
  if (!key) return Promise.resolve(null);
  return Promise.all([backend.getGoal(toNumberId(key)), loadTags()]).then(([goal, tags]) => {
    if (!goal) return null;
    return planUtil.decorate(mapGoal(goal, tags), tags);
  });
}

function savePlan(input) {
  const key = asId(input.id);
  const currentGoal = key ? backend.getGoal(toNumberId(key)) : Promise.resolve(null);
  return Promise.all([loadTags(), currentGoal]).then(([tags, current]) => {
    if (key && !current) return Promise.reject(new Error('计划不存在'));
    if (current && STATUS_FROM_API[Number(current.status)] === 'completed') {
      return Promise.reject(new Error('已完成的目标不能修改'));
    }
    const checked = planUtil.validatePlan(input, tags);
    if (Object.keys(checked.errors).length) {
      return { ok: false, errors: checked.errors };
    }
    const value = checked.value;
    const payload = {
      goalName: value.name,
      remark: value.remark,
      expirationTime: datetime.endOfDay(value.deadline),
      labelId: value.tagId ? toNumberId(value.tagId) : null,
      clockInCycle: CYCLE_TO_API[value.cycle],
    };
    const saved = current
      ? backend.updateGoal(Object.assign({ id: toNumberId(current.id) }, payload))
      : backend.createGoal(payload);
    return saved.then(() => ({ ok: true }));
  });
}

function removePlan(id) {
  return backend.removeGoal(toNumberId(id)).then(() => true);
}

function checkIn(id) {
  return getPlan(id).then((plan) => {
    if (!plan) return Promise.reject(new Error('计划不存在'));
    if (plan.status === 'completed') return Promise.reject(new Error('已完成，不能再打卡'));
    if (plan.status === 'expired') return Promise.reject(new Error('已过期，不能再打卡'));
    return backend.clockIn(toNumberId(plan.id)).then(() => getPlan(id));
  });
}

function listTags() {
  return loadTags();
}

function getTag(id) {
  return backend.getLabelById(toNumberId(id)).then((label) => (label ? mapTag(label) : null));
}

function listTagTypes() {
  return loadTags().then((tags) => {
    const types = [];
    tags.forEach((tag) => {
      if (tag.type && types.indexOf(tag.type) < 0) types.push(tag.type);
    });
    return types;
  });
}

function saveTag(input) {
  const key = asId(input.id);
  return loadTags().then((tags) => {
    if (key && !tags.some((item) => item.id === key)) {
      return Promise.reject(new Error('标签不存在'));
    }
    const checked = planUtil.validateTag(input, tags, key);
    if (Object.keys(checked.errors).length) {
      return { ok: false, errors: checked.errors };
    }
    const saved = key
      ? backend.updateLabel(toNumberId(key), checked.value.name, checked.value.type)
      : backend.createLabel(checked.value.name, checked.value.type);
    return saved.then(() => ({ ok: true }));
  });
}

function removeTag(id) {
  return backend.removeLabel(toNumberId(id)).then(() => true);
}

function getProfile() {
  const session = backend.getSession();
  const cached = session.user || {};
  if (!session.token || !cached.id) {
    return Promise.resolve({
      loggedIn: false,
      nickname: '',
      avatarUrl: '',
      ongoing: 0,
      completed: 0,
      expired: 0,
    });
  }
  return Promise.all([backend.getUser(cached.id), backend.getGoals()]).then(([user, goals]) => {
    const profileUser = user || cached;
    const avatarPath = profileUser.avatarUrl || '';
    backend.patchSessionUser({
      avatarUrl: avatarPath,
      userName: profileUser.userName || cached.userName || '',
    });
    const plans = (goals || []).map((goal) => mapGoal(goal, []));
    const counts = planUtil.summarize(plans);
    return {
      loggedIn: true,
      nickname: profileUser.userName || cached.userName || '已登录',
      avatarUrl: backend.resolveAvatarUrl(avatarPath),
      ongoing: counts.ongoing,
      completed: counts.completed,
      expired: counts.expired,
    };
  });
}

module.exports = {
  listPlans,
  getPlan,
  savePlan,
  removePlan,
  checkIn,
  listTags,
  getTag,
  listTagTypes,
  saveTag,
  removeTag,
  getProfile,
  backend,
};
