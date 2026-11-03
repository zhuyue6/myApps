const api = require('../../api/index');
const auth = require('../../utils/auth');
const datetime = require('../../utils/datetime');
const { CYCLES, CYCLE_COUNT_MAX } = require('../../utils/plan');

const RESET_TIP = '周期、截止时间或单次周期打卡总数有变化，已打卡次数会被清空。';
const DEFAULT_CHECK_START = '08:00:00';
const DEFAULT_CHECK_END = '21:00:00';

function emptyForm() {
  return {
    name: '',
    remark: '',
    deadline: '',
    cycle: '',
    cycleCount: 1,
    checkStart: '',
    checkEnd: '',
    tagId: '',
  };
}

function clampCycleCount(value) {
  const count = parseInt(value, 10);
  if (!Number.isInteger(count)) return 0;
  if (count < 1) return 1;
  if (count > CYCLE_COUNT_MAX) return CYCLE_COUNT_MAX;
  return count;
}

function confirmReset() {
  return new Promise((resolve) => {
    wx.showModal({
      title: '提示',
      content: RESET_TIP,
      confirmText: '确认',
      cancelText: '取消',
      success(res) {
        resolve(!!res.confirm);
      },
      fail() {
        resolve(false);
      },
    });
  });
}

function deadlineTooEarly(deadline) {
  const picked = datetime.parseDateTime(deadline);
  return !!(picked && picked.getTime() < Date.now());
}

