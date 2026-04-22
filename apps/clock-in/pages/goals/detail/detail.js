/**
 * 目标详情：打卡、进度、记录、基础操作（按使用频率布局）
 */
const api = require('../../../api/index');
const engine = require('../../../services/goal_engine');
const { statusZh } = require('../../../utils/formatters');

const LINK_TEMP_KEY = 'clock_in_link_pick_temp';
const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function ruleSummary(rule) {
  if (!rule) return '';
  if (rule.cycleType === 'week') {
    const wd = (rule.weekDays || []).slice().sort((a, b) => a - b);
    if (!wd.length) return '每周打卡';
    return `每周：${wd.map((d) => WEEK_LABELS[d]).join('、')}`;
  }
  const wins = Array.isArray(rule.dayTimeWindows) ? rule.dayTimeWindows : [];
  if (wins.length) {
    return `每日 ${wins.length} 时段：${wins.map((w) => `${w.from}-${w.to}`).join('、')}`;
  }
  const from = rule.dayValidFrom || '00:00';
  const to = rule.dayValidTo || '23:59';
  return `每日 1 次（${from}-${to}）`;
}

Page({
  data: {
    id: '',
    goal: null,
    statusZh: '',
    canCheckIn: false,
    checkReason: '',
    makeupOptions: [],
    showMakeup: false,
    ruleText: '',
    tagName: '',
    recentCheckIns: [],
  },

  onLoad(q) {
    this.setData({ id: q.id || '' });
  },

  onShow() {
    if (this.data.id) this.load();
  },

  async load() {
    const g = await api.getGoal(this.data.id);
    if (!g) {
      wx.showToast({ title: '目标不存在', icon: 'none' });
      return;
    }
    const [all, tags] = await Promise.all([api.listGoals({}), api.listTags()]);
    const nameById = {};
    all.forEach((x) => {
      nameById[x.id] = x.name;
    });
    const tagById = {};
    tags.forEach((t) => {
      tagById[t.id] = t.name;
    });
    g.subLinksDisplay = (g.subLinks || []).map((l) => ({
      ...l,
      subName: nameById[l.subGoalId] || '已移除的子目标',
    }));
    const rule = g.checkInRule || { cycleType: 'day', timesPerCycle: 1 };
    const cis = (g.checkIns || []).map((c) => ({
      cycleKey: c.cycleKey,
      ts: c.ts,
      type: c.type,
    }));
    let canCheckIn = false;
    let checkReason = '';
    if (g.type === 'sub') {
      const r = engine.canCheckInSubNow(g, rule, cis);
      canCheckIn = r.ok;
      checkReason = r.reason || '';
    }
    const makeupOptions = this.buildMakeupOptions(g, rule, cis);
    const recentCheckIns = (g.checkIns || [])
      .slice()
      .sort((a, b) => b.ts - a.ts)
      .slice(0, 10)
      .map((c) => {
        const d = new Date(c.ts);
        const ymd = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, '0')}-${`${d.getDate()}`.padStart(2, '0')}`;
        const hm = `${`${d.getHours()}`.padStart(2, '0')}:${`${d.getMinutes()}`.padStart(2, '0')}`;
        return {
          ts: c.ts,
          cycleKey: c.cycleKey,
          type: c.type,
          label: `${ymd} ${hm}`,
        };
      });
    this.setData({
      goal: g,
      statusZh: statusZh(g.status),
      canCheckIn,
      checkReason,
      makeupOptions,
      ruleText: g.type === 'sub' ? ruleSummary(rule) : '',
      tagName: g.tagId ? tagById[g.tagId] || '' : '',
      recentCheckIns,
    });
  },

  /**
   * @param {object} g
   * @param {object} rule
   * @param {object[]} cis
   */
  buildMakeupOptions(g, rule, cis) {
    if (g.status !== 'in_progress' && g.status !== 'paused') return [];
    const keys = engine.listCycleKeys(rule, g.startDate, g.endDate);
    const win =
      require('../../../utils/constants').MAKEUP_WINDOW[rule.cycleType || 'day'] || 7;
    const curKey = engine.cycleKeyForTimestamp(rule, Date.now());
    const curIdx = keys.indexOf(curKey);
    const n = Math.max(1, Number(rule.timesPerCycle) || 1);
    const out = [];
    keys.forEach((k, idx) => {
      if (idx >= curIdx) return;
      const done = cis.filter((c) => c.cycleKey === k).length;
      let capPer = n;
      if (rule.cycleType !== 'day') {
        const active = engine.activeDaysInRuleCycle(rule, k, g.startDate, g.endDate);
        capPer = Math.min(n, Math.max(1, active));
      }
      if (done >= capPer) return;
      if (curIdx - idx > win) return;
      out.push({ key: k, label: `${k}（缺 ${capPer - done} 次）` });
    });
    return out;
  },

  async onCheckIn() {
    try {
      await api.checkIn(this.data.id);
      wx.showToast({ title: '打卡成功', icon: 'success' });
      this.load();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
    }
  },

  toggleMakeup() {
    this.setData({ showMakeup: !this.data.showMakeup });
  },

  onCloseMakeup() {
    this.setData({ showMakeup: false });
  },

  async onMakeup(e) {
    const key = e.currentTarget.dataset.mk || (e.mark && e.mark.mk);
    try {
      await api.makeupCheckIn(this.data.id, key, '');
      wx.showToast({ title: '补卡成功', icon: 'success' });
      this.setData({ showMakeup: false });
      this.load();
    } catch (err) {
      wx.showToast({ title: (err && err.message) || '失败', icon: 'none' });
    }
  },

  goEdit() {
    wx.navigateTo({ url: `/pages/goals/edit/edit?id=${this.data.id}` });
  },

  goReview() {
    wx.navigateTo({ url: `/pages/review/review?id=${this.data.id}` });
  },

  async onPause() {
    wx.showModal({
      title: '暂停目标',
      content: '暂停期间不可打卡，确定吗？',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.pauseGoal(this.data.id);
          wx.showToast({ title: '已暂停', icon: 'none' });
          this.load();
        } catch (e) {
          wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
        }
      },
    });
  },

  async onResume() {
    try {
      await api.resumeGoal(this.data.id);
      wx.showToast({ title: '已恢复', icon: 'none' });
      this.load();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
    }
  },

  async onArchive() {
    wx.showModal({
      title: '归档',
      content: '归档后将从主列表移除，可在「归档」中查看。',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.archiveGoal(this.data.id);
          wx.navigateBack();
        } catch (e) {
          wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
        }
      },
    });
  },

  async onDelete() {
    wx.showModal({
      title: '删除目标',
      content: '将进入回收站，可在一段时间内恢复。',
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.deleteGoal(this.data.id);
          wx.navigateBack();
        } catch (e) {
          wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
        }
      },
    });
  },

  goRelink() {
    wx.setStorageSync(LINK_TEMP_KEY, JSON.stringify(this.data.goal.subLinks || []));
    wx.navigateTo({
      url: `/pages/goals/link-subs/link-subs?mainId=${this.data.id}`,
    });
  },

  goSubDetail(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/goals/detail/detail?id=${id}` });
  },
});
