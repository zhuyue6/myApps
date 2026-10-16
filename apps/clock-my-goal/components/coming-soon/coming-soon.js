/**
 * 通用"开发中"友好占位组件
 * 用于尚未实现的页面，保持与其他页面一致的治愈风。
 */
Component({
  options: {
    styleIsolation: 'shared',
  },

  properties: {
    emoji: { type: String, value: '🛠️' },
    title: { type: String, value: '该功能正在打磨中' },
    desc: {
      type: String,
      value: '我们正在精心打磨这个模块，很快就能与你见面。',
    },
    tips: { type: Array, value: [] },
  },

  methods: {
    onBack() {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack({ delta: 1 });
      } else {
        wx.switchTab({ url: '/pages/profile/profile' });
      }
    },

    onFeedback() {
      wx.showModal({
        title: '期待你的想法',
        content:
          '你希望这个功能具备哪些能力？可以在设置页或未来的反馈入口告诉我们。',
        confirmText: '我知道了',
        showCancel: false,
      });
    },
  },
});
