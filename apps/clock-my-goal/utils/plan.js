/**
 * 0.1 计划规则：状态由系统计算，周期只展示，次数不按周期清零。
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

function resolveStatus(plan, now) {
  const checked = Number(plan.checkedCount) || 0;
  const target = Number(plan.targetCount) || 0;
  if (target > 0 && checked >= target) return 'completed';
  const deadline = datetime.parseDateTime(plan.deadline);
  if (deadline && now.getTime() > deadline.getTime()) return 'expired';
  return 'ongoing';
}

function percentOf(plan) {
  const checked = Number(plan.checkedCount) || 0;
  const target = Number(plan.targetCount) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((checked / target) * 100));
}

function decorate(plan, tags, now) {
  const tag = (tags || []).find((item) => item.id === plan.tagId);
  const status = resolveStatus(plan, now);
  return {
    ...plan,
    status,
    statusText: STATUS_TEXT[status],
    statusHelp: STATUS_HELP[status],
    cardClass: status === 'completed' ? 'done' : status === 'expired' ? 'expired' : '',
    pillClass: status === 'completed' ? 'done' : status === 'expired' ? 'expired' : 'go',
    cycleText: CYCLE_TEXT[plan.cycle] || '',
    tagText: tag ? `${tag.type} / ${tag.name}` : '',
    percent: percentOf(plan),
    canCheckIn: status === 'ongoing',
    blockReason: status === 'completed' ? '已完成' : status === 'expired' ? '已过期' : '',
  };
}

function parseTargetCount(value) {
  const raw = String(value == null ? '' : value).trim();
  if (!/^\d+$/.test(raw)) return null;
  const count = Number(raw);
  if (!Number.isSafeInteger(count) || count <= 0) return null;
  return count;
}

/**
 * @param {{name?:string,deadline?:string,cycle?:string,targetCount?:string|number,tagId?:string}} input
 * @param {number} checkedCount 编辑时已打卡次数；新增传 0
 * @param {{id:string}[]} tags
 */
function validatePlan(input, checkedCount, tags) {
  const errors = {};
  const name = (input.name || '').trim();
  if (!name) errors.name = '请填写名称';
  if (!datetime.parseDateTime(input.deadline)) errors.deadline = '请选择截止时间';
  if (!CYCLE_TEXT[input.cycle]) errors.cycle = '请选择周期';
  const targetCount = parseTargetCount(input.targetCount);
  if (targetCount == null) {
    errors.targetCount = '请输入大于 0 的整数';
  } else if (targetCount < (Number(checkedCount) || 0)) {
    errors.targetCount = '目标次数不能小于已打卡次数';
  }
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
      targetCount: targetCount || 0,
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

function summarize(plans, now) {
  const counts = { ongoing: 0, completed: 0, expired: 0 };
  (plans || []).forEach((plan) => {
    counts[resolveStatus(plan, now)] += 1;
  });
  return counts;
}

module.exports = {
  CYCLES,
  CYCLE_TEXT,
  STATUS_TEXT,
  STATUS_HELP,
  DEFAULT_NICKNAME,
  resolveStatus,
  percentOf,
  decorate,
  parseTargetCount,
  validatePlan,
  validateTag,
  summarize,
};
