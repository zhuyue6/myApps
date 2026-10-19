/**
 * 登录态与未登录跳转。登录页单独存在，不共用「我的」。
 */
const { getSession } = require('../api/request');

const LOGIN_PATH = '/pages/login/login';

let redirecting = false;

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
  isLoggedIn,
  isLoginPage,
  goLogin,
  ensureLogin,
  afterLogin,
};
