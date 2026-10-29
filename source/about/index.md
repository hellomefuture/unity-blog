---
title: 关于本人
date: 2026-10-29 17:01:40
top_img: /img/covers/c5.svg
description: Unity 客户端开发 · 2027 届校招 · CryptWalker 独立开发者
comments: false
---

## 一句话介绍

Unity 客户端开发方向，2027 届校招。做过商业项目的 UI 与图鉴系统，也独立从零搭过一款 2D 肉鸽游戏的热更新与资源框架。

---

## 技术方向

| 方向 | 内容 |
| --- | --- |
| 语言基础 | C# / C++，泛型、委托、事件、Lambda、常用容器；单例、观察者、工厂等设计模式 |
| 数据结构与算法 | 链表、队列、栈、树、图；八大排序、DFS / BFS、贪心、回溯、动态规划 |
| 框架与热更新 | HybridCLR、YooAsset、模块化注册、EventBus、通用状态机、对象池 |
| 性能优化 | 合批与 DrawCall 优化、分帧加载、对象池与列表复用、资源引用计数与内存泄漏排查 |
| 工程协作 | Git 分支与冲突处理、Unity .meta 机制、Editor 扩展开发、IL2CPP / Android 打包 |
| 美术对接 | Aseprite / PSD / Tiled 2D 资源批处理、Mixamo 动画、Blender 基础建模 |

---

## 项目与经历

### 《地穴行者》CryptWalker · 2D 肉鸽动作游戏（独立开发）

基于 Unity 2022 LTS + URP 2D，2D 俯视角像素风 Roguelike，面向 PC / Android，独立完成全部客户端代码。

- **热更新与资源**：AOT + 热更双程序集架构，HybridCLR 业务逻辑热更（补充元数据、动态加载 DLL），`IAppBridge` 隔离两端，代理组件规避跨程序集引用；YooAsset 统一资源加载，支持 EditorSimulate / Offline / Host 三种模式。
- **框架与架构**：模块化注册（`IModule` 生命周期、依赖顺序初始化、反序注销）、EventBus 事件中心、带容量上限的泛型对象池、通用状态机骨架 `Fsm<T>`（复用于玩家、敌人、主流程）。
- **玩法系统**：程序化地牢（房间 + 走廊、固定种子可复现、分帧生成）、自研网格 A\* 寻路、战斗系统（伤害计算、数值修饰管线、元素附着与反应、近战 / 远程 / 法术三类武器）、Buff 与遗物、局内经济。
- **UI 与工具链**：四层 Canvas + CanvasScaler 多分辨率适配；面板管理器统一异步加载与幂等打开；22 个 Editor 工具（批量切图、动画与 AnimatorController 自动生成、预制体批量构建）。

GitHub：[hellomefuture/CryptWalker](https://github.com/hellomefuture/CryptWalker)

### 商业项目 · Unity 客户端开发实习

- **业务 UI**：独立完成通用弹窗、背包、装备强化锻造、图鉴、命盘卡片等数十款面板，负责布局、锚点自适应、多状态切换、列表复用与 Tooltip。
- **图鉴系统**：PureMVC 四件套（Proxy / Command / Mediator）实现数据与 UI 解耦；虚拟列表 ListView 只渲染可视区与缓冲区条目，配合对象池复用，千级条目滚动保持稳定帧率。
- **渲染优化**：梳理 UGUI 合批规则，定位图集不统一、层级穿插、材质不一致等打断合批的诱因，通过规整图集与优化层级降低 DrawCall。
- **框架梳理**：项目无文档，通读源码与断点调试，自主整理 PureMVC 分层与 YooAsset 引用计数规范。

### 营造九州 · 土木华章（3D，独立开发）

- 网格化建筑建造系统：预览、放置检查与建造流程控制。
- 面向对象封装的 10 种基础控件（Button / Input / Label / Slider / Toggle 等），跨场景复用。
- 3D 罗盘方位感知与旋转交互；围廊、垂花门、正房、厢房等构件场景搭建。

---

## 联系

- GitHub：[hellomefuture](https://github.com/hellomefuture)
- 邮箱：3041520372@qq.com

---

## 关于这个博客

这里记录 Unity 与 C# 的学习笔记和工程实践，内容来自项目中的真实问题与解决过程，而不是单纯抄 API 文档。如果某一篇正好帮到你，欢迎在 GitHub 提 Issue 交流。
