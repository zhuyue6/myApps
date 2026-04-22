/**
 * 订阅提醒（探索版说明）与清除本地数据
 */
const api = require('../../api/index');

Page({
  data: {
    reminderAuthorized: false,
  },

  onShow() {
    api.getSettings().then((s) => {
      this.setData({ reminderAuthorized: !!s.reminderAuthorized });
    });
  },

  onSubscribe() {
    wx.showModal({
      title: '打卡提醒',
      content:
        '正式版需在小程序后台配置订阅消息模板后，在此调用 wx.requestSubscribeMessage。探索版仅记录本地开关。',
      success: (r) => {
        if (!r.confirm) return;
        api.updateSettings({ reminderAuthorized: true }).then(() => {
          this.setData({ reminderAuthorized: true });
          wx.showToast({ title: '已记录偏好', icon: 'none' });
        });
      },
    });
  },

  onClear() {
    wx.showModal({
      title: '清除全部数据',
      content: '不可恢复，确定清除本机所有目标与打卡记录？',
      success: (r) => {
        if (!r.confirm) return;
        api.clearAllData().then(() => {
          wx.showToast({ title: '已清除', icon: 'none' });
          wx.reLaunch({ url: '/pages/index/index' });
        });
      },
    });
  },
});
