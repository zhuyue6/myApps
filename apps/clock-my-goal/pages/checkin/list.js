const api = require('../../api/index');
const auth = require('../../utils/auth');

Page({
  data: {
    plans: [],
    loaded: false,
    needLogin: false,
    banner: '',
  },

  bannerTimer: null,

  onShow() {
    this.syncTab();
    if (!auth.isLoggedIn()) {
      const quiet = auth.takeQuietHome();
      this.setData({ loaded: true, needLogin: true, plans: [] });
      if (!quiet) auth.goLogin({ redirect: '/pages/checkin/list' });
      return;
    }
    this.load();
  },

  onHide() {
    this.clearBanner();
  },

  onUnload() {
    this.clearBanner();
  },

  syncTab() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar) bar.setData({ selected: 0, hidden: false });
  },

  load() {
    return api.listPlans().then((plans) => {
      this.setData({ plans, loaded: true, needLogin: false });
    }).catch((error) => {
      if (auth.isAccountDisabled(error)) {
        this.setData({ loaded: true, needLogin: true, plans: [] });
        return;
      }
      const needLogin = /登录/.test(error.message || '');
      this.setData({
        loaded: true,
        needLogin,
        plans: needLogin ? [] : this.data.plans,
      });
      if (needLogin) {
        auth.goLogin({ redirect: '/pages/checkin/list' });
        return;
      }
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  clearBanner() {
    if (this.bannerTimer) {
      clearTimeout(this.bannerTimer);
      this.bannerTimer = null;
    }
  },

  showBanner(text) {
    this.clearBanner();
    this.setData({ banner: text });
    this.bannerTimer = setTimeout(() => {
      this.setData({ banner: '' });
      this.bannerTimer = null;
    }, 2500);
  },

  onCreate() {
    if (!auth.ensureLogin()) return;
    wx.navigateTo({ url: '/pages/checkin/edit' });
  },

  onOpen(event) {
    if (!auth.ensureLogin()) return;
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/checkin/edit?id=${id}` });
  },

  onAskDelete(event) {
    const id = event.currentTarget.dataset.id;
    const name = event.currentTarget.dataset.name || '';
    wx.showModal({
      title: '删除这个计划？',
      content: `「${name}」删除后无法恢复。本版没有回收站。`,
      confirmText: '删除',
      confirmColor: '#d9655b',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        api.removePlan(id).then(() => this.load()).catch((error) => {
          if (auth.isAccountDisabled(error)) return;
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        });
      },
    });
  },

  onCheckIn(event) {
    const id = event.currentTarget.dataset.id;
    const plan = this.data.plans.find((item) => item.id === id);
    if (!plan || !plan.canCheckIn || this.checking) return;
    this.checking = true;
    api.checkIn(id).then((updated) => {
      this.showBanner(`打卡成功，${updated.name} ${updated.checkedCount}/${updated.targetCount}`);
      return this.load();
    }).catch((error) => {
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '打卡失败', icon: 'none' });
    }).then(() => {
      this.checking = false;
    });
  },

  onGoLogin() {
    auth.goLogin({ redirect: '/pages/checkin/list' });
  },
});
