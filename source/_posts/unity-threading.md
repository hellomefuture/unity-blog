---
title: '线程、线程池与 Task'
date: 2026-10-28 16:08:59
categories:
  - Unity开发
tags:
  - Unity
  - 线程
  - Task
  - 并发
cover: /img/covers/c2.svg
top_img: /img/covers/c2.svg
description: 'Unity 有一个绕不开的限制：几乎所有引擎 API 只能在主线程调用。'
---
## 文档简介

Unity 有一个绕不开的限制：**几乎所有引擎 API 只能在主线程调用**。

但很多工作又必须放到后台：加载大文件、解析配置、网络收发、A* 寻路、图片解码。于是"怎么开线程、怎么回主线程、什么时候该用 `Thread` 什么时候用 `Task`"就成了必修课。

本文讲清三者的区别、线程安全、以及 Unity 里最安全的用法。

---

## 1 先看清 Unity 的线程规则

| 能在子线程调用 | 不能在子线程调用 |
| --- | --- |
| 纯 C# 逻辑（数学、集合、字符串） | `Transform`、`GameObject`、`Component` |
| `Mathf` 的大部分静态方法 | `Instantiate` / `Destroy` |
| 自己写的纯数据类 | `Debug.Log`（部分版本可以，但不建议） |
| 文件 IO、网络 IO | UGUI 相关、材质、贴图上传 |

**为什么**：Unity 的很多对象内部状态没有做线程保护，跨线程访问会崩或者出现随机错误。

所以标准模式是：

```
子线程：做重计算 / IO
   ↓ 结果排队
主线程：消费结果，操作 Unity 对象
```

---

## 2 Thread

最原始的方式，一个 `Thread` 对应一个操作系统线程。

```csharp
var thread = new Thread(() =>
{
    // 后台线程：做计算
    var result = HeavyCompute();

    // 结果交回主线程（不能直接操作 UI）
    lock (_queue) { _queue.Enqueue(result); }
});
thread.IsBackground = true;   // 主线程退出时自动结束
thread.Start();
```

### 2.1 优缺点

| 优点 | 缺点 |
| --- | --- |
| 控制最精细（优先级、是否后台） | 创建/销毁开销大（毫秒级） |
| 适合**长时间常驻**的任务 | 数量一多就占满 CPU 与内存 |
| 不依赖线程池 | 异常不会自动传播到主线程 |

**适合**：网络接收循环、常驻后台服务、需要长时间阻塞的 IO。

**不适合**：一次性小任务（用线程池/Task）。

### 2.2 常见错误

```csharp
// ❌ 在子线程碰 Unity 对象
new Thread(() => {
    transform.position = Vector3.zero;   // 崩
}).Start();

// ✅ 转回主线程
new Thread(() => {
    var pos = ComputePosition();
    _mainThreadQueue.Enqueue(() => transform.position = pos);
}).Start();
```

---

## 3 ThreadPool

线程池维护一组可复用线程，避免频繁创建销毁。

```csharp
ThreadPool.QueueUserWorkItem(_ =>
{
    var data = LoadFile(path);
    lock (_queue) { _queue.Enqueue(data); }
});
```

### 3.1 特点

| 点 | 说明 |
| --- | --- |
| 线程复用 | 任务结束后线程回池，不销毁 |
| 数量自动调节 | 默认最小线程数较小，会慢慢增加 |
| 不能设置优先级 | 也不适合长阻塞任务 |
| 不适合常驻 | 长时间占用会拖垮整个池 |

**适合**：大量短小的后台任务（如批量解码、批量计算）。

**注意**：如果往池里扔了阻塞任务（如 `Thread.Sleep`、同步网络读），池会被占满，后续任务全部排队。

### 3.2 调整线程数

```csharp
ThreadPool.SetMinThreads(8, 8);
ThreadPool.SetMaxThreads(32, 32);
```

移动端建议保守，线程太多反而增加调度开销。

---

## 4 Task

`Task` 是基于线程池的任务抽象，带返回值、异常传播、取消、组合能力。

```csharp
// 有返回值
Task<int> task = Task.Run(() =>
{
    return HeavyCompute();          // 在线程池执行
});
int result = await task;            // 回到调用方继续

// 无返回值
await Task.Run(() => ParseBigFile(path));
```

### 4.1 Task 比 Thread 好在哪

| 能力 | Thread | Task |
| --- | --- | --- |
| 返回值 | 要自己封装 | `Task<T>` 原生支持 |
| 异常传播 | 要自己捕获再转交 | 自动包装，`await` 时抛出 |
| 取消 | 自己实现 | `CancellationToken` |
| 组合 | 无 | `WhenAll` / `WhenAny` / `ContinueWith` |
| 线程管理 | 自己创建 | 复用线程池 |

### 4.2 组合多个任务

```csharp
// 并行执行，全部完成后继续
var t1 = Task.Run(() => LoadConfig());
var t2 = Task.Run(() => LoadAudio());
var t3 = Task.Run(() => LoadTextures());
await Task.WhenAll(t1, t2, t3);
```

`Task.WhenAll` 不会因为某个任务失败就中断其他任务，但 `await` 时会抛出第一个异常。

### 4.3 取消

