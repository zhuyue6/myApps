const api = require('../../api/index');
const auth = require('../../utils/auth');

Page({
  data: {
    tags: [],
    loaded: false,
    needLogin: false,
  },

  onShow() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar) bar.setData({ selected: 1, hidden: false });
    if (!auth.ensureLogin()) {
      this.setData({ loaded: true, needLogin: true, tags: [] });
      return;
    }
    this.load();
  },

  load() {
    return api.listTags().then((tags) => {
      this.setData({ tags, loaded: true, needLogin: false });
    }).catch((error) => {
      const needLogin = /登录/.test(error.message || '');
      this.setData({
        loaded: true,
        needLogin,
        tags: needLogin ? [] : this.data.tags,
      });
      if (needLogin) {
        auth.goLogin({ redirect: '/pages/tags/list' });
        return;
      }
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onCreate() {
    if (!auth.ensureLogin()) return;
    wx.navigateTo({ url: '/pages/tags/edit' });
  },

  onOpen(event) {
    if (!auth.ensureLogin()) return;
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/tags/edit?id=${id}` });
  },

  onAskDelete(event) {
    const id = event.currentTarget.dataset.id;
    const type = event.currentTarget.dataset.type || '';
    const name = event.currentTarget.dataset.name || '';
    wx.showModal({
      title: '删除这个标签？',
      content: `「${type} / ${name}」删除后，正在使用它的计划会变成未关联标签。计划本身会保留。`,
      confirmText: '删除',
      confirmColor: '#d9655b',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        api.removeTag(id).then(() => this.load()).catch((error) => {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        });
      },
    });
  },

  onGoLogin() {
    auth.goLogin({ redirect: '/pages/tags/list' });
  },
});
