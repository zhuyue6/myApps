/**
 * 调用后端的唯一请求入口。响应体为 { code, message, data }，code === 0 为成功。
 */
const config = require('./config');

const TOKEN_KEY = 'clock_in_token';
const USER_KEY = 'clock_in_user';
const LOGIN_PATH = '/pages/login/login';

let loginRedirecting = false;

function redirectToLogin() {
  if (loginRedirecting) return;
  try {
    const pages = getCurrentPages();
    const current = pages[pages.length - 1];
    if (current && current.route === 'pages/login/login') return;
  } catch (e) {
    // App 启动早期可能没有页面栈
  }
  loginRedirecting = true;
  wx.navigateTo({
    url: LOGIN_PATH,
    complete() {
      loginRedirecting = false;
    },
    fail() {
      loginRedirecting = false;
      wx.reLaunch({ url: LOGIN_PATH });
    },
  });
}

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setToken(token) {
  if (token) wx.setStorageSync(TOKEN_KEY, token);
  else wx.removeStorageSync(TOKEN_KEY);
}

function getSession() {
  let user = null;
  try {
    user = wx.getStorageSync(USER_KEY);
  } catch (e) {
    user = null;
  }
  return {
    token: getToken(),
    user: user && typeof user === 'object' ? user : null,
  };
}

function setSession(user) {
  if (user && user.token) {
    setToken(user.token);
    wx.setStorageSync(USER_KEY, {
      id: user.id,
      userName: user.userName || '',
      age: user.age,
      sex: user.sex,
      avatarUrl: user.avatarUrl || '',
    });
    return;
  }
  setToken('');
  try {
    wx.removeStorageSync(USER_KEY);
  } catch (e) {
    // 没有缓存时忽略
  }
}

function request(options) {
  const method = options.method || 'GET';
  const auth = options.auth !== false;
  const token = getToken();
  const header = {
    'Content-Type': 'application/json',
  };
  if (auth && token) header.Authorization = `Bearer ${token}`;
  if (options.header) Object.assign(header, options.header);

  return new Promise((resolve, reject) => {
    wx.request({
      url: config.baseURL + options.url,
      method,
      data: options.data,
      header,
      timeout: 10000,
      success(res) {
        const body = res.data;
        const code = body && typeof body.code === 'number' ? body.code : null;
        if (code === 11004) {
          setSession(null);
          const auth = require('../utils/auth');
          auth.promptAccountDisabled((body && body.message) || '该账号已被停用，暂时无法使用');
          const error = new Error((body && body.message) || '该账号已被停用，暂时无法使用');
          error.code = 11004;
          reject(error);
          return;
        }
        if (res.statusCode === 401 || code === 10006 || code === 10007) {
          setSession(null);
          if (auth) redirectToLogin();
          reject(new Error((body && body.message) || '请先登录'));
          return;
        }
        if (!body || typeof body !== 'object' || code == null) {
          reject(new Error('服务暂不可用'));
          return;
        }
        if (code !== 0) {
          const error = new Error(body.message || '操作失败');
          error.code = code;
          reject(error);
          return;
        }
        resolve(body.data);
      },
      fail() {
        reject(new Error('网络异常，请稍后重试'));
      },
    });
  });
}

module.exports = {
  TOKEN_KEY,
  getToken,
  setToken,
  getSession,
  setSession,
  request,
};
