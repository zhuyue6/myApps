/**
 * 计划展示：状态使用接口返回值（1 进行中 / 2 已完成 / 3 已过期）。
 * 目标次数由服务端按周期与截止时间计算，客户端只展示。
 */
const datetime = require('./datetime');

const CYCLES = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const CYCLE_TEXT = {
  day: '日',
  week: '周',
  month: '月',
};

const STATUS_TEXT = {
  ongoing: '进行中',
  completed: '已完成',
  expired: '已过期',
};

const STATUS_HELP = {
  ongoing: '进行中：未到截止时间，且还没打满次数',
  completed: '已完成：已打卡次数达到目标次数',
  expired: '已过期：已过截止时间，且还没打满次数',
};

const DEFAULT_NICKNAME = '打卡用户';

function percentOf(plan) {
  const checked = Number(plan.checkedCount) || 0;
  const target = Number(plan.targetCount) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((checked / target) * 100));
}

function decorate(plan, tags) {
  const tag = (tags || []).find((item) => item.id === plan.tagId);
  const status = plan.status;
  return {
    ...plan,
    status,
    statusText: STATUS_TEXT[status] || '',
    statusHelp: STATUS_HELP[status] || '',
    cardClass: status === 'completed' ? 'done' : status === 'expired' ? 'expired' : '',
    pillClass: status === 'completed' ? 'done' : status === 'expired' ? 'expired' : status === 'ongoing' ? 'go' : '',
    cycleText: CYCLE_TEXT[plan.cycle] || '',
    tagText: tag ? `${tag.type} / ${tag.name}` : '',
    percent: percentOf(plan),
    canCheckIn: status === 'ongoing',
    blockReason: status === 'completed' ? '已完成' : status === 'expired' ? '已过期' : '',
  };
}

/**
 * @param {{name?:string,deadline?:string,cycle?:string,tagId?:string}} input
 * @param {{id:string}[]} tags
 */
function validatePlan(input, tags) {
  const errors = {};
  const name = (input.name || '').trim();
  if (!name) errors.name = '请填写名称';
  if (!datetime.parseDateTime(input.deadline)) errors.deadline = '请选择截止时间';
  if (!CYCLE_TEXT[input.cycle]) errors.cycle = '请选择周期';
  const tagId = input.tagId || '';
  if (tagId && !(tags || []).some((item) => item.id === tagId)) {
    errors.tag = '请重新选择标签';
  }
  return {
    errors,
    value: {
      name,
      deadline: input.deadline || '',
      cycle: input.cycle || '',
      tagId,
    },
  };
}

/**
 * 新类型优先于已选类型。同一类型下名称不可重复。
 */
function validateTag(input, tags, selfId) {
  const errors = {};
  const typed = (input.newType || '').trim();
  const selected = (input.type || '').trim();
  const type = typed || selected;
  const name = (input.name || '').trim();
  if (!type) errors.type = '请选择标签类型';
  if (!name) errors.name = '请填写标签名称';
  if (type && name) {
    const duplicated = (tags || []).some(
      (item) => item.id !== selfId && item.type === type && item.name === name,
    );
    if (duplicated) errors.name = '该类型下已有同名标签';
  }
  return { errors, value: { type, name } };
}

function summarize(plans) {
  const counts = { ongoing: 0, completed: 0, expired: 0 };
  (plans || []).forEach((plan) => {
    if (counts[plan.status] != null) counts[plan.status] += 1;
  });
  return counts;
}

module.exports = {
  CYCLES,
  CYCLE_TEXT,
  STATUS_TEXT,
  STATUS_HELP,
  DEFAULT_NICKNAME,
  percentOf,
  decorate,
  validatePlan,
  validateTag,
  summarize,
};
