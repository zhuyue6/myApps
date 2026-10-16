/**
 * 打卡日历页（tabBar）：默认显示当前月，按日计划/打卡/已完成标注
 */
const api = require('../../api/index');

function pad(n) {
  return `${n}`.padStart(2, '0');
}

Page({
  data: {
    year: 0,
    month: 0,
    dayStats: {},
    selectedDate: '',
    selectedInfo: null,
  },

  onShow() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const today = `${y}-${pad(m)}-${pad(d.getDate())}`;
    this.setData({ year: y, month: m, selectedDate: today });
    this.loadMonth();
  },

  async loadMonth() {
    const { year, month, selectedDate } = this.data;
    const ym = `${year}-${pad(month)}`;
    try {
      const stats = await api.listCalendarMonthStats(ym);
      const selectedInfo = this.pickSelected(stats, selectedDate);
      this.setData({ dayStats: stats, selectedInfo });
    } catch (e) {
      this.setData({ dayStats: {}, selectedInfo: null });
    }
  },

  pickSelected(stats, ymd) {
    if (!ymd) return null;
    const s = stats[ymd];
    if (!s) return { ymd, planned: 0, checked: 0 };
    return { ymd, planned: s.planned || 0, checked: s.checked || 0 };
  },

  onYearChange(e) {
    const delta = (e.detail && e.detail.delta) || 0;
    const year = Math.max(1970, this.data.year + delta);
    this.setData({ year }, () => this.loadMonth());
  },

  onMonthChange(e) {
    const delta = (e.detail && e.detail.delta) || 0;
    let year = this.data.year;
    let month = this.data.month + delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.setData({ year, month }, () => this.loadMonth());
  },

  onDayPick(e) {
    const ymd = e.detail && e.detail.ymd;
    if (!ymd) return;
    const selectedInfo = this.pickSelected(this.data.dayStats || {}, ymd);
    this.setData({ selectedDate: ymd, selectedInfo });
  },

  goToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = d.getMonth() + 1;
    const ymd = `${y}-${pad(m)}-${pad(d.getDate())}`;
    this.setData({ year: y, month: m, selectedDate: ymd }, () => this.loadMonth());
  },
});
