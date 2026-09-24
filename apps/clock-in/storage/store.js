/**
 * 0.1 本地数据。计划、标签、昵称都在本机，不申请微信头像和昵称。
 */
const { DEFAULT_NICKNAME } = require('../utils/plan');

const KEY = 'clock_in_v01';

function emptyState() {
  return {
    nickname: DEFAULT_NICKNAME,
    plans: [],
    tags: [],
  };
}

function read() {
  let raw = null;
  try {
    raw = wx.getStorageSync(KEY);
  } catch (e) {
    raw = null;
  }
  if (!raw || typeof raw !== 'object') return emptyState();
  return {
    nickname: typeof raw.nickname === 'string' && raw.nickname.trim() ? raw.nickname : DEFAULT_NICKNAME,
    plans: Array.isArray(raw.plans) ? raw.plans : [],
    tags: Array.isArray(raw.tags) ? raw.tags : [],
  };
}

function write(state) {
  wx.setStorageSync(KEY, state);
}

function update(mutator) {
  const state = read();
  mutator(state);
  write(state);
  return state;
}

module.exports = {
  KEY,
  emptyState,
  read,
  write,
  update,
};
