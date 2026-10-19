/**
 * clock-in-app 已有接口。页面不要直接 wx.request。
 * 用户：/user/login /user/register /user/logout /user/uploadAvatar
 * 标签：/label/createLabel /label/removeLabel /label/getLabelList /label/getLabelById
 * 目标：/goal/createGoal /goal/updateGoal /goal/getGoals /goal/removeGoal /goal/clockInGoal
 *
 * create/update 请求字段：remark、expirationTime、labelId、clockInCycle
 * targetClockInCount 由服务端按周期与截止时间计算，客户端不再提交。
 * getGoals 返回 status：1 进行中 / 2 已完成 / 3 已过期，客户端不再自行判断。
 * 详情从 /goal/getGoals 里按 id 取。
 */
const config = require('./config');
const { request, getToken, getSession, setSession } = require('./request');

function login(userName, password) {
  return request({
    url: '/user/login',
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
    url: '/user/register',
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
    url: '/user/logout',
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

function uploadAvatar(filePath) {
  const token = getToken();
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${config.baseURL}/user/uploadAvatar`,
      filePath,
      name: 'file',
      header: token ? { Authorization: `Bearer ${token}` } : {},
      timeout: 10000,
      success(res) {
        let body = res.data;
        if (typeof body === 'string') {
          try {
            body = JSON.parse(body);
          } catch (e) {
            reject(new Error('上传失败'));
            return;
          }
        }
        if (!body || body.code !== 0) {
          reject(new Error((body && body.message) || '上传失败'));
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

function createLabel(labelName, labelType) {
  return request({
    url: '/label/createLabel',
    method: 'POST',
    data: { labelName, labelType },
  });
}

function removeLabel(id) {
  return request({
    url: '/label/removeLabel',
    method: 'POST',
    data: { id },
  });
}

function getLabelList() {
  return request({
    url: '/label/getLabelList',
    method: 'GET',
  });
}

function getLabelById(id) {
  return request({
    url: '/label/getLabelById',
    method: 'GET',
    data: { id },
  });
}

function createGoal(payload) {
  return request({
    url: '/goal/createGoal',
    method: 'POST',
    data: {
      remark: payload.remark || '',
      expirationTime: payload.expirationTime,
      labelId: payload.labelId == null || payload.labelId === '' ? null : payload.labelId,
      clockInCycle: payload.clockInCycle,
    },
  });
}

function updateGoal(payload) {
  return request({
    url: '/goal/updateGoal',
    method: 'POST',
    data: {
      id: payload.id,
      remark: payload.remark || '',
      expirationTime: payload.expirationTime,
      labelId: payload.labelId == null || payload.labelId === '' ? null : payload.labelId,
      clockInCycle: payload.clockInCycle,
    },
  });
}

function getGoals() {
  return request({
    url: '/goal/getGoals',
    method: 'GET',
  });
}

function removeGoal(id) {
  return request({
    url: '/goal/removeGoal',
    method: 'POST',
    data: { id },
  });
}

function clockIn(id) {
  return request({
    url: '/goal/clockInGoal',
    method: 'POST',
    data: { id },
  });
}

module.exports = {
  getSession,
  login,
  register,
  logout,
  uploadAvatar,
  createLabel,
  removeLabel,
  getLabelList,
  getLabelById,
  createGoal,
  updateGoal,
  getGoals,
  removeGoal,
  clockIn,
};
