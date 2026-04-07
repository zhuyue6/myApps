/**
 * 本地存储：解压币、解锁、设置、每日登录、游玩时长
 * 无服务端时全部 wx.storage，合规且零压力
 */

const { TOYS, SCENES, PLAY_REWARD_MS, PLAY_REWARD_COINS, BALL_COLORS } = require('./constants');

const KEYS = {
  INITED: 'nnl_inited',
  COINS: 'nnl_coins',
  UNLOCK_TOYS: 'nnl_unlock_toys',
  UNLOCK_SCENES: 'nnl_unlock_scenes',
  UNLOCK_COLORS: 'nnl_unlock_colors',
  CURRENT_COLOR: 'nnl_ball_color',
  SETTINGS: 'nnl_settings',
  LAST_LOGIN_DAY: 'nnl_last_login_day',
  REWARD_ACCUM_MS: 'nnl_reward_accum_ms',
  LAST_PLAY_REWARD_AT: 'nnl_last_play_reward',
  TOTAL_PLAY_MS: 'nnl_total_play_ms',
  CHALLENGE_HS: 'nnl_challenge_hs',
  CHALLENGE_CONS: 'nnl_challenge_cons',
};

const DEFAULT_SETTINGS = {
  soundOn: true,
  musicOn: true,
  vibrateOn: true,
  quality: 'smooth',
};

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * 首次打开写入默认值：送初始币、解锁免费款
 */
function initUserDataIfNeeded() {
  if (wx.getStorageSync(KEYS.INITED)) return;
  wx.setStorageSync(KEYS.INITED, true);
  wx.setStorageSync(KEYS.COINS, 50);
  const freeToys = TOYS.filter((t) => t.unlockPrice === 0).map((t) => t.id);
  wx.setStorageSync(KEYS.UNLOCK_TOYS, freeToys);
  const freeScenes = SCENES.filter((s) => s.unlockPrice === 0).map((s) => s.id);
  wx.setStorageSync(KEYS.UNLOCK_SCENES, freeScenes);
  wx.setStorageSync(KEYS.SETTINGS, { ...DEFAULT_SETTINGS });
  // 默认解锁玫瑰粉配色
  const freeColors = BALL_COLORS.filter((c) => c.unlockConsecutive === 0).map((c) => c.id);
  wx.setStorageSync(KEYS.UNLOCK_COLORS, freeColors);
}

/** 每日登录 +10 解压币 */
function grantDailyLoginCoins() {
  const today = getTodayStr();
  const last = wx.getStorageSync(KEYS.LAST_LOGIN_DAY);
  if (last === today) return;
  wx.setStorageSync(KEYS.LAST_LOGIN_DAY, today);
  addCoins(10);
}

function getCoins() {
  const v = wx.getStorageSync(KEYS.COINS);
  return typeof v === 'number' ? v : Number(v) || 0;
}

function addCoins(n) {
  const next = getCoins() + n;
  wx.setStorageSync(KEYS.COINS, next);
  return next;
}

function spendCoins(n) {
  const cur = getCoins();
  if (cur < n) return false;
  wx.setStorageSync(KEYS.COINS, cur - n);
  return true;
}

function getUnlockedToyIds() {
  return wx.getStorageSync(KEYS.UNLOCK_TOYS) || [];
}

function getUnlockedSceneIds() {
  return wx.getStorageSync(KEYS.UNLOCK_SCENES) || [];
}

function unlockToy(id) {
  const list = getUnlockedToyIds();
  if (list.indexOf(id) >= 0) return true;
  list.push(id);
  wx.setStorageSync(KEYS.UNLOCK_TOYS, list);
  return true;
}

function unlockScene(id) {
  const list = getUnlockedSceneIds();
  if (list.indexOf(id) >= 0) return true;
  list.push(id);
  wx.setStorageSync(KEYS.UNLOCK_SCENES, list);
  return true;
}

function isToyUnlocked(id) {
  return getUnlockedToyIds().indexOf(id) >= 0;
}

function isSceneUnlocked(id) {
  return getUnlockedSceneIds().indexOf(id) >= 0;
}

