const api = require('../../api/index');

const NAME_PATTERN = /^[\u4e00-\u9fa50-9a-zA-Z·]+$/;
const PASSWORD_PATTERN = /^[a-zA-Z0-9_+\-]+$/;

function setTab(page, hidden) {
  const bar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (bar) bar.setData({ selected: 2, hidden: !!hidden });
}

function emptyAccount() {
  return {
    userName: '',
    password: '',
    sex: 3,
    age: '',
  };
}

Page({
  data: {
    loggedIn: false,
    nickname: '',
    avatarUrl: '',
    ongoing: 0,
    completed: 0,
    expired: 0,
    mode: 'login',
    account: emptyAccount(),
    errors: {},
    sexes: [
      { value: 1, label: '男' },
      { value: 2, label: '女' },
      { value: 3, label: '保密' },
    ],
  },

  onShow() {
    setTab(this, false);
    this.load();
  },

  load() {
    return api.getProfile().then((profile) => {
      this.setData({
        loggedIn: profile.loggedIn,
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
        ongoing: 0,
        completed: 0,
        expired: 0,
      });
      if (!needLogin) wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onAccount(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this.setData({
      [`account.${field}`]: event.detail.value,
      [`errors.${field}`]: '',
    });
  },

  onSex(event) {
    this.setData({ 'account.sex': Number(event.currentTarget.dataset.value) || 3 });
  },

  onToggleMode() {
    const mode = this.data.mode === 'login' ? 'register' : 'login';
    this.setData({ mode, errors: {}, account: emptyAccount() });
  },

  validateAccount() {
    const account = this.data.account;
    const errors = {};
    const userName = (account.userName || '').trim();
    const password = account.password || '';
    console.log(userName, password)
    if (!userName) errors.userName = '请填写用户名';
    else if (userName.length > 10 || !NAME_PATTERN.test(userName)) {
      errors.userName = '1到10个字，只能是中文、字母和间隔号·';
    }
    if (!password) errors.password = '请填写密码';
    else if (password.length < 6 || password.length > 20 || !PASSWORD_PATTERN.test(password)) {
      errors.password = '6到20位，只能是数字、字母和 _-+';
    }
    let age = 0;
    if (this.data.mode === 'register' && String(account.age || '').trim()) {
      if (!/^\d+$/.test(String(account.age).trim())) errors.age = '年龄请填 0 到 150 的整数';
      else {
        age = Number(account.age);
        if (age > 150) errors.age = '年龄不能大于 150';
      }
    }
    return { errors, userName, password, age, sex: account.sex || 3 };
  },

  onSubmit() {
    if (this.submitting) return;
    const checked = this.validateAccount();
    if (Object.keys(checked.errors).length) {
      this.setData({ errors: checked.errors });
      return;
    }
    this.submitting = true;
    const task = this.data.mode === 'register'
      ? api.backend.register({
        userName: checked.userName,
        password: checked.password,
        sex: checked.sex,
        age: checked.age,
      }).then(() => api.backend.login(checked.userName, checked.password))
      : api.backend.login(checked.userName, checked.password);
    task.then(() => {
      this.setData({ account: emptyAccount(), errors: {}, mode: 'login' });
      wx.showToast({ title: '已登录', icon: 'success' });
      return this.load();
    }).catch((error) => {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }).then(() => {
      this.submitting = false;
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
        api.backend.logout().catch(() => {}).then(() => this.load());
      },
    });
  },
});
