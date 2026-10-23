const api = require('../../api/index');
const auth = require('../../utils/auth');

Page({
  data: {
    form: {
      type: '',
      newType: '',
      name: '',
    },
    errors: {},
    editing: false,
    types: [],
    showTypes: false,
    /** 仅新增标签时可选；选中后才允许填写新建类型 */
    creatingType: false,
  },

  onLoad(query) {
    if (!auth.ensureLogin()) return;
    this.tagId = query.id || '';
    const editing = !!this.tagId;
    this.setData({ editing });
    wx.setNavigationBarTitle({ title: editing ? '编辑标签' : '新增标签' });
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
      if (auth.isAccountDisabled(error)) return;
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onToggleTypes() {
    if (this.data.showTypes) {
      this.setData({ showTypes: false });
      return;
    }
    if (this.loadingTypes) return;
    this.loadingTypes = true;
    wx.showLoading({ title: '加载中', mask: true });
    api.listTagTypes().then((types) => {
      wx.hideLoading();
      if (!types.length && this.data.editing) {
        this.setData({ types: [], showTypes: false });
        this.toast('还没有已有类型');
        return;
      }
      this.setData({ types, showTypes: true });
    }).catch((error) => {
      wx.hideLoading();
      if (auth.isAccountDisabled(error)) return;
      this.toast(error.message || '类型加载失败');
    }).then(() => {
      this.loadingTypes = false;
    });
  },

  toast(title) {
    setTimeout(() => {
      wx.showToast({ title, icon: 'none' });
    }, 120);
  },

  onSelectType(event) {
    const creatingType = !this.data.editing && event.currentTarget.dataset.action === 'create';
    if (creatingType) {
      this.setData({
        creatingType: true,
        'form.type': '',
        showTypes: false,
        'errors.type': '',
      });
      return;
    }
    this.setData({
      creatingType: false,
      'form.type': event.currentTarget.dataset.type || '',
      'form.newType': '',
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
    const creatingType = this.data.creatingType;
    if (creatingType && !(form.newType || '').trim()) {
      this.setData({ errors: { type: '请输入新类型' }, showTypes: false });
      this.saving = false;
      return;
    }
    api.saveTag({
      id: this.tagId,
      type: creatingType ? '' : form.type,
      newType: creatingType ? form.newType : '',
      name: form.name,
    }).then((result) => {
      if (!result.ok) {
        this.setData({ errors: result.errors, showTypes: false });
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
