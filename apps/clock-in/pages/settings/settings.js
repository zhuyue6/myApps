/**
 * 提醒与隐私
 * 订阅提醒偏好开关 + 隐私说明 + 本地数据控制
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

  onToggleReminder(e) {
    const next = !!e.detail;
    if (next) {
      this.enableReminder();
    } else {
      this.disableReminder();
    }
  },

  onSubscribe() {
    this.enableReminder();
  },

  enableReminder() {
    wx.showModal({
      title: '开启打卡提醒',
      content:
        '正式版会调用微信订阅消息为你下发一次性提醒。探索版仅在本地记录你的偏好。',
      confirmText: '好的',
      cancelText: '再想想',
      success: (r) => {
        if (!r.confirm) return;
        api.updateSettings({ reminderAuthorized: true }).then(() => {
          this.setData({ reminderAuthorized: true });
          wx.showToast({ title: '已开启提醒', icon: 'success' });
        });
      },
    });
  },

  disableReminder() {
    api.updateSettings({ reminderAuthorized: false }).then(() => {
      this.setData({ reminderAuthorized: false });
      wx.showToast({ title: '已关闭提醒', icon: 'none' });
    });
  },

  onViewPolicy() {
    wx.showModal({
      title: '隐私说明',
      content:
        '本小程序所有目标、打卡与偏好仅保存在你的设备本地，不会上传服务器，不会收集任何个人敏感信息。订阅消息仅用于你主动授权的提醒。',
      confirmText: '我知道了',
      showCancel: false,
    });
  },

  onClear() {
    wx.showModal({
      title: '清除全部数据',
      content: '此操作不可恢复，确定清除本机所有目标与打卡记录？',
      confirmColor: '#e57373',
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
