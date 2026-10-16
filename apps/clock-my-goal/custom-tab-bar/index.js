Component({
  data: {
    selected: 0,
    hidden: false,
    list: [
      { pagePath: '/pages/checkin/list', text: '打卡', icon: 'clock-o' },
      { pagePath: '/pages/tags/list', text: '标签', icon: 'label-o' },
      { pagePath: '/pages/mine/mine', text: '我的', icon: 'contact' },
    ],
  },

  methods: {
    onTap(event) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item || index === this.data.selected) return;
      wx.switchTab({ url: item.pagePath });
    },
  },
});
