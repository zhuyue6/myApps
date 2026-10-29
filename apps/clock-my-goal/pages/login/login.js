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
    focusField: '',
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
    const patch = {
      [`account.${field}`]: event.detail.value,
      [`errors.${field}`]: '',
    };
    if (!this._pendingFocus || this._pendingFocus === field) {
      patch.focusField = field;
    }
    this.setData(patch);
  },

  // 普通输入框和密码框是两套原生组件。从已聚焦的输入框点到另一个时，
  // 第一次点击只会收起键盘，目标框拿不到焦点。等键盘收起后再把 focus 拉起来。
  onFieldTap(event) {
    const field = event.currentTarget.dataset.field;
    if (!field || field === this.data.focusField) return;
    const switching = this.data.focusField
      || (this._blurAt && Date.now() - this._blurAt < 400);
    if (!switching) {
      this.setData({ focusField: field });
      return;
    }
    this._pendingFocus = field;
    this.queueFocus(field);
  },

  onFieldFocus(event) {
    const field = event.currentTarget.dataset.field;
    if (!field || this.data.focusField === field) return;
    this.setData({ focusField: field });
  },

  onFieldBlur(event) {
    const field = event.currentTarget.dataset.field;
    if (!field) return;
    this._blurAt = Date.now();
    if (field === this._pendingFocus) return;
    if (this.data.focusField === field) {
      this.setData({ focusField: '' });
    }
  },

  queueFocus(field) {
    if (this._focusTimer) clearTimeout(this._focusTimer);
    if (this._settleTimer) clearTimeout(this._settleTimer);
    this._focusTimer = setTimeout(() => {
      this._focusTimer = null;
      if (this._pendingFocus !== field) return;
      this.setData({ focusField: field });
      this._settleTimer = setTimeout(() => {
        this._settleTimer = null;
        if (this._pendingFocus === field) this._pendingFocus = '';
      }, 350);
    }, 300);
  },

  clearFocusTimers() {
    if (this._focusTimer) clearTimeout(this._focusTimer);
    if (this._settleTimer) clearTimeout(this._settleTimer);
    this._focusTimer = null;
    this._settleTimer = null;
    this._pendingFocus = '';
  },

  onSex(event) {
    this.setData({ 'account.sex': Number(event.currentTarget.dataset.value) || 3 });
  },

  onToggleMode() {
    const mode = this.data.mode === 'login' ? 'register' : 'login';
    this.clearFocusTimers();
    this.setData({ mode, errors: {}, account: emptyAccount(), focusField: '' });
  },

  onUnload() {
    this.clearFocusTimers();
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
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }).then(() => {
      this.submitting = false;
    });
  },
});
