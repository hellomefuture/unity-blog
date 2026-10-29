---
title: 'async / await 异步编程'
date: 2026-10-28 16:09:58
categories:
  - Unity开发
tags:
  - Unity
  - 异步
  - async
  - Task
cover: /img/covers/c3.svg
top_img: /img/covers/c3.svg
description: 'async / await 让异步代码写得像同步一样，是 C# 最实用的语法糖之一。但在 Unity 里用错，会出现回调在对象销毁后执行、异常被静默吞掉、await 之后不在主线程这些隐蔽问题。'
---
## 文档简介

`async / await` 让异步代码写得像同步一样，是 C# 最实用的语法糖之一。但在 Unity 里用错，会出现**回调在对象销毁后执行**、**异常被静默吞掉**、**await 之后不在主线程**这些隐蔽问题。

本文讲清它的工作原理、在 Unity 里的正确用法，以及与协程的取舍。

---

## 1 它到底做了什么

```csharp
async Task<int> LoadAsync()
{
    var data = await ReadFileAsync();   // 遇到 await，方法先返回
    return data.Length;                 // IO 完成后从这里继续
}
```

编译器会把 `async` 方法改写成**状态机**：

1. 执行到 `await` 时，如果任务没完成，方法**返回**一个未完成的 `Task`
2. 任务完成后，从 `await` 后面的位置**继续执行**
3. 调用方可以 `await` 这个 `Task`，也可以不等

**关键理解**：`await` 不是"阻塞等待"，而是"挂起当前方法，把控制权交回去"。

### 1.1 同步 vs 异步执行流程

```
同步：A → B（等 3 秒）→ C        主线程被卡 3 秒
异步：A → 发起 B → 返回 → ... → B 完成 → C    主线程不卡
```

---

## 2 返回类型怎么选

| 类型 | 用于 | 注意 |
| --- | --- | --- |
| `Task` | 无返回值的异步方法 | 最常用 |
| `Task<T>` | 有返回值 | 最常用 |
| `void` | **仅限事件处理器** | 异常无法被捕获，禁止在业务里用 |
| `ValueTask<T>` | 高频、多数情况同步完成 | 不能多次 await，不能并行 await |

```csharp
// ✅ 正确
async Task LoadLevelAsync() { ... }
async Task<int> GetGoldAsync() { ... }

// ⚠️ 只用于事件回调
private async void OnClick() { ... }

// ❌ 业务代码里绝对不要
async void LoadData() { ... }
```

### 2.1 为什么 `async void` 危险

```csharp
async void Bad()
{
    await Task.Delay(100);
    throw new Exception("炸了");     // 异常直接抛到同步上下文，没人接
}

async Task Good()
{
    await Task.Delay(100);
    throw new Exception("炸了");     // 异常存进 Task，调用方 await 时能捕获
}
```

`async void` 的异常会直接抛到 `SynchronizationContext`，在 Unity 里表现为一条难以定位的错误，且**调用方无法 try/catch**。

**唯一例外**：Unity 的 UI 按钮回调、事件订阅这类"签名必须 void"的地方。

```csharp
button.onClick.AddListener(async () => await LoadAsync());
```

即使这样，也要在内部包 try/catch。

---

## 3 Unity 里的三个坑

### 坑 1：`await` 之后可能不在主线程

在 Unity 中，`await` 默认会**回到原来的同步上下文**（主线程），所以一般情况下 `await` 之后可以安全操作 Unity 对象。

但如果用了 `ConfigureAwait(false)`，就会失去主线程上下文：

```csharp
// ❌ 之后可能在后台线程，碰 Unity API 会崩
await SomeTask.ConfigureAwait(false);
transform.position = Vector3.zero;
```

**规则**：**Unity 代码里不要写 `ConfigureAwait(false)`**。它适合纯服务端 / 类库，不适合需要回主线程的游戏逻辑。

### 坑 2：对象销毁后回调还在跑

```csharp
async void Start()
{
    await Task.Delay(3000);
    // 如果这 3 秒内对象被销毁 → 这里访问 gameObject 会报错
    gameObject.SetActive(false);
}
```

**解决**：用 `CancellationToken`，在 `OnDestroy` 取消。

```csharp
private CancellationTokenSource _cts = new();

async void Start()
{
    try
    {
        await Task.Delay(3000, _cts.Token);
        gameObject.SetActive(false);
    }
    catch (OperationCanceledException) { /* 正常取消，忽略 */ }
}

void OnDestroy()
{
    _cts.Cancel();
    _cts.Dispose();
}
```

### 坑 3：异常被吞掉

```csharp
// ❌ 没人 await，异常永远不会被发现
LoadDataAsync();

// ✅ 要么 await，要么显式捕获
await LoadDataAsync();

// 或者
_ = LoadDataAsync().ContinueWith(t =>
    Core.Log.Error($"加载失败: {t.Exception}"),
    TaskContinuationOptions.OnlyOnFaulted);
```

---

## 4 并发控制

### 4.1 并行执行

```csharp
var a = LoadConfigAsync();
var b = LoadAudioAsync();
var c = LoadTextureAsync();

await Task.WhenAll(a, b, c);     // 三个同时跑，全部完成才继续
```

**注意**：`WhenAll` 抛的是**第一个**异常，其他任务的异常会被忽略。需要全量日志时用：

```csharp
var tasks = new[] { a, b, c };
await Task.WhenAll(tasks);
foreach (var t in tasks)
    if (t.IsFaulted) Core.Log.Error(t.Exception);
```

### 4.2 串行 vs 并行

