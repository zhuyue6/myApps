/**
 * 设置页：音效/音乐/震动/画质 + 本地反馈草稿
 */
const storage = require('../../utils/storage');
const audio = require('../../utils/audio');

const QUALITY_OPTIONS = [
  { value: 'smooth', label: '流畅' },
  { value: 'hd', label: '高清' },
];

Page({
  data: {
    settings: {
      soundOn: true,
      musicOn: true,
      vibrateOn: true,
      quality: 'smooth',
    },
    qualityLabels: QUALITY_OPTIONS.map((q) => q.label),
    qualityIndex: 0,
    feedbackText: '',
  },

  goChallengeStats() {
    wx.navigateTo({ url: '/pages/challenge/challenge' });
  },

  onShow() {
    const settings = storage.getSettings();
    const qualityIndex = Math.max(
      0,
      QUALITY_OPTIONS.findIndex((q) => q.value === settings.quality),
    );
    this.setData({
      settings,
      qualityIndex: qualityIndex < 0 ? 0 : qualityIndex,
    });
  },

  onSoundChange(e) {
    const soundOn = e.detail.value;
    storage.setSettings({ soundOn });
    this.setData({ 'settings.soundOn': soundOn });
  },

  onMusicChange(e) {
    const musicOn = e.detail.value;
    storage.setSettings({ musicOn });
    this.setData({ 'settings.musicOn': musicOn });
    if (musicOn) {
      audio.playBgm();
    } else {
      audio.stopBgm();
    }
  },

  onVibrateChange(e) {
    const vibrateOn = e.detail.value;
    storage.setSettings({ vibrateOn });
    this.setData({ 'settings.vibrateOn': vibrateOn });
  },

  onQualityChange(e) {
    const idx = Number(e.detail.value);
    const q = QUALITY_OPTIONS[idx];
    if (!q) return;
    storage.setSettings({ quality: q.value });
    this.setData({
      qualityIndex: idx,
      'settings.quality': q.value,
    });
    wx.showToast({ title: '已保存', icon: 'none' });
  },

  onFeedbackInput(e) {
    this.setData({ feedbackText: e.detail.value });
  },

  /**
   * 无后端时：写入本地并提示；接入服务后可改为 wx.request
   */
  submitFeedback() {
    const text = (this.data.feedbackText || '').trim();
    if (!text) {
      wx.showToast({ title: '写点什么再提交吧', icon: 'none' });
      return;
    }
    const list = wx.getStorageSync('nnl_feedback_list') || [];
    list.push({ t: Date.now(), text });
    wx.setStorageSync('nnl_feedback_list', list);
    this.setData({ feedbackText: '' });
    wx.showToast({
      title: '感谢你的建议',
      icon: 'none',
    });
  },
});
