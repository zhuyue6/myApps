/**
 * 《目标打卡》小程序入口：本地存储 + 标准 API，便于后续切换后端
 */
const clockInApi = require('./api/index');

App({
  onLaunch() {
    clockInApi.bootstrap().catch((e) => {
      console.error('bootstrap', e);
    });
  },

  onShow() {
    clockInApi.onAppShow().catch(() => {});
  },

  globalData: {
    /** @type {ReturnType<typeof require>} */
    api: clockInApi,
  },
});
