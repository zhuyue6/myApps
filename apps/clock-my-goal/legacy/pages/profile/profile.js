/**
 * 我的（tabBar）：成就、入口、数据控制
 */
const api = require('../../api/index');

Page({
  data: {
    achievements: [],
  },

  onShow() {
    this.load();
  },

  async load() {
    const achievements = await api.getAchievements();
    this.setData({ achievements });
  },

  goTags() {
    wx.navigateTo({ url: '/pages/tags/manage/manage' });
  },

  goStats() {
    wx.navigateTo({ url: '/pages/stats/stats' });
  },

  goArchive() {
    wx.navigateTo({ url: '/pages/archive/archive' });
  },

  goTrash() {
    wx.navigateTo({ url: '/pages/trash/trash' });
  },

  goSettings() {
    wx.navigateTo({ url: '/pages/settings/settings' });
  },
});
