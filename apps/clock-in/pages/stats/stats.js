/**
 * 个人数据看板：顶部关键指标 + 下方按标签的目标分布
 */
const api = require('../../api/index');

Page({
  data: {
    dash: null,
    tagList: [],
    statCells: [],
  },

  onShow() {
    this.load();
  },

  async load() {
    const dash = await api.getDashboard();
    const tagList = Object.keys(dash.tagStats || {})
      .map((k) => dash.tagStats[k])
      .filter((t) => t && t.goals > 0)
      .sort((a, b) => b.goals - a.goals);
    const statCells = [
      { k: 'g', num: dash.totalGoals, lbl: '活跃目标' },
      { k: 'c', num: dash.completedGoals, lbl: '已完成' },
      { k: 'i', num: dash.totalCheckIns, lbl: '累计打卡' },
      { k: 's', num: dash.maxStreak, lbl: '最长连续' },
    ];
    this.setData({ dash, tagList, statCells });
  },
});
