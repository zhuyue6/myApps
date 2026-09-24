const api = require('../../api/index');

Page({
  data: {
    form: {
      type: '',
      newType: '',
      name: '',
    },
    errors: {},
    types: [],
    showTypes: false,
    newTypePlaceholder: '没有合适的类型时，在这里输入',
  },

  onLoad(query) {
    this.tagId = query.id || '';
    const editing = !!this.tagId;
    wx.setNavigationBarTitle({ title: editing ? '编辑标签' : '新增标签' });
    this.setData({
      newTypePlaceholder: editing ? '要改成新类型时再填写' : '没有合适的类型时，在这里输入',
    });
    if (!editing) return;
    api.getTag(this.tagId).then((tag) => {
      if (!tag) {
        wx.showToast({ title: '标签不存在', icon: 'none' });
        setTimeout(() => wx.navigateBack(), 400);
        return;
      }
      this.setData({
        'form.type': tag.type,
        'form.name': tag.name,
      });
    }).catch((error) => {
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onShow() {
    api.listTagTypes().then((types) => {
      this.setData({ types });
    }).catch(() => {});
  },

  onToggleTypes() {
    if (!this.data.types.length) {
      wx.showToast({ title: '还没有已有类型，请在下方输入', icon: 'none' });
      return;
    }
    this.setData({ showTypes: !this.data.showTypes });
  },

  onSelectType(event) {
    const type = event.currentTarget.dataset.type || '';
    this.setData({
      'form.type': type,
      showTypes: false,
      'errors.type': '',
    });
  },

  onNewType(event) {
    this.setData({ 'form.newType': event.detail.value, 'errors.type': '' });
  },

  onName(event) {
    this.setData({ 'form.name': event.detail.value, 'errors.name': '' });
  },

  onSave() {
    if (this.saving) return;
    this.saving = true;
    const form = this.data.form;
    api.saveTag({
      id: this.tagId,
      type: form.type,
      newType: form.newType,
      name: form.name,
    }).then((result) => {
      if (!result.ok) {
        this.setData({ errors: result.errors, showTypes: false });
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
