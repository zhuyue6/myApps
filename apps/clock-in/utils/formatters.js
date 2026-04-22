/**
 * 展示用文案映射
 */

const STATUS_ZH = {
  not_started: '未开始',
  in_progress: '进行中',
  completed: '已完成',
  incomplete: '未完成',
  paused: '已暂停',
  archived: '已归档',
  deleted: '已删除',
};

/**
 * @param {string} s
 */
function statusZh(s) {
  return STATUS_ZH[s] || s || '';
}

module.exports = {
  STATUS_ZH,
  statusZh,
};
