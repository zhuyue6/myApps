/**
 * 单目标复盘：完成率、反馈记录、复盘笔记、复用配置
 */
const api = require('../../api/index');
const { statusZh } = require('../../utils/formatters');

Page({
  data: {
    id: '',
    goal: null,
    statusZh: '',
    feedbacks: [],
    note: '',
    intentOptions: ['延长目标时间', '调整规则重启目标', '放弃该目标', '归档留存'],
    intentIndex: 0,
    finalReason: '',
    finalDetail: '',
  },

  onLoad(q) {
    this.setData({ id: q.id || '' });
  },

  onShow() {
    if (this.data.id) this.load();
  },

  async load() {
    const goal = await api.getGoal(this.data.id);
    const feedbacks = await api.listFeedbacks(this.data.id);
    this.setData({
      goal,
      statusZh: goal ? statusZh(goal.status) : '',
      feedbacks,
      note: (goal && goal.reviewNote) || '',
    });
  },

  onNote(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ note: v });
  },

  async saveNote() {
    try {
      await api.saveReviewNote(this.data.id, this.data.note);
      wx.showToast({ title: '笔记已保存', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  reuse() {
    wx.navigateTo({ url: `/pages/goals/edit/edit?reuseId=${this.data.id}` });
  },

  onFinalReason(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ finalReason: v });
  },

  onFinalDetail(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ finalDetail: v });
  },

  onIntent(e) {
    this.setData({ intentIndex: Number(e.detail.value) });
  },

  async submitFinalFeedback() {
    if (!this.data.goal || this.data.goal.status !== 'incomplete') return;
    const intent = this.data.intentOptions[this.data.intentIndex];
    if (!this.data.finalReason) {
      wx.showToast({ title: '请选择原因', icon: 'none' });
      return;
    }
    try {
      await api.submitGoalFinalFeedback(this.data.id, this.data.finalReason, this.data.finalDetail, intent);
      wx.showToast({ title: '已记录', icon: 'success' });
      if (intent === '放弃该目标' || intent === '归档留存') {
        await api.archiveGoal(this.data.id);
      }
      this.load();
      if (intent === '延长目标时间') {
        wx.navigateTo({ url: `/pages/goals/edit/edit?id=${this.data.id}` });
      }
      if (intent === '调整规则重启目标') {
        wx.navigateTo({ url: `/pages/goals/edit/edit?reuseId=${this.data.id}` });
      }
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
    }
  },
});
