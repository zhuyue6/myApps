/**
 * 创建 / 编辑目标：主目标、子目标、打卡规则（day/week）
 */
const api = require('../../../api/index');
const dateUtil = require('../../../utils/date_util');

const LINK_TEMP_KEY = 'clock_in_link_pick_temp';

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function tagPickerOptions(tags) {
  const list = [{ id: '', name: '无标签', type: 'system' }].concat(tags);
  list.push({ id: '__new__', name: '+ 新建标签', type: 'action' });
  return list;
}

Page({
  data: {
    id: '',
    isEdit: false,
    type: 'sub',
    name: '',
    description: '',
    tagId: '',
    tags: [],
    tagOptions: [],
    tagIndex: 0,
    tagName: '无标签',
    startDate: '',
    endDate: '',
    cycleType: 'day',
    cycleIndex: 0,
    dayTimeWindows: [{ from: '08:00', to: '12:00' }],
    weekDays: [1, 2, 3, 4, 5],
    weekOptions: [
      { value: 1, label: '周一' },
      { value: 2, label: '周二' },
      { value: 3, label: '周三' },
      { value: 4, label: '周四' },
      { value: 5, label: '周五' },
      { value: 6, label: '周六' },
      { value: 0, label: '周日' },
    ],
    subLinks: [],
    subLinksDisplay: [],
    weightSum: 0,
    showTagCreate: false,
    newTagInput: '',
  },

  async onLoad(q) {
    const rawTags = await api.listTags();
    const tagOptions = tagPickerOptions(rawTags);
    const today = dateUtil.todayYMD();
    const t = new Date();
    t.setDate(t.getDate() + 14);
    const end = dateUtil.toYMD(t);
    const forcedType = q && q.type === 'main' ? 'main' : q && q.type === 'sub' ? 'sub' : '';

    if (q && q.id) {
      const g = await api.getGoal(q.id);
      if (!g) {
        wx.showToast({ title: '目标不存在', icon: 'none' });
        return;
      }
      const rule = g.checkInRule || {};
      const cycleType = rule.cycleType === 'week' ? 'week' : 'day';
      const cycleIndex = cycleType === 'day' ? 0 : 1;
      const dayTimeWindows = cycleType === 'day'
        ? (Array.isArray(rule.dayTimeWindows) && rule.dayTimeWindows.length
            ? rule.dayTimeWindows
            : [{ from: rule.dayValidFrom || '08:00', to: rule.dayValidTo || '12:00' }])
        : [{ from: '08:00', to: '12:00' }];
      const weekDays = cycleType === 'week'
        ? (Array.isArray(rule.weekDays) && rule.weekDays.length
            ? rule.weekDays.slice().sort((a, b) => a - b)
            : [1, 2, 3, 4, 5])
        : [1, 2, 3, 4, 5];
      const ti = Math.max(
        0,
        tagOptions.findIndex((x) => x.id === (g.tagId || '')),
      );
      this.setData({
        id: g.id,
        isEdit: true,
        type: g.type,
        name: g.name,
        description: g.description || '',
        tagId: g.tagId || '',
        tags: rawTags,
        tagOptions,
        tagIndex: ti,
        tagName: tagOptions[ti] ? tagOptions[ti].name : '无标签',
        startDate: g.startDate,
        endDate: g.endDate,
        cycleType,
        cycleIndex,
        dayTimeWindows,
        weekDays,
        subLinks: g.subLinks || [],
      });
      await this.refreshSubLinksDisplay();
      return;
    }

    // reuse from existing goal
    if (q && q.reuseId) {
      const g = await api.getGoal(q.reuseId);
      if (g) {
        const rule = g.checkInRule || {};
        const cycleType = rule.cycleType === 'week' ? 'week' : 'day';
        const cycleIndex = cycleType === 'day' ? 0 : 1;
        const dayTimeWindows = cycleType === 'day'
          ? (Array.isArray(rule.dayTimeWindows) && rule.dayTimeWindows.length
              ? rule.dayTimeWindows
              : [{ from: '08:00', to: '12:00' }])
          : [{ from: '08:00', to: '12:00' }];
        const weekDays = cycleType === 'week'
          ? (Array.isArray(rule.weekDays) && rule.weekDays.length
              ? rule.weekDays.slice().sort((a, b) => a - b)
              : [1, 2, 3, 4, 5])
          : [1, 2, 3, 4, 5];
        const ti = Math.max(
          0,
          tagOptions.findIndex((x) => x.id === (g.tagId || '')),
        );
        this.setData({
          type: forcedType || g.type,
          name: `${g.name}（复用）`,
          description: g.description || '',
          tagId: g.tagId || '',
          tags: rawTags,
          tagOptions,
          tagIndex: ti,
          tagName: tagOptions[ti] ? tagOptions[ti].name : '无标签',
          startDate: today,
          endDate: end,
          cycleType,
          cycleIndex,
          dayTimeWindows,
          weekDays,
          subLinks: (forcedType || g.type) === 'main' ? g.subLinks || [] : [],
        });
        await this.refreshSubLinksDisplay();
        wx.setStorageSync(LINK_TEMP_KEY, JSON.stringify((forcedType || g.type) === 'main' ? g.subLinks || [] : []));
      }
      return;
    }

    // fresh
    const initialType = forcedType || 'sub';
    this.setData({
      tags: rawTags,
      tagOptions,
      type: initialType,
      tagIndex: 0,
      tagName: tagOptions[0].name,
      startDate: today,
      endDate: end,
    });
    const raw = wx.getStorageSync(LINK_TEMP_KEY);
    if (raw && initialType === 'main') {
      try {
        const subLinks = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (Array.isArray(subLinks)) {
          this.setData({ subLinks });
          await this.refreshSubLinksDisplay();
        }
      } catch (e) {
        /* ignore */
      }
    }
  },

  async onShow() {
    if (this.data.type !== 'main') return;
    const raw = wx.getStorageSync(LINK_TEMP_KEY);
    if (!raw) return;
    try {
      const subLinks = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(subLinks)) {
        this.setData({ subLinks });
        await this.refreshSubLinksDisplay();
      }
    } catch (e) {
      /* ignore */
    }
  },

  async refreshSubLinksDisplay() {
    const links = this.data.subLinks || [];
    const sum = links.reduce((a, b) => a + (Number(b.weight) || 0), 0);
    if (!links.length) {
      this.setData({ subLinksDisplay: [], weightSum: 0 });
      return;
    }
    try {
      const allGoals = await api.listGoals({});
      const byId = {};
      allGoals.forEach((g) => {
        byId[g.id] = g;
      });
      const subLinksDisplay = links.map((l) => ({
        subGoalId: l.subGoalId,
        weight: l.weight,
        subName: (byId[l.subGoalId] && byId[l.subGoalId].name) || '已移除',
      }));
      this.setData({ subLinksDisplay, weightSum: sum });
    } catch (e) {
      this.setData({ weightSum: sum });
    }
  },

  onType(e) {
    const fromDataset = e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.v;
    const v =
      fromDataset ||
      (typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || 'sub');
    this.setData({ type: v });
    if (v === 'main') this.refreshSubLinksDisplay();
  },

  onName(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ name: v });
  },

  onDesc(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ description: v });
  },

  onTagPick(e) {
    const i = Number(e.detail.value);
    const t = this.data.tagOptions[i];
    if (!t) return;
    if (t.id === '__new__') {
      this.setData({ showTagCreate: true, newTagInput: '' });
      return;
    }
    this.setData({
      tagIndex: i,
      tagId: t.id || '',
      tagName: t.name,
    });
  },

  onNewTagInput(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ newTagInput: v });
  },

  onNewTagCancel() {
    this.setData({ showTagCreate: false, newTagInput: '' });
  },

  async onNewTagConfirm() {
    const name = (this.data.newTagInput || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    try {
      const { id } = await api.createCustomTag(name);
      const rawTags = await api.listTags();
      const tagOptions = tagPickerOptions(rawTags);
      const idx = tagOptions.findIndex((x) => x.id === id);
      this.setData({
        tags: rawTags,
        tagOptions,
        tagIndex: idx < 0 ? 0 : idx,
        tagId: id,
        tagName: name,
        showTagCreate: false,
        newTagInput: '',
      });
      wx.showToast({ title: '已新增', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '新建失败', icon: 'none' });
    }
  },

  onCyclePick(e) {
    const ds = e.currentTarget && e.currentTarget.dataset;
    let cycleType = 'day';
    let i = 0;
    if (ds && ds.cycle) {
      cycleType = ds.cycle === 'week' ? 'week' : 'day';
      i = cycleType === 'week' ? 1 : 0;
    } else {
      i = Number(e.detail && e.detail.value) || 0;
      cycleType = i === 1 ? 'week' : 'day';
    }
    this.setData({ cycleType, cycleIndex: i });
  },

  onStart(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEnd(e) {
    this.setData({ endDate: e.detail.value });
  },

  onWindowFrom(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const v = e.detail.value;
    const windows = this.data.dayTimeWindows.slice();
    if (!windows[idx]) return;
    windows[idx] = { ...windows[idx], from: v };
    this.setData({ dayTimeWindows: windows });
  },

  onWindowTo(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const v = e.detail.value;
    const windows = this.data.dayTimeWindows.slice();
    if (!windows[idx]) return;
    windows[idx] = { ...windows[idx], to: v };
    this.setData({ dayTimeWindows: windows });
  },

  onWindowRemove(e) {
    const idx = Number(e.currentTarget.dataset.idx);
    const windows = this.data.dayTimeWindows.slice();
    windows.splice(idx, 1);
    this.setData({ dayTimeWindows: windows.length ? windows : [{ from: '08:00', to: '12:00' }] });
  },

  onWindowAdd() {
    const windows = this.data.dayTimeWindows.slice();
    if (windows.length >= 6) {
      wx.showToast({ title: '最多 6 个时段', icon: 'none' });
      return;
    }
    windows.push({ from: '18:00', to: '22:00' });
    this.setData({ dayTimeWindows: windows });
  },

  onWeekDaysChange(e) {
    const raw = e.detail || [];
    const vals = (Array.isArray(raw) ? raw : []).map((x) => Number(x));
    const uniq = Array.from(new Set(vals)).sort((a, b) => a - b);
    this.setData({ weekDays: uniq });
  },

  goPickSubs() {
    wx.setStorageSync(LINK_TEMP_KEY, JSON.stringify(this.data.subLinks || []));
    const q = this.data.id ? `?mainId=${this.data.id}` : '';
    wx.navigateTo({ url: `/pages/goals/link-subs/link-subs${q}` });
  },

  buildRule() {
    if (this.data.cycleType === 'week') {
      return {
        cycleType: 'week',
        weekDays: this.data.weekDays && this.data.weekDays.length ? this.data.weekDays : [1, 2, 3, 4, 5],
      };
    }
    return {
      cycleType: 'day',
      dayTimeWindows: this.data.dayTimeWindows || [{ from: '00:00', to: '23:59' }],
    };
  },

  buildPayload() {
    return {
      type: this.data.type,
      name: this.data.name,
      description: this.data.description,
      tagId: this.data.tagId,
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      checkInRule: this.data.type === 'sub' ? this.buildRule() : null,
      subLinks: this.data.type === 'main' ? this.data.subLinks : [],
    };
  },

  async onSave() {
    const payload = this.buildPayload();
    if (this.data.type === 'sub') {
      if (payload.checkInRule.cycleType === 'week' && !payload.checkInRule.weekDays.length) {
        wx.showToast({ title: '请选择至少一个打卡日', icon: 'none' });
        return;
      }
      if (payload.checkInRule.cycleType === 'day' && !payload.checkInRule.dayTimeWindows.length) {
        wx.showToast({ title: '请至少添加一个打卡时段', icon: 'none' });
        return;
      }
    }
    if (
      this.data.type === 'main' &&
      payload.subLinks &&
      payload.subLinks.length &&
      this.data.weightSum !== 100
    ) {
      wx.showToast({ title: '子目标权重需合计 100%', icon: 'none' });
      return;
    }
    try {
      if (this.data.isEdit) {
        await api.updateGoal(this.data.id, payload);
      } else {
        const { id } = await api.createGoal(payload);
        this.setData({ id, isEdit: true });
      }
      wx.removeStorageSync(LINK_TEMP_KEY);
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' });
    }
  },
});
