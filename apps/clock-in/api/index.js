/**
 * 页面只调用本模块。
 * 0.1 的计划、标签、昵称存在本地，状态在这里计算。
 * 已写好的后端接口在 backend 上，例如 api.backend.getLabelList()。
 */
const store = require('../storage/store');
const planUtil = require('../utils/plan');
const datetime = require('../utils/datetime');
const backend = require('./backend');

function genId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function listPlans() {
  const state = store.read();
  const now = new Date();
  const plans = state.plans
    .map((plan) => planUtil.decorate(plan, state.tags, now))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return Promise.resolve(plans);
}

function getPlan(id) {
  const state = store.read();
  const plan = state.plans.find((item) => item.id === id);
  if (!plan) return Promise.resolve(null);
  return Promise.resolve(planUtil.decorate(plan, state.tags, new Date()));
}

function savePlan(input) {
  const state = store.read();
  const current = input.id ? state.plans.find((item) => item.id === input.id) : null;
  if (input.id && !current) {
    return Promise.reject(new Error('计划不存在'));
  }
  const checkedCount = current ? current.checkedCount : 0;
  const checked = planUtil.validatePlan(input, checkedCount, state.tags);
  if (Object.keys(checked.errors).length) {
    return Promise.resolve({ ok: false, errors: checked.errors });
  }
  const value = checked.value;
  store.update((draft) => {
    if (!current) {
      draft.plans.push({
        id: genId('p'),
        name: value.name,
        deadline: value.deadline,
        cycle: value.cycle,
        targetCount: value.targetCount,
        checkedCount: 0,
        tagId: value.tagId,
        createdAt: datetime.nowString(),
      });
      return;
    }
    const target = draft.plans.find((item) => item.id === input.id);
    if (!target) return;
    target.name = value.name;
    target.deadline = value.deadline;
    target.cycle = value.cycle;
    target.targetCount = value.targetCount;
    target.tagId = value.tagId;
  });
  return Promise.resolve({ ok: true });
}

function removePlan(id) {
  store.update((draft) => {
    draft.plans = draft.plans.filter((item) => item.id !== id);
  });
  return Promise.resolve(true);
}

function checkIn(id) {
  const state = store.read();
  const plan = state.plans.find((item) => item.id === id);
  if (!plan) return Promise.reject(new Error('计划不存在'));
  const status = planUtil.resolveStatus(plan, new Date());
  if (status === 'completed') return Promise.reject(new Error('已完成，不能再打卡'));
  if (status === 'expired') return Promise.reject(new Error('已过期，不能再打卡'));
  let saved = null;
  store.update((draft) => {
    const target = draft.plans.find((item) => item.id === id);
    if (!target) return;
    target.checkedCount = (Number(target.checkedCount) || 0) + 1;
    saved = target;
  });
  if (!saved) return Promise.reject(new Error('计划不存在'));
  const latest = store.read();
  return Promise.resolve(planUtil.decorate(saved, latest.tags, new Date()));
}

function listTags() {
  const state = store.read();
  const tags = state.tags.map((tag) => ({ ...tag }));
  return Promise.resolve(tags);
}

function getTag(id) {
  const state = store.read();
  const tag = state.tags.find((item) => item.id === id);
  return Promise.resolve(tag ? { ...tag } : null);
}

function listTagTypes() {
  const state = store.read();
  const types = [];
  state.tags.forEach((tag) => {
    if (tag.type && types.indexOf(tag.type) < 0) types.push(tag.type);
  });
  return Promise.resolve(types);
}

function saveTag(input) {
  const state = store.read();
  const current = input.id ? state.tags.find((item) => item.id === input.id) : null;
  if (input.id && !current) return Promise.reject(new Error('标签不存在'));
  const checked = planUtil.validateTag(input, state.tags, input.id || '');
  if (Object.keys(checked.errors).length) {
    return Promise.resolve({ ok: false, errors: checked.errors });
  }
  store.update((draft) => {
    if (!current) {
      draft.tags.push({
        id: genId('t'),
        type: checked.value.type,
        name: checked.value.name,
      });
      return;
    }
    const target = draft.tags.find((item) => item.id === input.id);
    if (!target) return;
    target.type = checked.value.type;
    target.name = checked.value.name;
  });
  return Promise.resolve({ ok: true });
}

function removeTag(id) {
  store.update((draft) => {
    draft.tags = draft.tags.filter((item) => item.id !== id);
    draft.plans.forEach((plan) => {
      if (plan.tagId === id) plan.tagId = '';
    });
  });
  return Promise.resolve(true);
}

function getProfile() {
  const state = store.read();
  const counts = planUtil.summarize(state.plans, new Date());
  return Promise.resolve({
    nickname: state.nickname || planUtil.DEFAULT_NICKNAME,
    ongoing: counts.ongoing,
    completed: counts.completed,
    expired: counts.expired,
  });
}

function saveNickname(name) {
  const nickname = (name || '').trim() || planUtil.DEFAULT_NICKNAME;
  store.update((draft) => {
    draft.nickname = nickname;
  });
  return Promise.resolve(nickname);
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
  saveNickname,
  backend,
};
