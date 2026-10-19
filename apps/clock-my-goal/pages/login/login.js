const api = require('../../api/index');
const auth = require('../../utils/auth');

const NAME_PATTERN = /^[\u4e00-\u9fa50-9a-zA-Z·]+$/;
const PASSWORD_PATTERN = /^[a-zA-Z0-9_+\-]+$/;

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
    mode: 'login',
    account: emptyAccount(),
    errors: {},
    sexes: [
      { value: 1, label: '男' },
      { value: 2, label: '女' },
      { value: 3, label: '保密' },
    ],
  },

  onLoad(query) {
    this.redirect = query.redirect ? decodeURIComponent(query.redirect) : '';
    if (auth.isLoggedIn()) {
      this.leave();
    }
  },

  onShow() {
    if (auth.isLoggedIn()) {
      this.leave();
    }
  },

  leave() {
    if (this.redirect && this.redirect.indexOf('/pages/login/') !== 0) {
      if (
        this.redirect === '/pages/checkin/list'
        || this.redirect === '/pages/tags/list'
        || this.redirect === '/pages/mine/mine'
      ) {
        wx.switchTab({ url: this.redirect });
        return;
      }
      wx.redirectTo({
        url: this.redirect,
        fail: () => auth.afterLogin(),
      });
      return;
    }
    auth.afterLogin();
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
      setTimeout(() => this.leave(), 300);
    }).catch((error) => {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }).then(() => {
      this.submitting = false;
    });
  },
});