| 场景 | 选择 |
| --- | --- |
| 资源之间无依赖 | 并行（WhenAll） |
| B 依赖 A 的结果 | 串行（await 依次） |
| 部分可并行 | 先并行无依赖的，再串行有依赖的 |

### 4.3 限制并发数

一次发 100 个下载请求会打爆内存和带宽：

```csharp
var semaphore = new SemaphoreSlim(4);   // 最多 4 个并发

var tasks = urls.Select(async url =>
{
    await semaphore.WaitAsync();
    try { return await DownloadAsync(url); }
    finally { semaphore.Release(); }
});

await Task.WhenAll(tasks);
```

---

## 5 协程 vs async/await

Unity 老代码大量使用协程（`IEnumerator` + `yield return`）。两者对比：

| 维度 | 协程 | async/await |
| --- | --- | --- |
| 返回值 | 不能直接返回 | `Task<T>` |
| 异常处理 | 不能 try/catch 跨 yield | 原生 try/catch |
| 取消 | 依赖 `StopCoroutine` | `CancellationToken` |
| 组合 | 困难 | WhenAll / WhenAny |
| 生命周期 | 绑在 MonoBehaviour 上 | 需要自己管理 |
| 使用范围 | 只能在 MonoBehaviour | 任意类 |
| 后台线程 | 不支持 | 支持 |
| 语法 | `yield return new WaitForSeconds` | `await Task.Delay` |

**结论**：

- 纯 Unity 内的时间等待、简单流程 → 协程够用，且自带生命周期管理
- IO、网络、需要返回值、需要异常处理 → **async/await**

《地穴行者》里 YooAsset 初始化用的是标准 `async/await`，因为它是 IO 密集型且需要异常处理；而分帧生成地牢用的是协程，因为它需要"每帧让出"且生命周期天然绑在场景上。

---

## 6 UniTask 简介

Unity 社区常用 `UniTask`（Cysharp 出品），解决原生 Task 在 Unity 里的几个问题：

| 问题 | UniTask 的改进 |
| --- | --- |
| 原生 Task 有 GC 分配 | 值类型 Task，零分配 |
| 不能等 Unity 的 YieldInstruction | 支持 `await UniTask.Delay`、`await WaitForSeconds` |
| 不支持 Unity 生命周期 | `GetCancellationTokenOnDestroy()` |
| 不能在 PlayerLoop 上精确调度 | 绑定 Unity 的 PlayerLoop |

```csharp
// 常用写法
await UniTask.Delay(TimeSpan.FromSeconds(1));
await UniTask.WaitUntil(() => isReady);
await UniTask.Yield(PlayerLoopTiming.Update);

// 对象销毁自动取消
await UniTask.Delay(1000, cancellationToken: this.GetCancellationTokenOnDestroy());
```

**但注意**：引入 UniTask 会增加项目依赖，且与 HybridCLR 组合时需要额外配置 AOT 泛型。小项目用原生 Task 足够。

---

## 7 实战：启动流程

```csharp
public async Task BootAsync()
{
    try
    {
        UpdateLoadingUI(0.1f, "初始化资源系统");
        await YooAssetService.InitializeAsync();

        UpdateLoadingUI(0.5f, "加载热更程序集");
        var assembly = await HotUpdateProvider.LoadAssemblyAsync("CryptWalker.HotUpdate.dll");

        UpdateLoadingUI(0.9f, "启动游戏");
        var entry = assembly.GetType("HotUpdate.GameRoot");
        entry.GetMethod("Start").Invoke(null, null);

        UpdateLoadingUI(1f, "完成");
    }
    catch (Exception e)
    {
        Core.Log.Error($"[Boot] 启动失败: {e}");
        ShowRetryDialog();          // 降级：可重试，不卡死
    }
}
```

要点：

1. 每一步都有进度反馈
2. 整个流程包在 `try/catch` 里
3. 失败给玩家**可恢复**的出口（重试），而不是白屏

---

## 8 常见坑汇总

| 坑 | 后果 | 解决 |
| --- | --- | --- |
| 用 `async void` 写业务 | 异常吞掉、无法 await | 改 `async Task` |
| `ConfigureAwait(false)` | await 后不在主线程，碰 Unity 崩 | Unity 里不要用 |
| 对象销毁后回调 | 空引用 | CancellationToken + OnDestroy 取消 |
| 不 await 也不处理异常 | 静默失败 | `_ = task.ContinueWith(...)` 或 await |
| 无限制并发 | 内存暴涨、带宽打满 | `SemaphoreSlim` 限流 |
| 循环里 await 单个请求 | 慢 | WhenAll 并行 |
| `Task.Delay` 在暂停时仍走 | 暂停菜单时逻辑继续 | 改用受时间缩放影响的等待 |

---

## 9 小结

| 要点 | 结论 |
| --- | --- |
| 本质 | 编译器生成状态机，await 处挂起、完成后恢复 |
| 返回类型 | 业务用 `Task` / `Task<T>`，`async void` 只给事件 |
| 线程 | Unity 里不要 `ConfigureAwait(false)` |
| 生命周期 | 用 `CancellationToken`，`OnDestroy` 取消 |
| 并发 | 无依赖用 `WhenAll`，有依赖串行，加信号量限流 |
| 与协程 | IO / 返回值 / 异常 → async；Unity 时间等待 → 协程也可 |
| 异常 | 必须有人接，否则就是线上幽灵 bug |

`async/await` 的语法很简单，难点全在**生命周期与异常**。写完一个异步方法，先问自己两个问题：**对象销毁了它还在跑吗？出错了有人知道吗？**
