/**
 * 解压球玩耍页
 * - 高精细 3D 解压球（CSS 多层渐变实现）
 * - 时长→形变：连续插值（smoothstep）；挑战判定仍为 8 档力度
 * - 球体周围动态环形力度计量光晕
 * - 力度挑战关卡模式
 */
const { SCENES, BALL_COLORS } = require('../../utils/constants');
const storage = require('../../utils/storage');
const audio = require('../../utils/audio');

// ─── 力度阈值（毫秒）8 档，四段边界与文档一致 ───────────────────
// 轻 1-2：<300ms 内按 150ms 二分
// 中 3-4：300–1000ms 按中点 650ms 二分
// 重 5-6：1000–2000ms 按中点 1500ms 二分
// 超 7-8：>2000ms 按 2500ms 二分（仅细分档位，不改变「>2s 超重」区间定义）
function msToLevel(ms) {
  if (ms < 150) return 1;
  if (ms < 300) return 2;
  if (ms < 650) return 3;
  if (ms < 1000) return 4;
  if (ms < 1500) return 5;
  if (ms < 2000) return 6;
  if (ms < 2500) return 7;
  return 8;
}

// ─── 连续形变：按压时长 → 0~1（用于插值，与 8 档判定独立）────────
const MAX_PRESS_MS = 3000;

/** 平滑进度，形变更顺滑 */
function smoothT(ms) {
  const x = Math.min(1, Math.max(0, ms / MAX_PRESS_MS));
  return x * x * (3 - 2 * x);
}

/** 球体连续形变（内联 transform + border-radius） */
function buildSquishStyle(t) {
  const sx = 1.038 + t * (1.22 - 1.038);
  const sy = 0.935 - t * (0.935 - 0.61);
  const u = t;
  const br = `${50 - u * 8}% ${50 - u * 8}% ${50 - u * 16}% ${50 - u * 16}% / ${51.8 + u * 5.2}% ${51.8 + u * 5.2}% ${48.2 - u * 5.2}% ${48.2 - u * 5.2}%`;
  return `transform:scaleX(${sx.toFixed(4)}) scaleY(${sy.toFixed(4)});border-radius:${br};`;
}

/** 光晕连续插值（尺寸 + hsla 色 + 发光） */
function buildHaloStyleT(t) {
  const s = 316 + t * (422 - 316);
  const h = 200 + t * 72;
  const l = 62 - t * 10;
  const a = 0.72 + t * 0.18;
  const c = `hsla(${h},88%,${l}%,${a})`;
  const g = 12 + t * 20;
  return `width:${s}rpx;height:${s}rpx;border-color:${c};box-shadow:0 0 ${g}px ${c},0 0 ${g * 2}px ${c};`;
}

// ─── 释放动画类（releasing-1 … releasing-8）──────────────────────
const RELEASE_CLASS = [
  '',
  'releasing-1',
  'releasing-2',
  'releasing-3',
  'releasing-4',
  'releasing-5',
  'releasing-6',
  'releasing-7',
  'releasing-8',
];

// ─── 震动类型 ──────────────────────────────────────────────────
const VIBRATE_TYPE = ['', 'light', 'light', 'medium', 'medium', 'medium', 'heavy', 'heavy', 'heavy'];

/** 篮球贴图外包络：仅立体阴影（贴图由 image 展示，配色仍可微调阴影） */
function buildBallShellStyle(color) {
  const { shadowRgb } = color;
  return `box-shadow:0 22rpx 52rpx rgba(${shadowRgb},0.44),0 7rpx 22rpx rgba(0,0,0,0.22),inset 0 -10rpx 20rpx rgba(0,0,0,0.12),inset 5rpx 5rpx 14rpx rgba(255,255,255,0.2);`;
}

const PRESSURE_LABELS = ['', '轻1', '轻2', '中1', '中2', '重1', '重2', '超1', '超2'];

/** 构建挑战压力条段落数据（8 段） */
function buildPressureSegs(target, currentLevel, result) {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((i) => ({
    val: i,
    label: PRESSURE_LABELS[i],
    isTarget: i === target,
    isActive: currentLevel >= i,
    isInTarget: i === target && currentLevel === i,
    isPerfect: result === 'perfect' && i === target,
    isGood: result === 'good' && Math.abs(i - target) <= 1,
  }));
}