```csharp
private CancellationTokenSource _cts = new();

async Task LongRunningAsync()
{
    try
    {
        for (int i = 0; i < 1000; i++)
        {
            _cts.Token.ThrowIfCancellationRequested();
            await DoStepAsync(i);
        }
    }
    catch (OperationCanceledException)
    {
        Core.Log.Info("任务已取消");
    }
}

// 需要在 OnDestroy 里取消，避免对象销毁后回调还在跑
void OnDestroy() => _cts.Cancel();
```

---

## 5 线程安全

### 5.1 共享数据的三种处理

| 方式 | 适用 |
| --- | --- |
| `lock` | 简单临界区，读写都要加锁 |
| `ConcurrentQueue<T>` / `ConcurrentDictionary<K,V>` | 高频生产者-消费者 |
| 不可变数据（复制一份传出去） | 读多写少 |

```csharp
private readonly ConcurrentQueue<Action> _mainThreadActions = new();

// 子线程：投递
_mainThreadActions.Enqueue(() => UpdateUI(result));

// 主线程
void Update()
{
    while (_mainThreadActions.TryDequeue(out var action))
        action();
}
```

### 5.2 死锁的常见成因

| 成因 | 例子 |
| --- | --- |
| 嵌套加锁顺序不一致 | 线程 A 锁 X 再等 Y，线程 B 锁 Y 再等 X |
| 在锁内做阻塞调用 | `lock` 里 `await` / `Thread.Sleep` |
| 主线程等子线程、子线程等主线程 | 子线程里 `Invoke` 同步等待主线程 |

**规则**：锁内只做内存操作，不做 IO、不做 await、不调用外部回调。

---

## 6 线程池与 Task 的区别（容易混）

| | ThreadPool | Task |
| --- | --- | --- |
| 本质 | 线程集合 | 任务抽象，默认跑在线程池上 |
| 返回值 | 无 | `Task<T>` |
| 异常 | 吞掉或崩溃 | 捕获后由 await 抛出 |
| 组合 | 无 | WhenAll / WhenAny |
| 取消 | 无 | CancellationToken |
| 能否指定长任务 | 不建议 | `TaskCreationOptions.LongRunning` |

**结论**：新代码优先用 `Task`，只有需要精细控制线程时才用 `Thread`。`ThreadPool` 一般不用直接碰。

---

## 7 Unity 里的实践建议

### 7.1 主线程调度器

建议封装一个统一入口，所有跨线程回调都走它：

```csharp
public static class MainThreadDispatcher
{
    private static readonly ConcurrentQueue<Action> _queue = new();

    public static void Post(Action action) => _queue.Enqueue(action);

    public static void Pump()          // 由 Update 调用
    {
        while (_queue.TryDequeue(out var a))
        {
            try { a(); }
            catch (Exception e) { Core.Log.Error($"主线程回调异常: {e}"); }
        }
    }
}
```

**关键**：每个回调都要 `try/catch`，否则一个异常会中断整个队列。

### 7.2 什么该放后台

| 任务 | 是否放后台 |
| --- | --- |
| 文件读写 | ✅ |
| 网络收发 | ✅ |
| 大 JSON / 配置解析 | ✅ |
| A* 寻路（大量节点） | ✅（或用分帧） |
| 图片解码 | ✅ |
| 创建 GameObject | ❌ 必须主线程 |
| 修改 Transform | ❌ |
| UI 刷新 | ❌ |

### 7.3 分帧 vs 多线程

不是所有卡顿都要靠线程解决：

| 场景 | 更合适的方案 |
| --- | --- |
| 大量对象初始化 | **分帧**（每帧处理 N 个） |
| 地图生成 | 分帧 + 协程 |
| 纯计算（寻路、聚类） | 多线程 |
| IO（读盘、下载） | 异步 IO |

分帧的好处是**不引入线程安全问题**，代价是总耗时被拉长。地牢生成这种"要生成但不急着用"的场景，分帧往往比多线程更稳。

---

## 8 常见坑

| 坑 | 表现 | 解决 |
| --- | --- | --- |
| 子线程碰 Unity API | 随机崩溃 / 报 "can only be called from main thread" | 统一走主线程调度器 |
| 忘了取消 Task | 对象销毁后回调仍在执行，报空引用 | `OnDestroy` 里 `Cancel()` |
| 线程池塞满阻塞任务 | 后续任务长时间不执行 | 长任务用 `Thread` 或 `LongRunning` |
| 锁内 await | 死锁 | 锁内只做内存操作 |
| 大量 `new Thread` | 线程数暴涨、切换开销大 | 用池或 Task |
| 异常被吞 | 任务静默失败 | 回调统一 try/catch + 日志 |
| 移动端开太多线程 | 发热、掉帧 | 限制并发数（一般 2-4 个后台线程足够） |

---

## 9 小结

| 要点 | 结论 |
| --- | --- |
| 规则 | Unity API 只在主线程，子线程只做纯计算与 IO |
| Thread | 常驻、长任务、需精细控制 |
| ThreadPool | 大量短任务，别塞阻塞任务 |
| Task | 首选，带返回值 / 异常 / 取消 / 组合 |
| 回主线程 | 统一队列 + 每帧 Pump |
| 线程安全 | 锁内不做 IO / await；高频用并发集合 |
| 取舍 | 能用分帧解决就别开线程 |

多线程的收益是"把耗时挪走"，代价是"引入并发问题"。**先问自己：这个卡顿能不能用分帧解决？** 能的话，往往比开线程更划算。
