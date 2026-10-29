---
title: 'YooAsset 资源管理'
date: 2026-10-26 10:06:37
categories:
  - 框架架构
tags:
  - YooAsset
  - 资源管理
  - 热更新
cover: /img/covers/c4.svg
top_img: /img/covers/c4.svg
description: 'Resources.Load 的问题很直接：全部打进主包、无法按需更新、不支持分包、引用关系黑盒。中大型项目基本都会换成可寻址的资源系统。'
---
## 文档简介

`Resources.Load` 的问题很直接：全部打进主包、无法按需更新、不支持分包、引用关系黑盒。中大型项目基本都会换成可寻址的资源系统。

本文记录 **YooAsset** 的三种运行模式、资源地址规范、句柄与引用计数，以及项目里踩过的泄漏问题。

---

## 1 为什么不用 Resources

| 维度 | Resources | YooAsset |
| --- | --- | --- |
| 打包 | 全量进主包 | 按需分包、可远程更新 |
| 更新 | 不支持 | 支持补丁与版本管理 |
| 加载方式 | 同步为主 | 同步 / 异步，句柄管理 |
| 卸载 | `UnloadUnusedAssets` 黑盒 | 显式引用计数，可控 |
| 依赖管理 | 不透明 | 自动收集依赖 |

结论：只要项目有**热更或分包**需求，`Resources` 就不够用。

---

## 2 三种运行模式

| 模式 | 适用场景 | 资源来源 |
| --- | --- | --- |
| **EditorSimulate** | 编辑器内开发调试 | 直接读 AssetDatabase，改完即生效，不用打包 |
| **Offline** | 单机 / 演示包 | 资源随包，不联网 |
| **Host** | 线上运营 | 从 CDN 下载补丁与资源清单 |

初始化时按环境切换，业务层不用关心区别：

```csharp
public async Task InitializeAsync()
{
#if UNITY_EDITOR
    // 编辑器：模拟模式，零打包成本
    _package = YooAssets.CreatePackage("DefaultPackage");
    var initParams = new EditorSimulateModeParameters
    {
        SimulateManifestFilePath = EditorSimulateModeHelper.SimulateBuild("DefaultPackage")
    };
#else
    // 真机：联机模式
    var initParams = new HostPlayModeParameters
    {
        BuildinQueryServices = new BuildinQueryServices(),
        RemoteServices = new RemoteServices(hostServerUrl, fallbackServerUrl)
    };
#endif
    var operation = _package.InitializeAsync(initParams);
    await operation.Task;
}
```

---

## 3 资源地址规范

地址统一格式，避免各处硬编码路径：

```
asset://data/{folder}/{id}
```

| 类型 | 示例 |
| --- | --- |
| Prefab | `asset://data/rooms/Start_Room` |
| ScriptableObject | `asset://data/config/GameConfig` |
| Sprite | `asset://data/decor/Torch` |

好处：换目录结构时只改资源收集规则，业务代码里的地址不变。

---

## 4 句柄与引用计数

### 4.1 加载与释放必须成对

```csharp
// 加载
var handle = await YooAssetService.LoadAsync<GameObject>("asset://data/rooms/Start_Room");
var prefab = handle.Result;
Instantiate(prefab, position, Quaternion.identity);

// 用完释放
handle.Release();
```

**规则**：一次加载对应一次释放。Handle 必须存到字段里，不能用一个丢一个——丢了就再也释放不掉，引用计数永远不归零。

### 4.2 常见的泄漏形态

| 写法 | 问题 |
| --- | --- |
| `await LoadAsync(...)` 后不保存 handle | 无法释放，资源常驻内存 |
| 在 `Update` 里反复加载 | 每帧新增引用，内存暴涨 |
| 只释放主资源，不释放依赖 | 依赖资源仍被持有 |
| 面板关闭时不释放内部列表项图集 | UI 反复开关后内存持续上涨 |

### 4.3 统一加载门面

把加载收敛到一个服务里，业务层只拿结果，不直接碰 YooAsset API：

```csharp
public static class DataService
{
    private static readonly Dictionary<string, object> _cache = new();

    public static async Task<T> GetAsync<T>(string address, Func<T> create = null) where T : Object
    {
        if (_cache.TryGetValue(address, out var cached)) return (T)cached;

        if (create == null)
            throw new ArgumentNullException(nameof(create), "首次加载必须提供创建委托");

        var handle = await YooAssetService.LoadAsync<T>(address);
        _cache[address] = handle.Result;
        return handle.Result;
    }
}
```

关键点：**create 委托为 null 时必须 fail-fast**，否则会在缓存未命中时静默返回 null，问题被推迟到很远的地方才爆。

---

## 5 与热更新的关系

热更 DLL 本身就是一份远程资源：

| 步骤 | 动作 |
| --- | --- |
| 1 | YooAsset 初始化并检查版本 |
| 2 | 下载补丁清单（含 DLL 与资源） |
| 3 | 加载热更 DLL |
| 4 | 反射执行入口 `HotUpdate.GameRoot` |

顺序不能反：资源系统没就绪，DLL 根本加载不到。

---

## 6 小结

| 要点 | 做法 |
| --- | --- |
| 模式 | 编辑器用 Simulate，真机用 Host，单机包用 Offline |
| 地址 | 统一 `asset://data/{folder}/{id}` |
| 释放 | Handle 存字段，加载释放严格配对 |
| 缓存 | 统一门面 + 地址缓存，create 缺失直接抛异常 |
| 排查 | 关注 UI 开关循环、列表项、依赖资源 |

资源管理做得好不好，平时看不出来，**只在长时间运行和反复切场景时才暴露**。养成"加载必存句柄、用完必释放"的习惯，比事后查内存便宜得多。
