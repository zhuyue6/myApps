const api = require('../../api/index');

Page({
  data: {
    tags: [],
    loaded: false,
  },

  onShow() {
    const bar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (bar) bar.setData({ selected: 1, hidden: false });
    this.load();
  },

  load() {
    return api.listTags().then((tags) => {
      this.setData({ tags, loaded: true });
    }).catch((error) => {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onCreate() {
    wx.navigateTo({ url: '/pages/tags/edit' });
  },

  onOpen(event) {
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
});
