/**
 * 标签管理：预设（可隐藏）与自定义（可增删改）统一呈现
 */
const api = require('../../../api/index');

Page({
  data: {
    presets: [],
    customs: [],
    hiddenPresets: [],
    name: '',
    editId: '',
    editName: '',
    showEdit: false,
  },

  onShow() {
    this.refresh();
  },

  async refresh() {
    const tags = await api.listTags();
    const all = api.PRESET_TAGS || [];
    const presetsActive = tags.filter((t) => t.type === 'preset');
    const presetIds = new Set(presetsActive.map((t) => t.id));
    const hiddenPresets = all.filter((t) => !presetIds.has(t.id));
    const customs = tags.filter((t) => t.type === 'custom');
    this.setData({ presets: presetsActive, customs, hiddenPresets });
  },

  onName(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ name: v });
  },

  async onAdd() {
    const n = (this.data.name || '').trim();
    if (!n) return;
    try {
      await api.createCustomTag(n);
      this.setData({ name: '' });
      wx.showToast({ title: '已添加', icon: 'success' });
      this.refresh();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
    }
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    if (!id) return;
    const tip =
      type === 'preset'
        ? '删除后可在本页底部「隐藏的预设」中恢复。'
        : '已关联该标签的目标将解除关联，统计同步移除。';
    wx.showModal({
      title: '删除标签',
      content: tip,
      success: async (r) => {
        if (!r.confirm) return;
        try {
          await api.deleteTag(id);
          wx.showToast({ title: '已删除', icon: 'none' });
          this.refresh();
        } catch (err) {
          wx.showToast({ title: '失败', icon: 'none' });
        }
      },
    });
  },

  async onRestore(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    try {
      await api.restorePresetTag(id);
      this.refresh();
    } catch (err) {
      wx.showToast({ title: '失败', icon: 'none' });
    }
  },

  onRename(e) {
    const id = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name || '';
    this.setData({ editId: id, editName: name, showEdit: true });
  },

  onEditNameInput(e) {
    const v = typeof e.detail === 'string' ? e.detail : (e.detail && e.detail.value) || '';
    this.setData({ editName: v });
  },

  onEditCancel() {
    this.setData({ showEdit: false, editId: '', editName: '' });
  },

  async onEditConfirm() {
    const name = (this.data.editName || '').trim();
    if (!name) {
      wx.showToast({ title: '请输入名称', icon: 'none' });
      return;
    }
    try {
      await api.updateTag(this.data.editId, name);
      this.setData({ showEdit: false, editId: '', editName: '' });
      wx.showToast({ title: '已更新', icon: 'success' });
      this.refresh();
    } catch (e) {
      wx.showToast({ title: (e && e.message) || '失败', icon: 'none' });
    }
  },
});
