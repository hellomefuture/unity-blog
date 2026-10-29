---
title: 'AssetBundle 与 Addressables'
date: 2026-10-28 16:06:31
categories:
  - Unity开发
tags:
  - Unity
  - AssetBundle
  - Addressables
  - 资源管理
cover: /img/covers/c5.svg
top_img: /img/covers/c5.svg
description: '项目做到一定程度，Resources 就不够用了：不能分包、不能热更、不能按需下载。'
---
## 文档简介

项目做到一定程度，`Resources` 就不够用了：**不能分包、不能热更、不能按需下载**。

Unity 官方的解决方案有两条线：

1. **AssetBundle（AB 包）** —— 底层资源打包格式，一切的基础
2. **Addressables（AA 包）** —— 基于 AB 的上层封装，解决 AB 的使用复杂度

第三方还有 YooAsset（本站另有专文）。本文把 AB 和 AA 的原理、用法、坑讲清楚。

---

## 1 为什么需要 AB / AA

| 问题 | Resources | AB / AA |
| --- | --- | --- |
| 全部打进主包 | ✅ 是，包体膨胀 | ❌ 按需打包与下载 |
| 资源更新 | ❌ 不支持 | ✅ 支持补丁 |
| 分包 | ❌ 不支持 | ✅ 按模块拆包 |
| 内存控制 | ❌ 只能整包卸载 | ✅ 引用计数 + 显式卸载 |
| 加载方式 | 同步为主 | 异步、可寻址 |

**核心价值**：把资源从"编译进包"变成"运行时按需加载"，这是热更新和分包的前提。

---

## 2 AssetBundle 基础

### 2.1 什么是 AB 包

一个 `.ab` 文件（或 `.bundle`），里面打包了一组资源（Prefab、贴图、音频、场景等）以及它们的依赖信息。

```
character.ab
├── Player.prefab
├── Player.png
└── 依赖信息（引用了 shared_atlas.ab）
```

### 2.2 打包

```csharp
// 旧 API（BuildPipeline），新版本已逐步被 SBP 取代
BuildPipeline.BuildAssetBundles(
    outputPath,
    BuildAssetBundleOptions.ChunkBasedCompression,   // LZ4 压缩
    BuildTarget.Android);
```

关键设置：

| 选项 | 说明 |
| --- | --- |
| `Uncompressed` | 最快加载，包体最大 |
| `LZ4`（ChunkBased） | **推荐**，按块解压，加载快、体积适中 |
| `LZMA`（全压缩） | 包体最小，但**解压最慢、内存峰值高** |

### 2.3 加载

```csharp
// 1. 先加载 manifest（依赖信息）
var manifestBundle = AssetBundle.LoadFromFile(Path.Combine(root, "Android"));
var manifest = manifestBundle.LoadAsset<AssetBundleManifest>("AssetBundleManifest");

// 2. 加载依赖
string[] deps = manifest.GetAllDependencies("character.ab");
foreach (var dep in deps)
    AssetBundle.LoadFromFile(Path.Combine(root, dep));

// 3. 加载目标包与资源
var bundle = AssetBundle.LoadFromFile(Path.Combine(root, "character.ab"));
var prefab = bundle.LoadAsset<GameObject>("Player");
Instantiate(prefab);

// 4. 卸载（注意：先卸载资源，再卸载包）
bundle.Unload(false);   // false = 保留已加载的资源实例
```

### 2.4 AB 的五个痛点

| 痛点 | 具体表现 |
| --- | --- |
| **依赖管理** | 必须手动加载 manifest、手动算依赖，漏一个就报 missing |
| **冗余资源** | 同一张贴图被多个包引用，会重复打进每个包 |
| **引用计数** | 谁加载、谁卸载全靠人工，容易泄漏或提前卸载 |
| **平台差异** | 不同平台的包不通用，必须分平台打包 |
| **加载顺序** | 依赖必须先于本体加载，否则资源丢失 |

**结论**：AB 是底层格式，直接用非常容易出错，所以官方做了 Addressables。

---

## 3 Addressables（AA 包）

### 3.1 AA 解决什么

Addressables 在 AB 之上加了三层：

| 能力 | 说明 |
| --- | --- |
| **地址系统** | 用字符串地址（如 `"Player"`）代替路径，资源移动不影响代码 |
| **自动依赖** | 加载时自动加载依赖包，卸载时自动回收 |
| **引用计数** | 每个 handle 计数，全部释放后才真正卸载 |

### 3.2 基本用法

```csharp
using UnityEngine.AddressableAssets;
using UnityEngine.ResourceManagement.AsyncOperations;

// 异步加载
AsyncOperationHandle<GameObject> handle =
    Addressables.InstantiateAsync("Player", position, rotation);
await handle.Task;

// 加载但不实例化
var prefabHandle = Addressables.LoadAssetAsync<GameObject>("Player");
GameObject prefab = await prefabHandle.Task;

// 释放
Addressables.ReleaseInstance(handle);      // 实例化过的用这个
Addressables.Release(prefabHandle);        // 非实例化的用这个
```

### 3.3 资源标记

在 Unity 里：

1. 选中资源 → Inspector 勾选 **Addressable**
2. 填 **Address**（如 `Player`）与 **Labels**（如 `character`）
3. 设置 **Group**（分组，决定打进哪个包）

