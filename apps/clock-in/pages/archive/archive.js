/**
 * 归档目标列表
 */
const api = require('../../../api/index');
const { statusZh } = require('../../../utils/formatters');

Page({
  data: { goals: [] },

  onShow() {
    this.load();
  },

  async load() {
    const goals = await api.listGoals({ archiveOnly: true });
    this.setData({
      goals: goals.map((g) => ({ ...g, statusZh: statusZh(g.status) })),
    });
  },

  open(e) {
    const id = e.mark && e.mark.aid;
    if (!id) return;
    wx.navigateTo({ url: `/pages/goals/detail/detail?id=${id}` });
  },
});
