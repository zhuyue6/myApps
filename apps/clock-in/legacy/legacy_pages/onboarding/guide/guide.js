/**
 * 引导中枢：标签 → 主目标 → 子目标 → 关联 四步，按当前状态进入相应子流程
 */
const api = require('../../../api/index');

Page({
  data: {
    steps: [
      { key: 'tags', title: '创建标签', desc: '将目标分类，便于统计', done: true },
      { key: 'main', title: '创建主目标', desc: '设定希望达成的长期目标', done: false },
      { key: 'sub', title: '创建子目标', desc: '拆解出可打卡执行的小任务', done: false },
      { key: 'link', title: '关联子目标到主目标', desc: '让主目标随子目标进度自动汇总', done: false },
    ],
    canFinish: false,
  },

  async onShow() {
    await this.refresh();
  },

  async refresh() {
    try {
      const goals = await api.listGoals({});
      const hasMain = goals.some((g) => g.type === 'main');
      const hasSub = goals.some((g) => g.type === 'sub');
      const hasLink = goals.some(
        (g) => g.type === 'main' && Array.isArray(g.subLinks) && g.subLinks.length,
      );
      const steps = this.data.steps.map((s) => {
        if (s.key === 'main') return { ...s, done: hasMain };
        if (s.key === 'sub') return { ...s, done: hasSub };
        if (s.key === 'link') return { ...s, done: hasLink };
        return s;
      });
      if (hasMain) await api.updateGuideStage('main');
      if (hasSub) await api.updateGuideStage('sub');
      if (hasLink) await api.updateGuideStage('link');
      this.setData({ steps, canFinish: hasMain });
    } catch (e) {
      /* ignore */
    }
  },

  goStep(e) {
    const key = e.currentTarget.dataset.key;
    if (key === 'tags') {
      wx.navigateTo({ url: '/pages/onboarding/tags/tags?fromGuide=1' });
      return;
    }
    if (key === 'main') {
      wx.navigateTo({ url: '/pages/goals/edit/edit?type=main' });
      return;
    }
    if (key === 'sub') {
      wx.navigateTo({ url: '/pages/goals/edit/edit?type=sub' });
      return;
    }
    if (key === 'link') {
      this.goLink();
    }
  },

  async goLink() {
    try {
      const goals = await api.listGoals({});
      const main = goals.find((g) => g.type === 'main');
      if (!main) {
        wx.showToast({ title: '请先创建主目标', icon: 'none' });
        return;
      }
      wx.navigateTo({ url: `/pages/goals/detail/detail?id=${main.id}` });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async onFinish() {
    try {
      await api.completeFirstGoalFlow();
      wx.reLaunch({ url: '/pages/goals/list/list' });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async onSkip() {
    try {
      await api.completeFirstGoalFlow();
      wx.reLaunch({ url: '/pages/goals/list/list' });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },
});
