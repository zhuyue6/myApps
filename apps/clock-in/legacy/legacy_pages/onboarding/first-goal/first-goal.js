/**
 * 首个子目标极简创建 + 模板推荐
 */
const api = require('../../../api/index');
const { GOAL_TEMPLATES_BY_TAG } = require('../../../utils/constants');
const dateUtil = require('../../../utils/date_util');

Page({
  data: {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    tagId: '',
    templates: [],
  },

  async onLoad() {
    const ob = await api.getOnboardingState();
    const firstTag = (ob.presetTagIds && ob.presetTagIds[0]) || '';
    const list = GOAL_TEMPLATES_BY_TAG[firstTag] || GOAL_TEMPLATES_BY_TAG.default;
    const today = dateUtil.todayYMD();
    const t = new Date();
    t.setDate(t.getDate() + 7);
    const end = dateUtil.toYMD(t);
    this.setData({
      templates: list,
      startDate: today,
      endDate: end,
      tagId: firstTag,
    });
  },

  onName(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ name: v });
  },

  onDesc(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ description: v });
  },

  onStartChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEndChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  applyTpl(e) {
    const raw = e.mark && e.mark.ti;
    const i = raw === undefined || raw === null ? -1 : Number(raw);
    const t = this.data.templates[i];
    if (!t) return;
    this.setData({ name: t.name, description: t.description || '' });
  },

  async onSkip() {
    try {
      await api.completeFirstGoalFlow();
      wx.reLaunch({ url: '/pages/goals/list/list' });
    } catch (err) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  async onSave() {
    const name = (this.data.name || '').trim();
    if (!name) {
      wx.showToast({ title: '请填写目标名称', icon: 'none' });
      return;
    }
    try {
      await api.createGoal({
        type: 'sub',
        name,
        description: this.data.description,
        startDate: this.data.startDate,
        endDate: this.data.endDate,
        tagId: this.data.tagId,
        checkInRule: {
          cycleType: 'day',
          timesPerCycle: 1,
          dayValidFrom: '00:00',
          dayValidTo: '23:59',
        },
      });
      await api.completeFirstGoalFlow();
      wx.reLaunch({ url: '/pages/goals/list/list' });
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '保存失败', icon: 'none' });
    }
  },
});