Page({
  data: {
    mode: 'create',
    readonly: false,
    form: emptyForm(),
    errors: {},
    cycles: CYCLES,
    tagText: '',
    remarkLen: 0,
    targetCount: 0,
    checkedCount: 0,
    createdAt: '',
    statusText: '',
    statusHelp: '',
    showTime: false,
    timeColumns: [],
    showClock: false,
    clockTitle: '选择开始时间',
    clockColumns: [],
    cycleCountMax: CYCLE_COUNT_MAX,
    cycleChecked: 0,
    showTag: false,
    tagOptions: [],
    draftTagId: '',
    sheetHeight: 208,
  },

  onLoad(query) {
    if (!auth.ensureLogin()) return;
    this.planId = query.id || '';
    const mode = this.planId ? 'edit' : 'create';
    this.originDeadline = '';
    this.originCycleCount = 1;
    this.setData({ mode });
    wx.setNavigationBarTitle({ title: mode === 'edit' ? '编辑打卡' : '新增打卡' });
    if (mode === 'create') return;
    api.getPlan(this.planId).then((plan) => {
      if (!plan) {
        wx.showToast({ title: '计划不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      const readonly = plan.status === 'completed';
      this.originDeadline = plan.deadline || '';
      this.originCycleCount = plan.cycleCount || 1;
      if (readonly) wx.setNavigationBarTitle({ title: '查看打卡' });
      this.setData({
        readonly,
        form: {
          name: plan.name,
          remark: plan.remark || '',
          deadline: plan.deadline,
          cycle: plan.cycle,
          cycleCount: plan.cycleCount || 1,
          checkStart: plan.checkStart || '',
          checkEnd: plan.checkEnd || '',
          tagId: plan.tagId || '',
        },
        tagText: plan.tagText,
        remarkLen: (plan.remark || '').length,
        targetCount: plan.targetCount,
        checkedCount: plan.checkedCount,
        cycleChecked: plan.cycleChecked || 0,
        createdAt: plan.createdAt,
        statusText: plan.statusText,
        statusHelp: plan.statusHelp,
      });
    }).catch((error) => {
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onName(event) {
    if (this.data.readonly) return;
    this.setData({ 'form.name': event.detail.value, 'errors.name': '' });
  },

  onRemark(event) {
    if (this.data.readonly) return;
    const remark = event.detail.value || '';
    this._remark = remark;
    this.setData({ remarkLen: remark.length, 'errors.remark': '' });
  },

  onCycle(event) {
    if (this.data.readonly) return;
    const value = event.currentTarget.dataset.value;
    if (!value || value === this.data.form.cycle) return;
    const apply = () => this.setData({ 'form.cycle': value, 'errors.cycle': '' });
    if (this.data.mode !== 'edit') {
      apply();
      return;
    }
    confirmReset().then((ok) => {
      if (ok) apply();
    });
  },

  commitCycleCount(next, previous) {
    const apply = () => this.setData({ 'form.cycleCount': next, 'errors.cycleCount': '' });
    const revert = () => this.setData({ 'form.cycleCount': previous });
    const leavingOrigin = this.data.mode === 'edit'
      && previous === this.originCycleCount
      && next !== this.originCycleCount;
    if (!leavingOrigin) {
      apply();
      return 'ok';
    }
    if (this._resetting) return 'pending';
    this._resetting = true;
    confirmReset().then((ok) => {
      this._resetting = false;
      if (ok) apply();
      else revert();
    });
    return 'pending';
  },

  onCycleCount(event) {
    if (this.data.readonly || this._resetting) return;
    const current = clampCycleCount(this.data.form.cycleCount);
    const delta = Number(event.currentTarget.dataset.delta);
    const next = clampCycleCount(current + delta);
    if (!next || next === current) return;
    this._cycleDraft = null;
    this.commitCycleCount(next, current);
  },

  onCycleCountInput(event) {
    this._cycleDraft = event.detail.value;
  },

  onCycleCountBlur(event) {
    if (this.data.readonly) return 'invalid';
    this._cycleDraft = null;
    const previous = clampCycleCount(this.data.form.cycleCount) || 1;
    const raw = String(event.detail.value || '').trim();
    const parsed = parseInt(raw, 10);
    if (!raw || !Number.isInteger(parsed) || parsed < 1 || parsed > CYCLE_COUNT_MAX) {
      this.setData({
        'form.cycleCount': previous,
        'errors.cycleCount': `请填写 1 到 ${CYCLE_COUNT_MAX} 的单次周期打卡总数`,
      });
      return 'invalid';
    }
    if (parsed === previous) {
      this.setData({ 'form.cycleCount': previous, 'errors.cycleCount': '' });
      return 'ok';
    }
    return this.commitCycleCount(parsed, previous);
  },

  onOpenTime() {
    if (this.data.readonly) return;
    const open = () => {
      const current = datetime.parseDateTime(this.data.form.deadline) || new Date();
      const built = datetime.buildColumns(current);
      this._dayCount = built.dayCount;
      this._timeDraft = built.values;
      this.setData({ showTime: true, timeColumns: built.columns });
    };
    if (this.data.mode !== 'edit') {
      open();
      return;
    }
    confirmReset().then((ok) => {
      if (ok) open();
    });
  },

  onCloseTime() {
    this.setData({ showTime: false });
  },

  onOpenCheckTime(event) {
    if (this.data.readonly) return;
    const edge = event.currentTarget.dataset.edge === 'end' ? 'end' : 'start';
    const current = edge === 'end' ? this.data.form.checkEnd : this.data.form.checkStart;
    const fallback = edge === 'end' ? DEFAULT_CHECK_END : DEFAULT_CHECK_START;
    const built = datetime.buildTimeColumns(current || fallback);
    this._clockEdge = edge;
    this._clockDraft = built.values;
    this.setData({
      showClock: true,
      clockTitle: edge === 'end' ? '选择结束时间' : '选择开始时间',
      clockColumns: built.columns,
    });
  },

  onCloseClock() {
    this.setData({ showClock: false });
  },

  onClockConfirm() {
    const picker = this.selectComponent('#clockPicker');
    const live = picker && picker.getValues ? picker.getValues() : null;
    const clock = datetime.formatClock(live) || datetime.formatClock(this._clockDraft);
    if (!clock) {
      this.setData({ 'errors.checkTime': '请选择打卡时间' });
      return;
    }
    const edge = this._clockEdge === 'end' ? 'end' : 'start';
    const form = this.data.form;
    const checkStart = edge === 'start' ? clock : form.checkStart;
    const checkEnd = edge === 'end' ? clock : form.checkEnd;
    const invalid = !!(checkStart && checkEnd && checkStart >= checkEnd);
    this.setData({
      showClock: false,
      'form.checkStart': checkStart,
      'form.checkEnd': checkEnd,
      'errors.checkTime': invalid ? '开始时间须早于结束时间' : '',
    });
  },

  onClearCheckTime() {
    if (this.data.readonly) return;
    this.setData({
      'form.checkStart': '',
      'form.checkEnd': '',
      'errors.checkTime': '',
    });
  },

  onTimeChange(event) {
    if (this._timeLock) return;
    const values = event.detail.value;
    if (!Array.isArray(values) || values.length < 3) return;
    const year = Number(values[0]);
    const month = Number(values[1]);
    if (!Number.isInteger(year) || year < 1000 || month < 1 || month > 12) return;
    const dim = datetime.daysInMonth(year, month);
    const days = datetime.dayValues(dim);
    let day = Number(values[2]);
    if (!day || day > dim) day = dim;
    this._timeDraft = [String(year), datetime.pad(month), datetime.pad(day)];
    const picker = event.detail.picker;
    if (picker && this._dayCount !== dim) {
      this._dayCount = dim;
      this._timeLock = true;
      picker.setColumnValues(2, days, false).then(() => {
        if (Number(values[2]) > dim) return picker.setColumnValue(2, datetime.pad(day));
        return null;
      }).then(() => {
        this._timeLock = false;
      }).catch(() => {
        this._timeLock = false;
      });
    }
  },

  onTimeConfirm() {
    const picker = this.selectComponent('#timePicker');
    const live = picker && picker.getValues ? picker.getValues() : null;
    const deadline = datetime.completeDay(live, 'end') || datetime.completeDay(this._timeDraft, 'end');
    if (!datetime.parseDateTime(deadline)) {
      this.setData({ 'errors.deadline': '请选择截止时间' });
      return;
    }
    if (deadlineTooEarly(deadline)) {
      this.setData({ 'errors.deadline': '截止时间不能小于当前时间' });
      wx.showToast({ title: '截止时间不能小于当前时间', icon: 'none' });
      return;
    }
    this.setData({
      showTime: false,
      'form.deadline': deadline,
      'errors.deadline': '',
    });
  },

  onOpenTag() {
    if (this.data.readonly) return;
    api.listTags().then((tags) => {
      const tagOptions = [{ id: '', text: '不关联' }].concat(
        tags.map((tag) => ({ id: tag.id, text: `${tag.type} / ${tag.name}` })),
      );
      const sheetHeight = Math.min(Math.max(tagOptions.length, 1) * 104, 624);
      this.setData({
        showTag: true,
        tagOptions,
        draftTagId: this.data.form.tagId || '',
        sheetHeight,
      });
    }).catch((error) => {
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '标签加载失败', icon: 'none' });
    });
  },

  onCloseTag() {
    this.setData({ showTag: false });
  },

  onPickTag(event) {
    this.setData({ draftTagId: event.currentTarget.dataset.id || '' });
  },

  onTagConfirm() {
    const picked = this.data.tagOptions.find((item) => item.id === this.data.draftTagId);
    this.setData({
      showTag: false,
      'form.tagId': this.data.draftTagId,
      tagText: picked && picked.id ? picked.text : '',
      'errors.tag': '',
    });
  },

  noop() {},

  onSave() {
    if (this.saving || this.data.readonly || this._resetting) return;
    if (this._cycleDraft != null) {
      const result = this.onCycleCountBlur({ detail: { value: this._cycleDraft } });
      if (result !== 'ok') return;
    }
    const form = this.data.form;
    const deadlineChanged = this.data.mode === 'create' || form.deadline !== this.originDeadline;
    if (deadlineChanged && deadlineTooEarly(form.deadline)) {
      this.setData({ 'errors.deadline': '截止时间不能小于当前时间' });
      wx.showToast({ title: '截止时间不能小于当前时间', icon: 'none' });
      return;
    }
    this.saving = true;
    api.savePlan({
      id: this.planId,
      name: form.name,
      remark: this._remark != null ? this._remark : form.remark,
      deadline: form.deadline,
      cycle: form.cycle,
      cycleCount: form.cycleCount,
      checkStart: form.checkStart,
      checkEnd: form.checkEnd,
      tagId: form.tagId,
    }).then((result) => {
      if (!result.ok) {
        this.setData({ errors: result.errors });
        return;
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    }).catch((error) => {
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }).then(() => {
      this.saving = false;
    });
  },
});