Page({
  data: {
    // 球体外观
    ballColorId: 'pink',
    ballStyle: '',

    // 配色选择弹层
    colorSheetVisible: false,
    colorList: [],

    // 按压状态（形变为连续插值 squishStyle；pressureLevel 仍为 8 档供挑战条）
    pressureLevel: 0,
    pressing: false,
    squishStyle: '',
    releaseClass: '',

    // 力度光晕
    haloVisible: false,
    haloStyle: '',
    haloFlash: false,      // 命中目标区时闪烁白光

    // 超重波纹效果
    showWave: false,

    // 拖拽偏移
    offsetX: 0,
    offsetY: 0,

    // 场景
    sceneGradient: '',
    sceneParticles: 'curtain',
    sceneSheetVisible: false,
    sceneList: [],

    // 挑战模式
    challengeMode: false,
    challengeActive: false,
    challengeTarget: 4,
    challengeCountdownPct: 100,
    challengeCountdownSec: 5,
    challengeResult: '',
    challengeResultVisible: false,
    challengeConsecutive: 0,
    challengeHighScore: 0,
    challengeLevelNum: 1,
    pressureSegs: buildPressureSegs(4, 0, ''),

    // 提示
    toast: '',
    qualityClass: '',
  },

  // 内部计时器 / 状态
  _pressInterval: null,
  _challengeTimer: null,
  _releaseTimer: null,
  _rewardTimer: null,
  _startTime: 0,
  _touchStart: { x: 0, y: 0, ox: 0, oy: 0 },
  _playVisibleAt: 0,
  _pageEnterAt: 0,
  _challengeDurationMs: 5000,
  _challengeSubmitted: false,
  _pendingStartChallenge: false,
  /** 连续形变节流：避免同进度重复 setData */
  _lastSquishKey: -1,

  // ── 生命周期 ────────────────────────────────────────────────

  onLoad(options) {
    this._pageEnterAt = Date.now();
    this._pendingStartChallenge = !!(options && (options.startChallenge === '1' || options.startChallenge === 'true'));
    this._applyScene();
    this._loadBallColor();
    this._loadChallengeStats();
  },

  onShow() {
    this._playVisibleAt = Date.now();
    const settings = storage.getSettings();
    this.setData({ qualityClass: settings.quality === 'smooth' ? 'quality-smooth' : '' });
    this._startPlayRewardTimer();
    settings.musicOn ? audio.playBgm() : audio.stopBgm();
    this._loadChallengeStats();
    if (this._pendingStartChallenge) {
      this._pendingStartChallenge = false;
      this._bootstrapChallengeGameplay();
    }
  },

  onHide() {
    this._stopPlayRewardTimer();
    this._stopPressureTracking();
    this._stopChallengeCountdown();
    const delta = Date.now() - this._pageEnterAt;
    if (delta > 0) storage.addTotalPlayMs(delta);
    this._pageEnterAt = Date.now();
    const playDelta = Date.now() - this._playVisibleAt;
    if (playDelta > 0) storage.appendPlayRewardAccumMs(playDelta);
  },

  onUnload() {
    this._stopPlayRewardTimer();
    this._stopPressureTracking();
    this._stopChallengeCountdown();
    const playDelta = Date.now() - this._playVisibleAt;
    if (playDelta > 0) storage.appendPlayRewardAccumMs(playDelta);
    audio.stopBgm();
  },

  // ── 初始化 ──────────────────────────────────────────────────

  _applyScene() {
    const app = getApp();
    const sceneId = (app.globalData && app.globalData.currentSceneId) || 'bedroom';
    const scene = SCENES.find((s) => s.id === sceneId) || SCENES[0];
    this.setData({ sceneGradient: scene.gradient, sceneParticles: scene.particles });
  },

  _loadBallColor() {
    const colorId = storage.getCurrentBallColor();
    const color = BALL_COLORS.find((c) => c.id === colorId) || BALL_COLORS[0];
    this.setData({ ballColorId: color.id, ballStyle: buildBallShellStyle(color) });
  },

  _loadChallengeStats() {
    this.setData({
      challengeHighScore: storage.getChallengeHighScore(),
      challengeConsecutive: storage.getChallengeConsecutive(),
    });
  },

  // ── 配色管理 ────────────────────────────────────────────────

  openColorSheet() {
    const colorList = BALL_COLORS.map((c) => ({
      ...c,
      unlocked: storage.isBallColorUnlocked(c.id),
      isCurrent: c.id === this.data.ballColorId,
    }));
    this.setData({ colorList, colorSheetVisible: true, sceneSheetVisible: false });
  },

  onSelectColor(e) {
    const id = e.currentTarget.dataset.id;
    if (!storage.isBallColorUnlocked(id)) {
      const color = BALL_COLORS.find((c) => c.id === id);
      wx.showModal({
        title: '配色未解锁',
        content: `在挑战模式连续通关 ${color.unlockConsecutive} 关可解锁「${color.name}」`,
        showCancel: false,
        confirmText: '好的',
        confirmColor: '#9b70cc',
      });
      return;
    }
    const color = BALL_COLORS.find((c) => c.id === id) || BALL_COLORS[0];
    storage.setCurrentBallColor(id);
    this.setData({ ballColorId: id, ballStyle: buildBallShellStyle(color), colorSheetVisible: false });
  },

  // ── 场景管理 ────────────────────────────────────────────────

  openSceneSheet() {
    const sceneList = SCENES.map((s) => ({
      ...s,
      unlocked: storage.isSceneUnlocked(s.id),
    }));
    this.setData({ sceneList, sceneSheetVisible: true, colorSheetVisible: false });
  },

  onSelectScene(e) {
    const id = e.currentTarget.dataset.id;
    const item = SCENES.find((s) => s.id === id);
    if (!item) return;
    if (storage.isSceneUnlocked(id)) {
      getApp().globalData.currentSceneId = id;
      this._applyScene();
      this.closeSheets();
      return;
    }
    if (storage.getCoins() < item.unlockPrice) {
      wx.showModal({
        title: '解压币不够',
        content: `「${item.name}」需要 ${item.unlockPrice} 币，多玩一会儿吧～`,
        showCancel: false, confirmText: '好的', confirmColor: '#E8A0BF',
      });
      return;
    }
    wx.showModal({
      title: '解锁场景',
      content: `花费 ${item.unlockPrice} 解压币解锁「${item.name}」？`,
      confirmText: '解锁', confirmColor: '#E8A0BF', cancelText: '再想想',
      success: (res) => {
        if (!res.confirm) return;
        if (storage.spendCoins(item.unlockPrice)) {
          storage.unlockScene(id);
          getApp().globalData.currentSceneId = id;
          this._applyScene();
          this.closeSheets();
          this._showToast(`已解锁${item.name}`);
        }
      },
    });
  },

  closeSheets() {
    this.setData({ sceneSheetVisible: false, colorSheetVisible: false });
  },

  noop() {},

  /**
   * 进入可玩的挑战关卡：目标力度条 + 倒计时 + 按压判定（与文档一致）
   * 用于：首页右下角挑战、底部 tab「挑战」、挑战子页「去玩耍」带参跳转
   */
  _bootstrapChallengeGameplay() {
    this._stopChallengeCountdown();
    this._stopPressureTracking();
    this.closeSheets();
    this.setData({
      challengeMode: true,
      challengeLevelNum: 1,
      challengeResultVisible: false,
      challengeResult: '',
    });
    this._loadChallengeStats();
    this._startNewChallengeLevel();
  },

  // ── 触摸处理 ────────────────────────────────────────────────

  onTouchStart(e) {
    const touches = e.touches || [];
    if (!touches.length) return;
    if (this._releaseTimer) {
      clearTimeout(this._releaseTimer);
      this._releaseTimer = null;
    }
    this._startTime = Date.now();
    this._lastSquishKey = -1;
    this._touchStart = {
      x: touches[0].clientX,
      y: touches[0].clientY,
      ox: this.data.offsetX,
      oy: this.data.offsetY,
    };
    this._challengeSubmitted = false;

    const t0 = smoothT(0);
    const inTarget =
      this.data.challengeMode && this.data.challengeActive && this.data.challengeTarget === 1;
    this.setData({
      pressing: true,
      releaseClass: '',
      squishStyle: buildSquishStyle(t0),
      haloVisible: true,
      haloStyle: buildHaloStyleT(t0),
      haloFlash: inTarget,
      showWave: false,
      pressureLevel: 1,
      pressureSegs: buildPressureSegs(this.data.challengeTarget, 1, ''),
    });

    const settings = storage.getSettings();
    if (settings.vibrateOn) {
      try { wx.vibrateShort({ type: 'light' }); } catch (_) {}
    }
    this._startPressureTracking();
  },

  onTouchMove(e) {
    const touches = e.touches || [];
    if (!touches.length) return;
    const dx = touches[0].clientX - this._touchStart.x;
    const dy = touches[0].clientY - this._touchStart.y;
    this.setData({
      offsetX: this._touchStart.ox + dx * 0.35,
      offsetY: this._touchStart.oy + dy * 0.35,
    });
  },

  onTouchEnd() {
    this._stopPressureTracking();
    const holdMs = Date.now() - this._startTime;
    const level = msToLevel(holdMs);

    const settings = storage.getSettings();
    if (settings.soundOn) {
      audio.playSqueeze('rubber', level / 8);
    }
    if (settings.vibrateOn) {
      try { wx.vibrateShort({ type: VIBRATE_TYPE[level] || 'medium' }); } catch (_) {}
    }

    // 挑战判定
    if (this.data.challengeActive && !this._challengeSubmitted) {
      this._challengeSubmitted = true;
      this._checkChallengeHit(level);
    }

    // 回弹动画
    const rc = RELEASE_CLASS[level] || 'releasing';
    const showWave = level >= 7;
    this.setData({
      pressing: false,
      pressureLevel: 0,
      squishStyle: '',
      releaseClass: rc,
      haloFlash: false,
      showWave,
      pressureSegs: buildPressureSegs(this.data.challengeTarget, 0, this.data.challengeResult),
    });

    if (this._releaseTimer) clearTimeout(this._releaseTimer);
    this._releaseTimer = setTimeout(() => {
      this._releaseTimer = null;
      this.setData({ haloVisible: false, showWave: false, releaseClass: '' });
    }, showWave ? 1000 : 500);
  },

  // ── 实时压力追踪 ────────────────────────────────────────────

  _startPressureTracking() {
    this._stopPressureTracking();
    this._pressInterval = setInterval(() => {
      if (!this._startTime) return;
      const holdMs = Date.now() - this._startTime;
      const t = smoothT(holdMs);
      const level = msToLevel(holdMs);
      const k = Math.round(t * 400);
      if (k === this._lastSquishKey && level === this.data.pressureLevel) return;
      this._lastSquishKey = k;

      const prevLevel = this.data.pressureLevel;
      const inTarget = this.data.challengeMode && this.data.challengeActive && level === this.data.challengeTarget;
      this.setData({
        pressureLevel: level,
        squishStyle: buildSquishStyle(t),
        haloStyle: buildHaloStyleT(t),
        haloVisible: true,
        haloFlash: inTarget,
        pressureSegs: buildPressureSegs(this.data.challengeTarget, level, ''),
      });

      const settings = storage.getSettings();
      if (settings.vibrateOn && level !== prevLevel) {
        try { wx.vibrateShort({ type: 'light' }); } catch (_) {}
      }
    }, 50);
  },

  _stopPressureTracking() {
    if (this._pressInterval) {
      clearInterval(this._pressInterval);
      this._pressInterval = null;
    }
  },

  // ── 挑战模式 ────────────────────────────────────────────────

  toggleChallengeMode() {
    const entering = !this.data.challengeMode;
    if (!entering) {
      this._stopChallengeCountdown();
      this._stopPressureTracking();
      this.setData({ challengeMode: false, challengeActive: false, challengeResultVisible: false });
      return;
    }
    this._bootstrapChallengeGameplay();
  },

  _startNewChallengeLevel() {
    const level = Math.max(1, Number(this.data.challengeLevelNum) || 1);
    // 关卡越高倒计时越快：5s 起每升 1 关减 300ms，最短 2s
    const durationMs = Math.max(2000, 5000 - (level - 1) * 300);
    const target = Math.floor(Math.random() * 8) + 1; // 随机 1-8

    this._challengeDurationMs = durationMs;
    this._challengeSubmitted = false;

    this.setData({
      challengeActive: true,
      challengeTarget: target,
      challengeCountdownPct: 100,
      challengeCountdownSec: Math.ceil(durationMs / 1000),
      challengeResult: '',
      challengeResultVisible: false,
      pressureSegs: buildPressureSegs(target, 0, ''),
    });
    this._startChallengeCountdown();
  },

  _restartCurrentLevel() {
    this._challengeSubmitted = false;
    const target = this.data.challengeTarget;
    this.setData({
      challengeResult: '',
      challengeResultVisible: false,
      challengeCountdownPct: 100,
      challengeCountdownSec: Math.ceil(this._challengeDurationMs / 1000),
      pressureSegs: buildPressureSegs(target, 0, ''),
    });
    this._startChallengeCountdown();
  },

  _startChallengeCountdown() {
    this._stopChallengeCountdown();
    const startAt = Date.now();
    const duration = this._challengeDurationMs;
    this._challengeTimer = setInterval(() => {
      const elapsed = Date.now() - startAt;
      const remaining = duration - elapsed;
      const pct = Math.max(0, (remaining / duration) * 100);

      if (remaining <= 0) {
        this._stopChallengeCountdown();
        this.setData({ challengeCountdownPct: 0, challengeCountdownSec: 0 });
        if (!this._challengeSubmitted) {
          this._challengeSubmitted = true;
          this._showChallengeResult('miss');
          setTimeout(() => { if (this.data.challengeMode) this._restartCurrentLevel(); }, 1600);
        }
        return;
      }
      this.setData({
        challengeCountdownPct: pct,
        challengeCountdownSec: Math.ceil(remaining / 1000),
      });
    }, 80);
  },

  _stopChallengeCountdown() {
    if (this._challengeTimer) {
      clearInterval(this._challengeTimer);
      this._challengeTimer = null;
    }
  },

  _checkChallengeHit(level) {
    this._stopChallengeCountdown();
    const target = this.data.challengeTarget;
    let result;
    if (level === target) {
      result = 'perfect';
    } else if (Math.abs(level - target) === 1) {
      result = 'good';
    } else {
      result = 'miss';
    }
    this._showChallengeResult(result);

    if (result === 'perfect' || result === 'good') {
      const newCons = this.data.challengeConsecutive + 1;
      const hs = Math.max(newCons, this.data.challengeHighScore);
      storage.setChallengeConsecutive(newCons);
      storage.setChallengeHighScore(hs);
      this.setData({
        challengeConsecutive: newCons,
        challengeHighScore: hs,
        challengeLevelNum: this.data.challengeLevelNum + 1,
      });
      this._checkColorUnlocks(newCons);
      setTimeout(() => {
        if (this.data.challengeMode) this._startNewChallengeLevel();
      }, 1800);
    } else {
      // miss：清空连续计数
      storage.setChallengeConsecutive(0);
      this.setData({ challengeConsecutive: 0 });
      setTimeout(() => {
        if (this.data.challengeMode) this._restartCurrentLevel();
      }, 1600);
    }
  },

  _showChallengeResult(result) {
    this.setData({ challengeResult: result, challengeResultVisible: true });
    setTimeout(() => this.setData({ challengeResultVisible: false }), 1500);
  },

  _checkColorUnlocks(consecutive) {
    BALL_COLORS.forEach((c) => {
      if (c.unlockConsecutive > 0 && c.unlockConsecutive === consecutive && !storage.isBallColorUnlocked(c.id)) {
        storage.unlockBallColor(c.id);
        this._showToast(`解锁新配色「${c.name}」🎨`);
      }
    });
  },

  // ── 游玩时长奖励 ────────────────────────────────────────────

  _startPlayRewardTimer() {
    this._stopPlayRewardTimer();
    this._rewardTimer = setInterval(() => {
      const now = Date.now();
      const chunk = now - this._playVisibleAt;
      if (chunk > 0) {
        storage.appendPlayRewardAccumMs(chunk);
        this._playVisibleAt = now;
      }
      const gained = storage.tryGrantPlayTimeReward();
      if (gained > 0) this._showToast(`放松满 5 分钟，+${gained} 解压币`);
    }, 15000);
  },

  _stopPlayRewardTimer() {
    if (this._rewardTimer) {
      clearInterval(this._rewardTimer);
      this._rewardTimer = null;
    }
  },

  _showToast(msg) {
    this.setData({ toast: msg });
    setTimeout(() => this.setData({ toast: '' }), 2400);
  },

  onShareAppMessage() {
    return { title: '一起捏一捏，放松解压～', path: '/pages/index/index' };
  },
});
