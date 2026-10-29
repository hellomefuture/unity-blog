---
title: '网络基础：TCP 与 UDP'
date: 2026-10-28 16:07:16
categories:
  - Unity开发
tags:
  - Unity
  - 网络
  - TCP
  - UDP
cover: /img/covers/c4.svg
top_img: /img/covers/c4.svg
description: '做联网游戏躲不开两个问题：用 TCP 还是 UDP、怎么把消息发对。'
---
## 文档简介

做联网游戏躲不开两个问题：**用 TCP 还是 UDP**、**怎么把消息发对**。

前者决定延迟与可靠性，后者决定你的协议会不会出现"两条消息粘在一起""一条消息被拆成两半"这种看起来莫名其妙的问题。

本文讲清 TCP / UDP 的本质差异、粘包拆包的成因与解法，以及在 Unity 里的落地方式。

---

## 1 TCP 与 UDP 的本质差异

| 维度 | TCP | UDP |
| --- | --- | --- |
| 连接 | 面向连接（三次握手） | 无连接，直接发 |
| 可靠性 | 保证送达、保证顺序 | 不保证送达、不保证顺序 |
| 重传 | 自动重传 | 不重传 |
| 拥塞控制 | 有（会主动降速） | 无 |
| 头部开销 | 20 字节起 | 8 字节 |
| 延迟 | 较高（等确认、等重传） | 低 |
| 适用 | 回合制、登录、聊天、状态同步 | 实时对战、FPS、MOBA 的移动数据 |

### 1.1 为什么实时游戏偏爱 UDP

TCP 有一个致命特性：**队头阻塞（Head-of-Line Blocking）**。

假设发了包 1、2、3，包 2 丢了：

```
TCP：必须等包 2 重传成功，包 3 才能交给应用层 → 延迟卡住
UDP：包 2 丢了就丢了，包 3 立即可用 → 只丢一帧数据
```

对 FPS 来说，"丢掉一帧位置"远比"整体卡住 200ms"可接受。

### 1.2 但 UDP 需要自己做可靠性

UDP 不保证送达，所以实时游戏通常在 UDP 之上自己实现：

| 机制 | 作用 |
| --- | --- |
| 序列号 | 判断丢包与乱序 |
| 冗余包 | 每个包带上前几帧数据，丢一个还能恢复 |
| 选择性重传 | 只重传关键消息（如技能释放） |
| 心跳 | 检测连接是否存活 |

这也是为什么很多项目直接用 **KCP / Enet / LiteNetLib** 这类可靠 UDP 库，而不是从零写。

---

## 2 粘包与拆包

### 2.1 问题从哪来

TCP 是**字节流**，不是"消息流"。它只保证字节按序到达，**不保证一次 Receive 对应一次 Send**。

```
发送方 Send("AAA")、Send("BBBB")
接收方可能一次收到 "AAABBBB"     ← 粘包
也可能先收到 "AA"、再收到 "ABBBB"  ← 拆包
```

UDP 不会粘包（有消息边界），但会丢包和乱序。

### 2.2 三种解法

**方案 1：长度前缀（最常用）**

每条消息前写 4 字节长度：

```
[4 字节长度][消息体][4 字节长度][消息体]...
```

```csharp
// 发送
byte[] body = Encoding.UTF8.GetBytes(json);
using var ms = new MemoryStream();
using var w = new BinaryWriter(ms);
w.Write(body.Length);     // 先写长度
w.Write(body);            // 再写内容
stream.Write(ms.ToArray());

// 接收
int length = reader.ReadInt32();
byte[] body = new byte[length];
int read = 0;
while (read < length)
    read += stream.Read(body, read, length - read);   // 必须循环读满
```

**关键**：`Read` 可能只读到一部分，必须**循环读到长度满足为止**。

**方案 2：分隔符**

用特殊字符（如 `\n`）分隔，缺点是消息体里不能出现该字符，需要转义。

**方案 3：定长包**

每条消息固定长度（如 64 字节），简单但浪费带宽，只适合小消息。

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| 长度前缀 | 通用、高效 | 需要处理长度字段本身 |
| 分隔符 | 可读性好 | 需要转义 |
| 定长 | 实现最简单 | 浪费带宽 |

---

## 3 协议设计要点

### 3.1 消息结构

一个实用的消息头：

```
[长度 4B][消息 ID 2B][序号 4B][消息体 ...]
```

| 字段 | 作用 |
| --- | --- |
| 长度 | 拆包依据 |
| 消息 ID | 决定用哪个 Handler 解析 |
| 序号 | 去重、检测乱序、做重传 |
| 消息体 | Protobuf / JSON / 自定义二进制 |

### 3.2 序列化选型

| 方式 | 体积 | 速度 | 可读性 | 适用 |
| --- | --- | --- | --- | --- |
| JSON | 大 | 中 | 高 | 调试、配置、低频消息 |
| Protobuf | 小 | 快 | 低 | 生产环境主流 |
| 自定义二进制 | 最小 | 最快 | 无 | 高频同步数据 |

**实时游戏的高频包不要用 JSON**：字段名冗余会让带宽翻倍。

