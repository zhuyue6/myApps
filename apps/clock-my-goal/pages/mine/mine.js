const api = require('../../api/index');
const auth = require('../../utils/auth');

function setTab(page, hidden) {
  const bar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (bar) bar.setData({ selected: 2, hidden: !!hidden });
}

Page({
  data: {
    loggedIn: false,
    nickname: '',
    avatarUrl: '',
    ongoing: 0,
    completed: 0,
    expired: 0,
  },

  onShow() {
    setTab(this, false);
    if (!auth.ensureLogin()) {
      this.setData({
        loggedIn: false,
        nickname: '',
        avatarUrl: '',
        ongoing: 0,
        completed: 0,
        expired: 0,
      });
      return;
    }
    this.load();
  },

  load() {
    return api.getProfile().then((profile) => {
      if (!profile.loggedIn) {
        auth.goLogin({ redirect: '/pages/mine/mine' });
        this.setData({
          loggedIn: false,
          nickname: '',
          avatarUrl: '',
          ongoing: 0,
          completed: 0,
          expired: 0,
        });
        return;
      }
      this.setData({
        loggedIn: true,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl || '',
        ongoing: profile.ongoing,
        completed: profile.completed,
        expired: profile.expired,
      });
    }).catch((error) => {
      const needLogin = /登录/.test(error.message || '');
      this.setData({
        loggedIn: false,
        nickname: '',
        avatarUrl: '',
        ongoing: 0,
        completed: 0,
        expired: 0,
      });
      if (needLogin) {
        auth.goLogin({ redirect: '/pages/mine/mine' });
        return;
      }
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录？',
      content: '退出后需要重新登录才能查看计划和标签。',
      confirmText: '退出',
      confirmColor: '#d9655b',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        api.backend.logout().catch(() => {}).then(() => {
          this.setData({
            loggedIn: false,
            nickname: '',
            avatarUrl: '',
            ongoing: 0,
            completed: 0,
            expired: 0,
          });
          auth.goLogin({ redirect: '/pages/mine/mine' });
        });
      },
    });
  },
});
