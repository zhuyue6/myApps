const api = require('../../api/index');

function setTab(page, hidden) {
  const bar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (bar) bar.setData({ selected: 2, hidden: !!hidden });
}

Page({
  data: {
    nickname: '打卡用户',
    ongoing: 0,
    completed: 0,
    expired: 0,
    showNick: false,
    draftNick: '',
  },

  onShow() {
    setTab(this, false);
    api.getProfile().then((profile) => {
      this.setData({
        nickname: profile.nickname,
        ongoing: profile.ongoing,
        completed: profile.completed,
        expired: profile.expired,
      });
    }).catch((error) => {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onOpenNick() {
    setTab(this, true);
    this.setData({ showNick: true, draftNick: this.data.nickname });
  },

  onCloseNick() {
    setTab(this, false);
    this.setData({ showNick: false });
  },

  onNickInput(event) {
    this.setData({ draftNick: event.detail.value });
  },

  onSaveNick() {
    api.saveNickname(this.data.draftNick).then((nickname) => {
      this.setData({ nickname, showNick: false });
      setTab(this, false);
    }).catch((error) => {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    });
  },

  noop() {},
});