function getSettings() {
  const s = wx.getStorageSync(KEYS.SETTINGS);
  return { ...DEFAULT_SETTINGS, ...(s || {}) };
}

function setSettings(partial) {
  const cur = getSettings();
  const next = { ...cur, ...partial };
  wx.setStorageSync(KEYS.SETTINGS, next);
  return next;
}

/**
 * 玩耍页 onHide 时写入本次停留时长，用于累计「放松时长」奖励
 * @param {number} ms
 */
function appendPlayRewardAccumMs(ms) {
  if (!ms || ms < 0) return;
  const cur = Number(wx.getStorageSync(KEYS.REWARD_ACCUM_MS)) || 0;
  wx.setStorageSync(KEYS.REWARD_ACCUM_MS, cur + ms);
}

/**
 * 定时调用：累计在玩耍页满约 5 分钟，且距上次发奖间隔足够时 +5 币
 */
function tryGrantPlayTimeReward() {
  const accum = Number(wx.getStorageSync(KEYS.REWARD_ACCUM_MS)) || 0;
  if (accum < PLAY_REWARD_MS) return 0;
  const lastReward = wx.getStorageSync(KEYS.LAST_PLAY_REWARD_AT) || 0;
  if (Date.now() - lastReward < PLAY_REWARD_MS) return 0;
  wx.setStorageSync(KEYS.LAST_PLAY_REWARD_AT, Date.now());
  wx.setStorageSync(KEYS.REWARD_ACCUM_MS, accum - PLAY_REWARD_MS);
  addCoins(PLAY_REWARD_COINS);
  return PLAY_REWARD_COINS;
}

function addTotalPlayMs(ms) {
  const t = Number(wx.getStorageSync(KEYS.TOTAL_PLAY_MS)) || 0;
  wx.setStorageSync(KEYS.TOTAL_PLAY_MS, t + ms);
}

function getTotalPlayMs() {
  return Number(wx.getStorageSync(KEYS.TOTAL_PLAY_MS)) || 0;
}

// ─── 球体配色 ────────────────────────────────────────────────

function getUnlockedBallColorIds() {
  const v = wx.getStorageSync(KEYS.UNLOCK_COLORS);
  return Array.isArray(v) && v.length ? v : ['pink'];
}

function unlockBallColor(id) {
  const list = getUnlockedBallColorIds();
  if (list.indexOf(id) < 0) {
    list.push(id);
    wx.setStorageSync(KEYS.UNLOCK_COLORS, list);
  }
}

function isBallColorUnlocked(id) {
  return getUnlockedBallColorIds().indexOf(id) >= 0;
}

function getCurrentBallColor() {
  return wx.getStorageSync(KEYS.CURRENT_COLOR) || 'pink';
}

function setCurrentBallColor(id) {
  wx.setStorageSync(KEYS.CURRENT_COLOR, id);
}

// ─── 挑战关卡 ────────────────────────────────────────────────

function getChallengeHighScore() {
  return Number(wx.getStorageSync(KEYS.CHALLENGE_HS)) || 0;
}

function setChallengeHighScore(n) {
  wx.setStorageSync(KEYS.CHALLENGE_HS, n);
}

function getChallengeConsecutive() {
  return Number(wx.getStorageSync(KEYS.CHALLENGE_CONS)) || 0;
}

function setChallengeConsecutive(n) {
  wx.setStorageSync(KEYS.CHALLENGE_CONS, n);
}

module.exports = {
  KEYS,
  initUserDataIfNeeded,
  grantDailyLoginCoins,
  getCoins,
  addCoins,
  spendCoins,
  getUnlockedToyIds,
  getUnlockedSceneIds,
  unlockToy,
  unlockScene,
  isToyUnlocked,
  isSceneUnlocked,
  getSettings,
  setSettings,
  appendPlayRewardAccumMs,
  tryGrantPlayTimeReward,
  addTotalPlayMs,
  getTotalPlayMs,
  getUnlockedBallColorIds,
  unlockBallColor,
  isBallColorUnlocked,
  getCurrentBallColor,
  setCurrentBallColor,
  getChallengeHighScore,
  setChallengeHighScore,
  getChallengeConsecutive,
  setChallengeConsecutive,
};
