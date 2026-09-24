/**
 * 已实现的 Java 接口。页面不要直接 wx.request，从这里进。
 * 用户：/user/login /user/register /user/logout /user/uploadAvatar
 * 标签：/label/createLabel /label/removeLabel /label/getLabelList /label/getLabelById
 * 记录：/record/createRecord /record/getRecord /record/getRecords /record/removeRecord
 *
 * 这些接口是账号、标签、打卡流水。0.1 原型的计划（截止时间、周期、目标次数）存在本地。
 */
const config = require('./config');
const { request, getToken, setToken } = require('./request');

function login(userName, password) {
  return request({
    url: '/user/login',
    method: 'POST',
    data: { userName, password },
    auth: false,
  }).then((user) => {
    if (user && user.token) setToken(user.token);
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
      setToken('');
      return data;
    },
    (error) => {
      setToken('');
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

function createRecord(payload) {
  return request({
    url: '/record/createRecord',
    method: 'POST',
    data: {
      remark: payload.remark || '',
      clockInTime: payload.clockInTime,
      clockOutTime: payload.clockOutTime || '',
      labelId: payload.labelId || 0,
    },
  });
}

function getRecord(id) {
  return request({
    url: '/record/getRecord',
    method: 'GET',
    data: { id },
  });
}

function getRecords() {
  return request({
    url: '/record/getRecords',
    method: 'GET',
  });
}

function removeRecord(id) {
  return request({
    url: '/record/removeRecord',
    method: 'POST',
    data: { id },
  });
}

module.exports = {
  login,
  register,
  logout,
  uploadAvatar,
  createLabel,
  removeLabel,
  getLabelList,
  getLabelById,
  createRecord,
  getRecord,
  getRecords,
  removeRecord,
};
