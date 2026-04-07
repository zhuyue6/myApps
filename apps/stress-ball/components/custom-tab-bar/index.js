/**
 * 自定义底部导航：reLaunch 切换三主页，保证「单任务」式沉浸
 */
Component({
  properties: {
    current: {
      type: String,
      value: 'index',
    },
  },
  methods: {
    onTap(e) {
      const path = e.currentTarget.dataset.path;
      const cur = this.properties.current;
      if (!path) return;
      // 文档：挑战玩法在主界面进行（目标条 + 倒计时 + 按压球体）
      // 中间「挑战」直接进入玩耍页并开启挑战模式；统计子页从设置进入
      if (path === 'challenge') {
        wx.reLaunch({ url: '/pages/index/index?startChallenge=1' });
        return;
      }
      if (path === cur) return;
      wx.reLaunch({
        url: `/pages/${path}/${path}`,
      });
    },
  },
});
