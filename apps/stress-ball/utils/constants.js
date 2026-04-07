/**
 * 捏捏乐与场景元数据（与需求文档 MVP 对齐）
 * 音效路径为占位：请替换为项目自有或已授权素材
 */

/** 材质类型：影响动画曲线与震动强度 */
const MATERIAL = {
  SOFT_RUBBER: 'soft_rubber',
  FOAM: 'foam',
  JELLY: 'jelly',
  PLUSH: 'plush',
};

/** 全部捏捏乐配置 */
const TOYS = [
  {
    id: 'octopus',
    name: '小章鱼',
    material: MATERIAL.SOFT_RUBBER,
    emoji: '🐙',
    unlockPrice: 0,
    desc: '软胶慢回弹，触手 Q 弹',
    soundKey: 'rubber',
  },
  {
    id: 'stress_ball',
    name: '解压球',
    material: MATERIAL.SOFT_RUBBER,
    emoji: '🔴',
    unlockPrice: 0,
    desc: '经典软胶，一捏就扁',
    soundKey: 'rubber',
  },
  {
    id: 'cloud',
    name: '云朵',
    material: MATERIAL.FOAM,
    emoji: '☁️',
    unlockPrice: 25,
    desc: '泡沫沙沙感，轻飘飘',
    soundKey: 'foam',
  },
  {
    id: 'cube',
    name: '方块',
    material: MATERIAL.FOAM,
    emoji: '🟦',
    unlockPrice: 30,
    desc: '易挤压，边角也温柔',
    soundKey: 'foam',
  },
  {
    id: 'pudding',
    name: '草莓布丁',
    material: MATERIAL.JELLY,
    emoji: '🍮',
    unlockPrice: 45,
    desc: '果冻 duang duang 抖',
    soundKey: 'jelly',
  },
];

/** 场景配置 */
const SCENES = [
  {
    id: 'bedroom',
    name: '治愈卧室',
    unlockPrice: 0,
    gradient: 'linear-gradient(165deg, #FFF0F3 0%, #E8F4FC 50%, #FFFACD 100%)',
    accent: '#FFB6C1',
    particles: 'curtain',
  },
  {
    id: 'garden',
    name: '星空花园',
    unlockPrice: 100,
    gradient: 'linear-gradient(165deg, #1a1a2e 0%, #4a3f6b 40%, #87CEEB 100%)',
    accent: '#B8A9E8',
    particles: 'stars',
  },
];

/** 材质 -> 按压缩放范围（视觉形变差异） */
const MATERIAL_SCALE = {
  [MATERIAL.SOFT_RUBBER]: { min: 0.82, duration: 420 },
  [MATERIAL.FOAM]: { min: 0.7, duration: 280 },
  [MATERIAL.JELLY]: { min: 0.75, duration: 350 },
  [MATERIAL.PLUSH]: { min: 0.88, duration: 500 },
};

/** 解压币：连续游玩奖励间隔（毫秒） */
const PLAY_REWARD_MS = 5 * 60 * 1000;
const PLAY_REWARD_COINS = 5;

/** 解压球配色列表（挑战连续通关解锁） */
const BALL_COLORS = [
  { id: 'pink',     name: '玫瑰粉', unlockConsecutive: 0,
    highlight: '#ffccd5', light: '#ff8fa3', body: '#e8557a', shadow: '#c43066', shadowRgb: '196,48,102' },
  { id: 'lavender', name: '薰衣草', unlockConsecutive: 5,
    highlight: '#e8d5f5', light: '#c4a0e8', body: '#9b70cc', shadow: '#7a52b0', shadowRgb: '122,82,176' },
  { id: 'mint',     name: '薄荷绿', unlockConsecutive: 10,
    highlight: '#c5eed8', light: '#85d4a8', body: '#52b880', shadow: '#3a9966', shadowRgb: '58,153,102' },
  { id: 'sky',      name: '天空蓝', unlockConsecutive: 15,
    highlight: '#c5e8f8', light: '#7bc4ed', body: '#4aa8e0', shadow: '#2a88c4', shadowRgb: '42,136,196' },
  { id: 'coral',    name: '珊瑚橙', unlockConsecutive: 20,
    highlight: '#ffe0cc', light: '#ffad7a', body: '#ff7a3d', shadow: '#e85a1a', shadowRgb: '232,90,26' },
  { id: 'peach',    name: '蜜桃黄', unlockConsecutive: 25,
    highlight: '#fff0e5', light: '#ffc896', body: '#ffaa5c', shadow: '#e88c3a', shadowRgb: '232,140,58' },
  { id: 'lilac',    name: '丁香紫', unlockConsecutive: 30,
    highlight: '#f5e0f5', light: '#d4a0d4', body: '#b570b5', shadow: '#8a4a8a', shadowRgb: '138,74,138' },
  { id: 'lemon',    name: '柠檬黄', unlockConsecutive: 35,
    highlight: '#fffce0', light: '#fff0a0', body: '#f5d840', shadow: '#d4b800', shadowRgb: '212,184,0' },
  { id: 'slate',    name: '石板蓝', unlockConsecutive: 40,
    highlight: '#e0e8f0', light: '#a0b8d0', body: '#6080a8', shadow: '#405880', shadowRgb: '64,88,128' },
  { id: 'rose',     name: '玫瑰红', unlockConsecutive: 45,
    highlight: '#ffe0e8', light: '#ff9ab0', body: '#e85070', shadow: '#c03050', shadowRgb: '192,48,80' },
];

/** 特殊材质效果（每 20 连续通关解锁一种） */
const SPECIAL_MATERIALS = [
  { id: 'matte',       name: '哑光',   unlockConsecutive: 20 },
  { id: 'pearl',       name: '珠光',   unlockConsecutive: 40 },
  { id: 'transparent', name: '透明',   unlockConsecutive: 60 },
];

module.exports = {
  MATERIAL,
  TOYS,
  SCENES,
  MATERIAL_SCALE,
  PLAY_REWARD_MS,
  PLAY_REWARD_COINS,
  BALL_COLORS,
  SPECIAL_MATERIALS,
};
