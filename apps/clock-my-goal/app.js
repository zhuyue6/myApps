/**
 * 目标打卡。页面只走 api，计划和标签请求 clock-in-app。
 */
const clockInApi = require('./api/index');

App({
  globalData: {
    api: clockInApi,
  },
});
