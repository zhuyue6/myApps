/**
 * 页面不要直接 wx.request。
 * 登录：POST /auth/login  POST /auth/register  POST /auth/logout
 * 头像：POST /users/{id}/avatar
 * 标签：POST /labels  PATCH /labels/{id}  DELETE /labels/{id}  GET /labels  GET /labels/{id}
 * 目标：POST /goals  PATCH /goals/{id}  GET /goals  GET /goals/{id}  DELETE /goals/{id}  POST /goals/{id}/clockIn
 *
 * create/update 请求字段：goalName、remark、expirationTime、labelId、clockInCycle
 * targetClockInCount 由服务端按周期与截止时间计算，客户端不再提交。
 * 目标列表返回 status：1 进行中 / 2 已完成 / 3 已过期，客户端不再自行判断。
 */
const config = require('./config');
const { request, getSession, setSession, patchSessionUser } = require('./request');

function login(userName, password) {
  return request({
    url: '/auth/login',
    method: 'POST',
    data: { userName, password },
    auth: false,
  }).then((user) => {
    if (user && user.token) setSession(user);
    return user;
  });
}

function register(payload) {
  return request({
    url: '/auth/register',
    method: 'POST',
    data: {
      userName: payload.userName,
      password: payload.password,
      sex: payload.sex,
      age: payload.age,
    },
    auth: false,
  });
}

function logout() {
  return request({
    url: '/auth/logout',
    method: 'POST',
  }).then(
    (data) => {
      setSession(null);
      return data;
    },
    (error) => {
      setSession(null);
      throw error;
    },
  );
}

function resolveAvatarUrl(avatarUrl) {
  if (!avatarUrl) return '';
  if (/^https?:\/\//.test(avatarUrl) || avatarUrl.indexOf('wxfile://') === 0) return avatarUrl;
  const raw = String(avatarUrl);
  
  const path = `${config.baseURL.replace(/\/$/, '')}${raw}`
  return path;
}

function getUser(id) {
  return request({
    url: `/users/${id}`,
    method: 'GET',
  });
}

function uploadAvatar(filePath) {
  const session = getSession();
  const token = session.token;
  const userId = session.user && session.user.id;
  if (!userId) {
    return Promise.reject(new Error('请先登录'));
  }
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.baseURL}/users/${userId}/avatar`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 20000,
      success(res) {
        let body = res.data;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (e) {
            reject(new Error(res.statusCode === 413 ? '图片太大，请换一张较小的图片' : '上传失败'));
            return;
          }
        }
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
        if (res.statusCode === 401 || code === 10004 || code === 10005 || code === 11001) {
          setSession(null);
          const auth = require('../utils/auth');
          auth.goLogin({ redirect: '/pages/mine/mine' });
          reject(new Error((body && body.message) || '请先登录'));
          return;
        }
        if (!body || code !== 0) {
          reject(new Error((body && body.message) || (res.statusCode === 413 ? '图片太大，请换一张较小的图片' : '上传失败')));
          return;
        }
        const avatarUrl = typeof body.data === 'string'
          ? body.data
          : (body.data && body.data.avatarUrl) || '';
        if (avatarUrl) patchSessionUser({ avatarUrl });
        resolve(avatarUrl);
      },
      fail() {
        reject(new Error('网络异常，请稍后重试'));
      },
    });
  });
}

function createLabel(labelName, labelType) {
  return request({
    url: '/labels',
    method: 'POST',
    data: { labelName, labelType },
  });
}

function updateLabel(id, labelName, labelType) {
  return request({
    url: `/labels/${id}`,
    method: 'PATCH',
    data: { labelName, labelType },
  });
}

function removeLabel(id) {
  return request({
    url: `/labels/${id}`,
    method: 'DELETE',
  });
}

function getLabelList() {
  return request({
    url: '/labels',
    method: 'GET',
  });
}

function getLabelById(id) {
  return request({
    url: `/labels/${id}`,
    method: 'GET',
  });
}

function goalBody(payload) {
  return {
    goalName: payload.goalName || '',
    remark: payload.remark || '',
    expirationTime: payload.expirationTime,
    labelId: payload.labelId == null || payload.labelId === '' ? null : payload.labelId,
    clockInCycle: payload.clockInCycle,
  };
}

function createGoal(payload) {
  return request({
    url: '/goals',
    method: 'POST',
    data: goalBody(payload),
  });
}

function updateGoal(payload) {
  return request({
    url: `/goals/${payload.id}`,
    method: 'PATCH',
    data: goalBody(payload),
  });
}

function getGoals() {
  return request({
    url: '/goals',
    method: 'GET',
  });
}

function getGoal(id) {
  return request({
    url: `/goals/${id}`,
    method: 'GET',
  });
}

function removeGoal(id) {
  return request({
    url: `/goals/${id}`,
    method: 'DELETE',
  });
}

function clockIn(id) {
  return request({
    url: `/goals/${id}/clockIn`,
    method: 'POST',
  });
}

module.exports = {
  getSession,
  patchSessionUser,
  resolveAvatarUrl,
  login,
  register,
  logout,
  getUser,
  uploadAvatar,
  createLabel,
  updateLabel,
  removeLabel,
  getLabelList,
  getLabelById,
  createGoal,
  updateGoal,
  getGoals,
  getGoal,
  removeGoal,
  clockIn,
};
