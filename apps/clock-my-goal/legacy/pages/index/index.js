/**
 * 启动分流：未完成引导则进入欢迎 / 引导流，否则进入首页（tabBar）
 */
const api = require('../../api/index');

Page({
  async onLoad() {
    try {
      const ob = await api.getOnboardingState();
      if (!ob.welcomeDone) {
        wx.redirectTo({ url: '/pages/onboarding/welcome/welcome' });
        return;
      }
      if (!ob.tagsSelected) {
        wx.redirectTo({ url: '/pages/onboarding/tags/tags' });
        return;
      }
      if (!ob.guideDone && !ob.firstGoalCreated) {
        wx.redirectTo({ url: '/pages/onboarding/guide/guide' });
        return;
      }
      wx.reLaunch({ url: '/pages/goals/list/list' });
    } catch (e) {
      wx.reLaunch({ url: '/pages/goals/list/list' });
    }
  },
});
