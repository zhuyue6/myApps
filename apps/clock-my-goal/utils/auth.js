/**
 * 登录态与未登录跳转。登录页单独存在，不共用「我的」。
 */
const { getSession } = require('../api/request');

const LOGIN_PATH = '/pages/login/login';
const HOME_PATH = '/pages/checkin/list';
const DISABLED_CODE = 11004;

let redirecting = false;
let disabledPrompting = false;
let quietHome = false;

function isLoggedIn() {
  return !!getSession().token;
}

function isLoginPage() {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  if (!current || !current.route) return false;
  return `/${current.route}` === LOGIN_PATH;
}

function goLogin(options) {
  if (redirecting || isLoginPage()) return;
  const redirect = options && options.redirect ? options.redirect : '';
  const query = redirect ? `?redirect=${encodeURIComponent(redirect)}` : '';
  redirecting = true;
  wx.navigateTo({
    url: `${LOGIN_PATH}${query}`,
    complete() {
      redirecting = false;
    },
    fail() {
      redirecting = false;
      wx.reLaunch({ url: LOGIN_PATH });
    },
  });
}

/** @returns {boolean} true = 已登录；false = 已跳转登录页 */
function ensureLogin() {
  if (isLoggedIn()) return true;
  const pages = getCurrentPages();
  const current = pages[pages.length - 1];
  const redirect = current && current.route ? `/${current.route}` : '';
  goLogin({ redirect });
  return false;
}

function isAccountDisabled(error) {
  return !!(error && Number(error.code) === DISABLED_CODE);
}

function takeQuietHome() {
  if (!quietHome) return false;
  quietHome = false;
  return true;
}

/** 账号已停用：弹框确认后回到打卡首页，不再自动进入登录页。 */
function promptAccountDisabled(message) {
  if (disabledPrompting) return;
  disabledPrompting = true;
  wx.showModal({
    title: '账号已停用',
    content: message || '该账号已被停用，暂时无法使用',
    showCancel: false,
    confirmText: '知道了',
    complete() {
      disabledPrompting = false;
      let onHome = false;
      const pages = getCurrentPages();
      const current = pages[pages.length - 1];
      if (current.route === 'pages/login/login') {
        // 如果当前是登录页面，则不跳转
        return;
      }
      // 其余跳转登录页面
      wx.switchTab({
        url: LOGIN_PATH,
        fail() {
          wx.reLaunch({ url: LOGIN_PATH });
        },
      });
    },
  });
}

function afterLogin() {
  const pages = getCurrentPages();
  if (pages.length > 1) {
    wx.navigateBack({ delta: 1 });
    return;
  }
  wx.switchTab({ url: '/pages/checkin/list' });
}

module.exports = {
  LOGIN_PATH,
  HOME_PATH,
  isLoggedIn,
  isLoginPage,
  goLogin,
  ensureLogin,
  afterLogin,
  isAccountDisabled,
  takeQuietHome,
  promptAccountDisabled,
};
