/**
 * 业务常量：预设标签、目标模板、成就阈值、补卡窗口
 */

/** 系统预设标签（不可删改，仅存 id 映射名称） */
const PRESET_TAGS = [
  { id: 'preset_read', name: '阅读' },
  { id: 'preset_study', name: '学习' },
  { id: 'preset_sport', name: '运动' },
  { id: 'preset_write', name: '写作' },
  { id: 'preset_work', name: '工作' },
  { id: 'preset_fat', name: '减脂' },
  { id: 'preset_early', name: '早起' },
  { id: 'preset_exam', name: '备考' },
];

/** 按标签推荐模板（名称 + 默认描述） */
const GOAL_TEMPLATES_BY_TAG = {
  preset_sport: [
    { name: '每周 3 次跑步', description: '每次不少于 20 分钟' },
    { name: '每日跳绳 10 分钟', description: '' },
  ],
  preset_study: [
    { name: '每日背单词 30 个', description: '' },
    { name: '每晚复习 1 小时', description: '' },
  ],
  preset_read: [
    { name: '每日阅读 20 页', description: '' },
  ],
  preset_early: [
    { name: '工作日 7:00 前起床', description: '' },
  ],
  default: [
    { name: '我的第一个小目标', description: '拆解目标，打卡落地' },
  ],
};

const ACHIEVEMENT_DEFS = [
  { id: 'first_done', title: '首次目标达成', desc: '完成任意一个目标', check: (ctx) => ctx.completedGoalsCount >= 1 },
  { id: 'ten_done', title: '十星成就', desc: '累计完成 10 个目标', check: (ctx) => ctx.completedGoalsCount >= 10 },
  { id: 'streak_7', title: '连续 7 天', desc: '任意子目标连续打卡 7 天', check: (ctx) => ctx.maxStreak >= 7 },
  { id: 'streak_30', title: '连续 30 天', desc: '任意子目标连续打卡 30 天', check: (ctx) => ctx.maxStreak >= 30 },
  { id: 'perfect_once', title: '满分一次', desc: '存在完成率 100% 的已结束目标', check: (ctx) => ctx.hasPerfectOnce },
];

/** 补卡：各周期可回溯数量（探索版统一常量） */
const MAKEUP_WINDOW = {
  day: 7,
  week: 4,
  month: 3,
  year: 2,
};

/** 单目标累计补卡上限 */
const MAX_MAKEUP_PER_GOAL = 30;

/** 回收站保留天数 */
const TRASH_RETENTION_DAYS = 30;

/** 结束超过该天数自动归档 */
const AUTO_ARCHIVE_AFTER_END_DAYS = 30;

module.exports = {
  PRESET_TAGS,
  GOAL_TEMPLATES_BY_TAG,
  ACHIEVEMENT_DEFS,
  MAKEUP_WINDOW,
  MAX_MAKEUP_PER_GOAL,
  TRASH_RETENTION_DAYS,
  AUTO_ARCHIVE_AFTER_END_DAYS,
};
