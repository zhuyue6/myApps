/**
 * 标签初始化：预设多选 + 自定义，可跳过
 */
const api = require('../../../api/index');
const { PRESET_TAGS } = require('../../../utils/constants');

Page({
  data: {
    presets: [],
    selected: {},
    customInput: '',
  },

  onLoad() {
    this.setData({ presets: PRESET_TAGS });
  },

  toggle(e) {
    const id = e.mark && e.mark.pid;
    if (!id) return;
    const selected = { ...this.data.selected };
    selected[id] = !selected[id];
    this.setData({ selected });
  },

  onCustomInput(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ customInput: v });
  },

  async onSkip() {
    try {
      await api.skipOnboardingTags();
      this.goNextStep();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '失败', icon: 'none' });
    }
  },

  async onNext() {
    const presetIds = Object.keys(this.data.selected).filter((k) => this.data.selected[k]);
    const customs = [];
    const raw = (this.data.customInput || '').trim();
    if (raw) customs.push(raw);
    try {
      await api.saveOnboardingTags(presetIds, customs);
      this.goNextStep();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '失败', icon: 'none' });
    }
  },

  goNextStep() {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
      return;
    }
    wx.redirectTo({ url: '/pages/onboarding/guide/guide' });
  },
});
