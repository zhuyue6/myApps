/**
 * 挑战页：本地记录、配色解锁进度、入口说明（无排行榜）
 */
const { BALL_COLORS } = require('../../utils/constants');
const storage = require('../../utils/storage');

Page({
  data: {
    highScore: 0,
    consecutive: 0,
    playMinutes: 0,
    colorList: [],
  },

  onShow() {
    this.load();
  },

  load() {
    const colorList = BALL_COLORS.map((c) => ({
      ...c,
      unlocked: storage.isBallColorUnlocked(c.id),
    }));
    const ms = storage.getTotalPlayMs();
    const playMinutes = Math.max(0, Math.round(ms / 60000));
    this.setData({
      highScore: storage.getChallengeHighScore(),
      consecutive: storage.getChallengeConsecutive(),
      playMinutes,
      colorList,
    });
  },

  goPlay() {
    wx.reLaunch({ url: '/pages/index/index?startChallenge=1' });
  },
});