| 设置 | 作用 |
| --- | --- |
| Address | 加载用的字符串，必须唯一 |
| Labels | 批量加载的标签（如"所有关卡"） |
| Group | 打包分组，同组资源打进同一个包 |

### 3.4 远程加载

AA 支持把 Group 设为 `Remote`，资源放到 CDN：

```csharp
// 初始化（必须先做）
await Addressables.InitializeAsync();

// 检查更新
var checkHandle = Addressables.CheckForCatalogUpdates();
var catalogs = await checkHandle.Task;

if (catalogs.Count > 0)
{
    await Addressables.UpdateCatalogs(catalogs).Task;
}

// 下载依赖（可显示进度）
var sizeHandle = Addressables.GetDownloadSizeAsync("level_02");
long size = await sizeHandle.Task;
if (size > 0)
{
    var downloadHandle = Addressables.DownloadDependenciesAsync("level_02");
    while (!downloadHandle.IsDone)
    {
        float progress = downloadHandle.PercentComplete;
        UpdateLoadingBar(progress);
        await Task.Yield();
    }
}
```

### 3.5 AA 的坑

| 坑 | 表现 | 解决 |
| --- | --- | --- |
| 忘了 Release | 内存持续上涨 | handle 存字段，成对释放 |
| 用 Release 释放实例 | 实例没销毁 | 实例化用 `ReleaseInstance` |
| Group 划分不合理 | 加载一个资源要拉一个大包 | 按使用场景拆组，公共资源单独组 |
| 冗余分析不做 | 包体虚高 | 用 **Analyze → Check Duplicate Bundle Dependencies** |
| 远程 Catalog 版本不一致 | 加载到旧资源 | 启动时先 Check + Update Catalog |

---

## 4 AB / AA / YooAsset 怎么选

| 维度 | AssetBundle | Addressables | YooAsset |
| --- | --- | --- | --- |
| 上手成本 | 高（全手工） | 中 | 低 |
| 依赖管理 | 手动 | 自动 | 自动 |
| 引用计数 | 手动 | 自动 | 自动 |
| 热更 | 需自己做 | 支持 | 支持 |
| 编辑器模拟 | 无 | 有（Use Asset Database） | 有（EditorSimulate） |
| 社区 | 官方底层 | 官方上层 | 国内广泛使用 |
| 适合 | 学习原理 / 特殊定制 | 中小项目、官方生态 | 国内手游、需要快速落地 |

《地穴行者》用的是 **YooAsset**，原因是它的 `EditorSimulate / Offline / Host` 三模式切换非常直接，编辑器里改资源不用打包。原理上和 AA 是同一套：**地址 + 分组 + 依赖 + 引用计数**。

---

## 5 打包与资源规划实践

### 5.1 分组原则

| 分组方式 | 适用 |
| --- | --- |
| 按功能模块 | 角色、关卡、UI、音频各一组 |
| 按使用频率 | 高频公共资源单独一组，避免每个包重复 |
| 按更新频率 | 常改的（活动 UI）单独一组，减少补丁体积 |
| 按加载时机 | 首屏必需 vs 可延后下载 |

**反例**：所有资源打成一个包 → 改一张图就要重下整个包。

### 5.2 冗余资源处理

同一张图被 10 个 Prefab 引用，如果每个 Prefab 在不同包里，这张图会被打 10 份。

做法：
1. 把公共依赖（共用图集、共用材质、共用 Shader）**单独成组**
2. 其他包依赖它，而不是各自复制
3. 用冗余分析工具定期检查

### 5.3 版本与补丁

```
版本号（Version）
 └── 资源清单（Catalog / Manifest）
      └── 每个包的 Hash
           └── 包文件
```

更新流程：
1. 启动 → 拉最新版本号
2. 比对清单 → 找出变化的包
3. 只下载变化的包
4. 更新本地清单

---

## 6 常见问题排查

| 现象 | 可能原因 |
| --- | --- |
| 加载报 "missing dependency" | 依赖包没加载 / 清单不对 |
| 材质变粉 | Shader 没打进包 / 变体丢失 |
| 图集丢失 | 图集所在包未加载 |
| 内存不降 | handle 没释放 / `Unload(false)` 后仍持有引用 |
| 真机加载失败、编辑器正常 | 平台包不匹配 / 打包目标平台不对 |
| 首次加载特别慢 | LZMA 全压缩，改 LZ4 |

---

## 7 小结

| 要点 | 结论 |
| --- | --- |
| 定位 | AB 是底层格式，AA 是其上层封装 |
| AB | 依赖、计数全手动，直接用容易出错 |
| AA | 地址 + 自动依赖 + 引用计数，官方推荐 |
| 选型 | 想快速落地选 YooAsset / AA，想理解原理看 AB |
| 分组 | 按模块 / 频率 / 更新频率拆，公共依赖单独组 |
| 释放 | handle 必须成对释放，实例化用 ReleaseInstance |
| 排查 | 先看依赖是否加载，再看平台包是否匹配 |

资源系统的复杂度不在"加载一个 Prefab"，而在**依赖、冗余、引用计数、版本更新**这四件事。把这四件事交给框架，业务层只关心地址，才是可持续的做法。
