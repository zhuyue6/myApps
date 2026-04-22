/**
 * 自定义打卡月历：年月独立切换，日期显示计划 / 打卡 / 已完成
 */
const dateUtil = require('../../utils/date_util');

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n) {
  return `${n}`.padStart(2, '0');
}

Component({
  properties: {
    year: { type: Number, value: 0 },
    month: { type: Number, value: 0 },
    dayStats: { type: Object, value: {} },
    selectedDate: { type: String, value: '' },
  },
  data: {
    weekLabels: WEEK_LABELS,
    cells: [],
    headerTitle: '',
  },
  observers: {
    'year, month, dayStats, selectedDate': function () {
      this.buildCells();
    },
  },
  lifetimes: {
    attached() {
      this.buildCells();
    },
  },
  methods: {
    buildCells() {
      const y = Number(this.properties.year);
      const m = Number(this.properties.month);
      if (!y || !m) return;
      const stats = this.properties.dayStats || {};
      const selected = this.properties.selectedDate || '';
      const today = dateUtil.todayYMD();
      const firstDow = new Date(y, m - 1, 1).getDay();
      const lastDay = new Date(y, m, 0).getDate();
      const cells = [];
      for (let i = 0; i < firstDow; i += 1) {
        cells.push({ empty: true, key: `e${i}` });
      }
      for (let d = 1; d <= lastDay; d += 1) {
        const ymd = `${y}-${pad(m)}-${pad(d)}`;
        const st = stats[ymd] || { planned: 0, checked: 0 };
        const planned = st.planned || 0;
        const checked = st.checked || 0;
        let markText = '';
        let markType = '';
        if (planned > 0 && checked >= planned) {
          markText = '已完成';
          markType = 'done';
        } else if (checked > 0) {
          markText = `打卡 ${checked}`;
          markType = 'checked';
        } else if (planned > 0) {
          markText = `计划 ${planned}`;
          markType = 'planned';
        }
        cells.push({
          empty: false,
          key: ymd,
          day: d,
          ymd,
          markText,
          markType,
          isToday: ymd === today,
          isSelected: ymd === selected,
        });
      }
      this.setData({
        cells,
        headerTitle: `${y}年${pad(m)}月`,
      });
    },

    onPrevYear() {
      this.triggerEvent('yearchange', { delta: -1 });
    },
    onNextYear() {
      this.triggerEvent('yearchange', { delta: 1 });
    },
    onPrevMonth() {
      this.triggerEvent('monthchange', { delta: -1 });
    },
    onNextMonth() {
      this.triggerEvent('monthchange', { delta: 1 });
    },
    onCellTap(e) {
      const ymd = e.currentTarget.dataset.ymd;
      if (!ymd) return;
      this.triggerEvent('daypick', { ymd });
    },
  },
});
