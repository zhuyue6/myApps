# 捏捏乐 · 微信小程序

基于项目需求文档实现的 **治愈系解压** 小程序（原生 WXML / WXSS / JS）。

## 体验与设计要点

- **打开即玩**：主界面直接捏捏，单指按压形变 + 拖拽；双指同时按压反馈更强。
- **无挫败**：无失败、无限时、无排行榜；挑战页仅展示本地记录与配色解锁进度。
- **反馈**：音效 / 震动可在设置中关闭；材质不同形变节奏不同（软胶 / 泡沫 / 果冻）。
- **内容**：5 款造型、2 款场景；解压币解锁（本地存储模拟）；每日登录 +10 币、连续游玩约 5 分钟 +5 币。
- **视觉**：马卡龙色系、圆角与柔和阴影、底部自定义导航（无需 tab 图标资源）。

## 如何运行

1. 安装 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)。
2. **导入项目**，选择仓库根目录 `stress-ball`（已配置 `miniprogramRoot: miniprogram/`）。
3. AppID 可使用测试号或替换 `project.config.json` 中的 `appid`。
4. （可选）按 `assets/sounds/README.md` 添加音效文件。

## 目录结构

```
miniprogram/
  app.js / app.json / app.wxss
  pages/index/      # 核心玩耍
  pages/challenge/    # 力度挑战（记录与配色解锁）
  pages/settings/     # 设置与反馈
  components/custom-tab-bar/
  utils/constants.js  # 造型与场景配置
  utils/storage.js    # 解压币与解锁
  utils/audio.js      # 音效封装
```

## 后续可扩展（文档中的 MVP+）

- 微信录屏与分享链路、激励视频与广告位（注意频率）。
- 服务端反馈收集、真实支付与去广告卡。
- Canvas / 物理引擎强化形变（当前为高性能 CSS 形变方案）。
