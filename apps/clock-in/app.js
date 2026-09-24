/**
 * 目标打卡：页面走 api，本地计划与后端接口入口分开。
 */
const clockInApi = require('./api/index');

App({
  globalData: {
    api: clockInApi,
  },
});
