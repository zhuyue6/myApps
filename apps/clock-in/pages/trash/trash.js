/**
 * 回收站
 */
const api = require('../../../api/index');

Page({
  data: { goals: [] },

  onShow() {
    this.load();
  },

  async load() {
    const goals = await api.listGoals({ trashOnly: true });
    this.setData({ goals });
  },

  async onRestore(e) {
    const id = e.mark && e.mark.rid;
    if (!id) return;
    try {
      await api.restoreGoal(id);
      wx.showToast({ title: '已恢复', icon: 'success' });
      this.load();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '失败', icon: 'none' });
    }
  },

  onPurge(e) {
    const id = e.mark && e.mark.pid;
    if (!id) return;
    wx.showModal({
      title: '永久删除',
      content: '不可恢复，确定吗？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.purgeGoal(id);
          wx.showToast({ title: '已清除', icon: 'none' });
          this.load();
        } catch (err) {
          wx.showToast({ title: '失败', icon: 'none' });
        }
      },
    });
  },
});
