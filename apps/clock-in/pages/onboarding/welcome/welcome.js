/**
 * 欢迎页：单按钮进入下一步
 */
const api = require('../../../api/index');

Page({
  onNext() {
    api
      .completeWelcome()
      .then(() => {
        wx.redirectTo({ url: '/pages/onboarding/tags/tags' });
      })
      .catch(() => {
        wx.showToast({ title: '请重试', icon: 'none' });
      });
  },
});
