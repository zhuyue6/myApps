const api = require('../../api/index');
const auth = require('../../utils/auth');

const MAX_AVATAR_BYTES = 1024 * 1024;

function setTab(page, hidden) {
  const bar = typeof page.getTabBar === 'function' ? page.getTabBar() : null;
  if (bar) bar.setData({ selected: 2, hidden: !!hidden });
}

function isCancel(error) {
  const message = (error && (error.errMsg || error.message)) || '';
  return /cancel/i.test(message);
}

function errorText(error, fallback) {
  if (!error) return fallback;
  if (error.message) return error.message;
  const raw = error.errMsg || '';
  if (/privacy/i.test(raw)) return '请先同意隐私协议，再选择图片';
  return fallback;
}

function pickImage() {
  return new Promise((resolve, reject) => {
    if (wx.chooseMedia) {
      wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success(res) {
          const file = res.tempFiles && res.tempFiles[0];
          if (!file || !file.tempFilePath) {
            reject(new Error('没有选择图片'));
            return;
          }
          resolve(file.tempFilePath);
        },
        fail: reject,
      });
      return;
    }
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const path = res.tempFilePaths && res.tempFilePaths[0];
        if (!path) {
          reject(new Error('没有选择图片'));
          return;
        }
        resolve(path);
      },
      fail: reject,
    });
  });
}

function readSize(path) {
  return new Promise((resolve) => {
    wx.getFileInfo({
      filePath: path,
      success(res) {
        resolve(res.size || 0);
      },
      fail() {
        resolve(0);
      },
    });
  });
}

function prepareImage(path) {
  return readSize(path).then((size) => {
    if (!size || size <= MAX_AVATAR_BYTES || !wx.compressImage) return path;
    return new Promise((resolve) => {
      wx.compressImage({
        src: path,
        quality: 60,
        success(res) {
          resolve((res && res.tempFilePath) || path);
        },
        fail() {
          resolve(path);
        },
      });
    }).then((next) => readSize(next).then((nextSize) => {
      if (nextSize > MAX_AVATAR_BYTES) {
        return Promise.reject(new Error('图片太大，请换一张较小的图片'));
      }
      return next;
    }));
  });
}

Page({
  data: {
    loggedIn: false,
    nickname: '',
    avatarUrl: '',
    ongoing: 0,
    completed: 0,
    expired: 0,
  },

  onShow() {
    setTab(this, false);
    if (!auth.ensureLogin()) {
      this.setData({
        loggedIn: false,
        nickname: '',
        avatarUrl: '',
        ongoing: 0,
        completed: 0,
        expired: 0,
      });
      return;
    }
    if (this.uploading) return;
    this.load();
  },

  load() {
    const seq = (this.loadSeq = (this.loadSeq || 0) + 1);
    return api.getProfile().then((profile) => {
      if (seq !== this.loadSeq) return;
      if (!profile.loggedIn) {
        auth.goLogin({ redirect: '/pages/mine/mine' });
        this.setData({
          loggedIn: false,
          nickname: '',
          avatarUrl: '',
          ongoing: 0,
          completed: 0,
          expired: 0,
        });
        return;
      }
      this.setData({
        loggedIn: true,
        nickname: profile.nickname,
        avatarUrl: profile.avatarUrl || '',
        ongoing: profile.ongoing,
        completed: profile.completed,
        expired: profile.expired,
      });
    }).catch((error) => {
      if (seq !== this.loadSeq) return;
      if (auth.isAccountDisabled(error)) {
        this.setData({
          loggedIn: false,
          nickname: '',
          avatarUrl: '',
          ongoing: 0,
          completed: 0,
          expired: 0,
        });
        return;
      }
      const needLogin = /登录/.test(error.message || '');
      this.setData({
        loggedIn: false,
        nickname: '',
        avatarUrl: '',
        ongoing: 0,
        completed: 0,
        expired: 0,
      });
      if (needLogin) {
        auth.goLogin({ redirect: '/pages/mine/mine' });
        return;
      }
      wx.showToast({ title: error.message || '加载失败', icon: 'none' });
    });
  },

  onAvatarError() {
    if (this.uploading) return;
    if (this.data.avatarUrl) this.setData({ avatarUrl: '' });
  },

  onChooseAvatar() {
    if (this.uploading) return;
    pickImage().then((path) => prepareImage(path)).then((path) => {
      if (this.uploading) return;
      this.uploading = true;
      this.loadSeq = (this.loadSeq || 0) + 1;
      const previous = this.data.avatarUrl;
      this.setData({ avatarUrl: path });
      wx.showLoading({ title: '上传中', mask: true });
      api.backend.uploadAvatar(path).then((relative) => {
        this.setData({ avatarUrl: api.backend.resolveAvatarUrl(relative) });
        wx.hideLoading({
          complete: () => {
            this.uploading = false;
            wx.showToast({ title: '头像已更新', icon: 'success' });
          },
        });
      }).catch((error) => {
        this.setData({ avatarUrl: previous });
        wx.hideLoading({
          complete: () => {
            this.uploading = false;
            if (auth.isAccountDisabled(error)) return;
            wx.showToast({ title: errorText(error, '上传失败'), icon: 'none' });
          },
        });
      });
    }).catch((error) => {
      if (isCancel(error)) return;
      wx.showToast({ title: errorText(error, '无法打开相册或相机'), icon: 'none' });
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录？',
      content: '退出后需要重新登录才能查看计划和标签。',
      confirmText: '退出',
      confirmColor: '#d9655b',
      cancelText: '取消',
      success: (res) => {
        if (!res.confirm) return;
        api.backend.logout().catch(() => {}).then(() => {
          this.setData({
            loggedIn: false,
            nickname: '',
            avatarUrl: '',
            ongoing: 0,
            completed: 0,
            expired: 0,
          });
          auth.goLogin({ redirect: '/pages/mine/mine' });
        });
      },
    });
  },
});