### 3.3 心跳与超时

```csharp
// 客户端：每 5 秒发一次心跳
async Task HeartbeatLoop(CancellationToken token)
{
    while (!token.IsCancellationRequested)
    {
        Send(MessageId.Heartbeat, Array.Empty<byte>());
        await Task.Delay(5000, token);
    }
}

// 服务端：超过 15 秒没收到任何包 → 判定掉线
```

没有心跳，客户端断网后可能长时间"以为还连着"。

### 3.4 断线重连

| 场景 | 处理 |
| --- | --- |
| 网络短暂抖动 | 指数退避重连（1s、2s、4s、8s） |
| 服务器主动踢下线 | 提示原因，不自动重连 |
| 重连成功 | 重新同步状态（不能假设客户端状态还有效） |

---

## 4 Unity 中的实现方式

### 4.1 千万不要在主线程做阻塞 IO

```csharp
// ❌ 错误：同步阻塞读，直接把主线程卡死
stream.Read(buffer, 0, buffer.Length);
```

正确做法：**网络 IO 放到后台线程或异步任务**，收到的消息投递回主线程处理。

```csharp
async Task ReceiveLoop(CancellationToken token)
{
    var buffer = new byte[4096];
    while (!token.IsCancellationRequested)
    {
        int bytes = await stream.ReadAsync(buffer, 0, buffer.Length, token);
        if (bytes == 0) break;                     // 对端关闭

        var messages = Parse(buffer, bytes);        // 后台线程解析
        lock (_queue)
        {
            foreach (var m in messages) _queue.Enqueue(m);
        }
    }
}

// 主线程每帧处理
void Update()
{
    lock (_queue)
    {
        while (_queue.Count > 0)
            Dispatch(_queue.Dequeue());            // 这里才能碰 Unity API
    }
}
```

### 4.2 Unity 的网络 API 选择

| 方案 | 说明 | 适用 |
| --- | --- | --- |
| `System.Net.Sockets.Socket` | 最底层，最灵活 | 需要自定义协议 |
| `TcpClient` / `NetworkStream` | 封装好的 TCP 流 | 长连接、低频消息 |
| `UdpClient` | 封装好的 UDP | 实时数据 |
| Unity Netcode / Mirror / Photon | 成品联网框架 | 不想自己写同步 |

**WebGL 注意**：浏览器不支持裸 Socket，只能用 WebSocket。

### 4.3 一个最小的 TCP 客户端骨架

```csharp
public class TcpClientService
{
    private TcpClient _client;
    private NetworkStream _stream;
    private readonly ConcurrentQueue<byte[]> _received = new();
    private CancellationTokenSource _cts;

    public async Task ConnectAsync(string host, int port)
    {
        _client = new TcpClient();
        await _client.ConnectAsync(host, port);
        _stream = _client.GetStream();
        _cts = new CancellationTokenSource();
        _ = ReceiveLoop(_cts.Token);
    }

    private async Task ReceiveLoop(CancellationToken token)
    {
        var buffer = new byte[8192];
        while (!token.IsCancellationRequested)
        {
            int n = await _stream.ReadAsync(buffer, token);
            if (n == 0) { OnDisconnected(); return; }
            foreach (var msg in FrameDecoder.Decode(buffer, n))
                _received.Enqueue(msg);
        }
    }

    public void Update()   // 主线程调用
    {
        while (_received.TryDequeue(out var msg))
            HandleMessage(msg);
    }
}
```

---

## 5 常见问题排查

| 现象 | 原因 | 排查 |
| --- | --- | --- |
| 收到的数据"对不上" | 粘包拆包没处理 | 打日志看实际字节长度 |
| 消息偶尔乱序 | 用了 UDP 却没做序号 | 加序号并排序 |
| 客户端假在线 | 没心跳 | 加心跳 + 超时踢线 |
| 主线程卡顿 | 同步 Read 阻塞 | 改异步 / 后台线程 |
| 真机连不上、编辑器能连 | 权限 / 地址问题 | Android 需 `INTERNET` 权限；模拟器地址不是 localhost |
| 大包发送失败 | 超过 MTU | 拆分成小于 1400 字节的包 |
| WebGL 连不上 | 浏览器不支持 TCP Socket | 改用 WebSocket |

---

## 6 小结

| 要点 | 结论 |
| --- | --- |
| TCP vs UDP | 要可靠用 TCP，要低延迟用 UDP（自己做可靠性） |
| 粘包 | TCP 是字节流，必须靠长度前缀 / 分隔符 / 定长切分 |
| 协议 | 长度 + 消息 ID + 序号 + 消息体 |
| IO 线程 | 网络 IO 绝不能在主线程阻塞 |
| Unity API | Unity API 只能在主线程调用，收到的消息排队回主线程 |
| 心跳 | 必须做，否则断网后无法感知 |
| 大包 | 单包控制在 MTU 以内，超了要拆 |

网络编程的坑，八成出在两件事上：**没有消息边界**、**在主线程做阻塞 IO**。把这两点处理好，剩下的就是协议设计的事了。
