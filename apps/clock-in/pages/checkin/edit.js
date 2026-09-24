const api = require('../../api/index');
const datetime = require('../../utils/datetime');
const { CYCLES, resolveStatus, STATUS_TEXT, STATUS_HELP, parseTargetCount } = require('../../utils/plan');

function emptyForm() {
  return {
    name: '',
    deadline: '',
    cycle: '',
    targetCount: '',
    tagId: '',
  };
}

Page({
  data: {
    mode: 'create',
    form: emptyForm(),
    errors: {},
    cycles: CYCLES,
    tagText: '',
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
    this.planId = query.id || '';
    const mode = this.planId ? 'edit' : 'create';
    this.setData({ mode });
    wx.setNavigationBarTitle({ title: mode === 'edit' ? '编辑打卡' : '新增打卡' });
    if (mode === 'create') return;
    api.getPlan(this.planId).then((plan) => {
      if (!plan) {
        wx.showToast({ title: '计划不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({
        form: {
          name: plan.name,
          deadline: plan.deadline,
          cycle: plan.cycle,
          targetCount: String(plan.targetCount),
          tagId: plan.tagId || '',
        },
        tagText: plan.tagText,
        checkedCount: plan.checkedCount,
        createdAt: plan.createdAt,
        statusText: plan.statusText,
        statusHelp: plan.statusHelp,
      });
    }).catch((error) => {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onName(event) {
    this.setData({ 'form.name': event.detail.value, 'errors.name': '' });
  },

  onTarget(event) {
    const targetCount = event.detail.value;
    this.setData({ 'form.targetCount': targetCount, 'errors.targetCount': '' });
    this.refreshStatus({ targetCount });
  },

  onCycle(event) {
    this.setData({ 'form.cycle': event.currentTarget.dataset.value, 'errors.cycle': '' });
  },

  onOpenTime() {
    const current = datetime.parseDateTime(this.data.form.deadline) || new Date();
    const built = datetime.buildColumns(current);
    this._dayCount = built.dayCount;
    this._timeDraft = built.values;
    this.setData({ showTime: true, timeColumns: built.columns });
  },

  onCloseTime() {
    this.setData({ showTime: false });
  },

  onTimeChange(event) {
    if (this._timeLock) return;
    const values = event.detail.value || [];
    if (values.length < 6) return;
    const year = Number(values[0]);
    const month = Number(values[1]);
    const dim = datetime.daysInMonth(year, month);
    const days = datetime.dayValues(dim);
    let day = values[2];
    if (Number(day) > dim) day = datetime.pad(dim);
    const next = [values[0], values[1], day, values[3], values[4], values[5]];
    this._timeDraft = next;
    const picker = event.detail.picker;
    if (picker && this._dayCount !== dim) {
      this._dayCount = dim;
      this._timeLock = true;
      picker.setColumnValues(2, days, false).then(() => {
        if (Number(values[2]) > dim) return picker.setColumnValue(2, day);
        return null;
      }).then(() => {
        this._timeLock = false;
      }).catch(() => {
        this._timeLock = false;
      });
    }
  },

  onTimeConfirm() {
    const deadline = datetime.joinDateTime(this._timeDraft);
    if (!datetime.parseDateTime(deadline)) {
      this.setData({ 'errors.deadline': '请选择截止时间' });
      return;
    }
    this.setData({
      showTime: false,
      'form.deadline': deadline,
      'errors.deadline': '',
    });
    this.refreshStatus({ deadline });
  },

  refreshStatus(partial) {
    if (this.data.mode !== 'edit') return;
    const form = { ...this.data.form, ...(partial || {}) };
    const targetCount = parseTargetCount(form.targetCount);
    if (targetCount == null) return;
    const status = resolveStatus({
      checkedCount: this.data.checkedCount,
      targetCount,
      deadline: form.deadline,
    }, new Date());
    this.setData({
      statusText: STATUS_TEXT[status],
      statusHelp: STATUS_HELP[status],
    });
  },

  onOpenTag() {
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
    if (this.saving) return;
    this.saving = true;
    const form = this.data.form;
    api.savePlan({
      id: this.planId,
      name: form.name,
      deadline: form.deadline,
      cycle: form.cycle,
      targetCount: form.targetCount,
      tagId: form.tagId,
    }).then((result) => {
      if (!result.ok) {
        this.setData({ errors: result.errors });
        return;
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 400);
    }).catch((error) => {
      wx.showToast({ title: error.message || '保存失败', icon: 'none' });
    }).then(() => {
      this.saving = false;
    });
  },
});
