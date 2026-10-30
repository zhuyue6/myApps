const api = require('../../api/index');
const auth = require('../../utils/auth');
const datetime = require('../../utils/datetime');
const { CYCLES } = require('../../utils/plan');

const RESET_TIP = '周期或截止时间有变化，则重置打卡周期！';

function emptyForm() {
  return {
    name: '',
    remark: '',
    deadline: '',
    cycle: '',
    tagId: '',
  };
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
      if (readonly) wx.setNavigationBarTitle({ title: '查看打卡' });
      this.setData({
        readonly,
        form: {
          name: plan.name,
          remark: plan.remark || '',
          deadline: plan.deadline,
          cycle: plan.cycle,
          tagId: plan.tagId || '',
        },
        tagText: plan.tagText,
        remarkLen: (plan.remark || '').length,
        targetCount: plan.targetCount,
        checkedCount: plan.checkedCount,
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
    if (this.saving || this.data.readonly) return;
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
