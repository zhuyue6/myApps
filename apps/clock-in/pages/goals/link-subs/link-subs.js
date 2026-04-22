/**
 * 主目标关联子目标与权重
 */
const api = require('../../../api/index');

const LINK_TEMP_KEY = 'clock_in_link_pick_temp';

Page({
  data: {
    mainId: '',
    subs: [],
    picked: {},
    sum: 0,
  },

  async onLoad(q) {
    this.setData({ mainId: q.mainId || '' });
    let initial = [];
    try {
      const raw = wx.getStorageSync(LINK_TEMP_KEY);
      initial = typeof raw === 'string' ? JSON.parse(raw || '[]') : raw || [];
    } catch (e) {
      initial = [];
    }
    const picked = {};
    (initial || []).forEach((l) => {
      picked[l.subGoalId] = { weight: l.weight, on: true };
    });
    const goals = await api.listGoals({});
    const subs = goals.filter((g) => g.type === 'sub');
    subs.forEach((s) => {
      if (!picked[s.id]) picked[s.id] = { weight: 0, on: false };
    });
    this.setData({ subs, picked });
    this.refreshSum();
  },

  onSwitch(e) {
    const id = (e.mark && e.mark.sid) || '';
    const on = typeof e.detail === 'boolean' ? e.detail : !!(e.detail && e.detail.value);
    const picked = { ...this.data.picked };
    if (!picked[id]) picked[id] = { weight: 0, on: false };
    picked[id].on = on;
    this.setData({ picked });
    this.refreshSum();
  },

  onWeight(e) {
    const id = (e.mark && e.mark.wid) || '';
    const raw = typeof e.detail === 'string' || typeof e.detail === 'number' ? e.detail : (e.detail && e.detail.value);
    const v = Number(raw);
    const picked = { ...this.data.picked };
    if (!picked[id]) picked[id] = { weight: 0, on: true };
    picked[id].weight = v;
    this.setData({ picked });
    this.refreshSum();
  },

  refreshSum() {
    const picked = this.data.picked || {};
    let sum = 0;
    Object.keys(picked).forEach((k) => {
      if (picked[k].on) sum += Number(picked[k].weight) || 0;
    });
    this.setData({ sum });
  },

  async onConfirm() {
    const links = [];
    const picked = this.data.picked || {};
    Object.keys(picked).forEach((id) => {
      const p = picked[id];
      if (p.on) links.push({ subGoalId: id, weight: Number(p.weight) || 0 });
    });
    const sum = links.reduce((a, b) => a + b.weight, 0);
    if (sum !== 100) {
      wx.showToast({ title: `权重合计需为 100%，当前 ${sum}%`, icon: 'none' });
      return;
    }
    wx.setStorageSync(LINK_TEMP_KEY, JSON.stringify(links));
    try {
      if (this.data.mainId) {
        const main = await api.getGoal(this.data.mainId);
        if (!main) throw new Error('主目标不存在');
        await api.updateGoal(this.data.mainId, {
          name: main.name,
          description: main.description || '',
          tagId: main.tagId || '',
          startDate: main.startDate,
          endDate: main.endDate,
          subLinks: links,
        });
      }
      wx.navigateBack();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' });
    }
  },
});
