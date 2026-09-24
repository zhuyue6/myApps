/**
 * 目标列表（首页 tabBar）：默认活跃目标；提供标签管理快捷入口
 */
const api = require('../../../api/index');
const { statusZh } = require('../../../utils/formatters');

Page({
  data: {
    goals: [],
    activeOnly: true,
    loading: true,
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    this.setData({ loading: true });
    try {
      const [goals, tags] = await Promise.all([
        api.listGoals({ activeOnly: this.data.activeOnly }),
        api.listTags(),
      ]);
      const tagMap = {};
      tags.forEach((t) => {
        tagMap[t.id] = t.name;
      });
      const goalMap = {};
      goals.forEach((g) => {
        goalMap[g.id] = g;
      });
      const decorated = goals.map((g) => {
        const subs =
          g.type === 'main' && Array.isArray(g.subLinks)
            ? g.subLinks.map((l) => ({
                subGoalId: l.subGoalId,
                weight: l.weight,
                subName:
                  (goalMap[l.subGoalId] && goalMap[l.subGoalId].name) || '已移除的子目标',
                subStatus:
                  (goalMap[l.subGoalId] && statusZh(goalMap[l.subGoalId].status)) || '',
              }))
            : [];
        return {
          ...g,
          statusZh: statusZh(g.status),
          tagName: g.tagId ? tagMap[g.tagId] || '' : '',
          subLinksDisplay: subs,
        };
      });
      this.setData({ goals: decorated, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  toggleActiveOnly() {
    this.setData({ activeOnly: !this.data.activeOnly }, () => this.refresh());
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/goals/edit/edit' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.gid || (e.mark && e.mark.gid);
    if (!id) return;
    wx.navigateTo({ url: `/pages/goals/detail/detail?id=${id}` });
  },

  goTags() {
    wx.navigateTo({ url: '/pages/tags/manage/manage' });
  },

  onPullDownRefresh() {
    this.refresh().then(() => wx.stopPullDownRefresh());
  },
});
