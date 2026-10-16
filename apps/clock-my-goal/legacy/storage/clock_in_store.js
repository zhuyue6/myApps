/**
 * 本地存储读写：聚合状态 JSON，便于整体迁移与后续替换为接口返回
 */

const KEY = 'clock_in_state_v1';

/** @returns {object} */
function readState() {
  try {
    const raw = wx.getStorageSync(KEY);
    if (!raw) return defaultState();
    if (typeof raw === 'string') return JSON.parse(raw);
    return raw && typeof raw === 'object' ? raw : defaultState();
  } catch (e) {
    return defaultState();
  }
}

/** @param {object} state */
function writeState(state) {
  try {
    wx.setStorageSync(KEY, state);
  } catch (e) {
    console.error('writeState', e);
  }
}

function defaultState() {
  return {
    version: 2,
    onboarding: {
      welcomeDone: false,
      tagsSelected: false,
      mainGoalCreated: false,
      subGoalCreated: false,
      linkDone: false,
      guideDone: false,
      firstGoalCreated: false,
      /** @type {string[]} 选中的预设标签 id */
      presetTagIds: [],
    },
    /** @type {object[]} */
    tags: [],
    /** @type {string[]} 用户删除的预设标签 id */
    hiddenPresetTagIds: [],
    /** @type {object[]} */
    goals: [],
    /** @type {object[]} */
    checkIns: [],
    /** @type {object[]} */
    feedbacks: [],
    /** @type {object[]} */
    pendingPopups: [],
    settings: {
      reminderAuthorized: false,
      makeupPerGoalCap: 30,
    },
    achievementsUnlocked: [],
    meta: { createdAt: Date.now() },
  };
}

module.exports = {
  KEY,
  readState,
  writeState,
  defaultState,
};
