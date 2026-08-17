# C# 事件详解

## 一、核心本质

**事件** = 被严格封装的多播委托。事件基于委托而生，目的是限制权限、更安全，实现**订阅 / 发布**模式。

## 二、为什么有了委托还需要事件？

### 普通多播委托的安全漏洞

```csharp
public Action MyDel;  // 普通委托
```

外部可以随便操作：
- 外部直接 `MyDel = 方法` → 覆盖清空所有已绑定的方法
- 外部随便 `MyDel.Invoke()` → 强行触发你的内部逻辑

**事件就是来锁权限的：**

```csharp
public event Action MyEvent;  // 事件
```

事件强制限制三条铁律：
1. 外部不能用 `=` 赋值，只能用 `+=` 订阅、`-=` 取消订阅
2. 外部不能直接 Invoke / 调用事件
3. 只有声明事件的类内部才能触发事件

> **一句话：** 委托是「公开随便玩」，事件是「只允许订阅，不允许乱改、乱调用」

## 三、标准案例：热水器烧水事件

**场景：** 水温达标 → 触发报警事件 → 闹钟、手机订阅执行

### 1. 发布者（热水器）

```csharp
using System;

namespace EventDemo
{
    class Heater
    {
        // 定义事件：基于 Action 无参数委托
        public event Action BoilEvent;

        public void BoilWater()
        {
            Console.WriteLine("水温达到100度！");
            
            // 本类内部触发事件
            BoilEvent?.Invoke();
        }
    }
}
```

### 2. 订阅者

```csharp
class Program
{
    static void Alarm()
    {
        Console.WriteLine("闹钟响了：水开了！");
    }

    static void PhoneTip()
    {
        Console.WriteLine("手机推送：水开了！");
    }
}
```

### 3. 订阅 + 运行

```csharp
static void Main(string[] args)
{
    Heater heater = new Heater();

    // 外部订阅事件 +=
    heater.BoilEvent += Alarm;
    heater.BoilEvent += PhoneTip;

    // 执行烧水 → 内部自动触发事件
    heater.BoilWater();

    // 取消订阅 -=
    heater.BoilEvent -= Alarm;
}
```

**输出：**
```
水温达到100度！
闹钟响了：水开了！
手机推送：水开了！
```

完美多播效果：一个事件触发，多个方法自动执行。

## 四、事件权限测试

```csharp
// ❌ 事件不允许外部直接赋值
// heater.BoilEvent = Alarm;   // 编译报错

// ❌ 外部不能调用/Invoke事件
// heater.BoilEvent?.Invoke(); // 编译报错

// ✅ 只能内部触发（Heater 类里面写 BoilEvent?.Invoke()）
```

## 五、带参数的事件

```csharp
class Heater
{
    // 带参数事件：传递 int 温度
    public event Action<int> BoilEvent;

    public void BoilWater()
    {
        int temp = 100;
        BoilEvent?.Invoke(temp);  // 触发时传参
    }
}

// 订阅方法匹配参数
static void Alarm(int t)
{
    Console.WriteLine($"当前温度：{t} 度，水开了");
}
```

## 六、委托 VS 事件终极对比

| 对比 | 委托（Action/Func） | 事件（event） |
|------|---------------------|---------------|
| 关键字 | 无 | 必须加 event |
| 外部赋值 | 允许 `=` 覆盖 | 只允许 `+=` / `-=` |
| 外部调用 | 可以直接 Invoke | 禁止外部调用 |
| 安全性 | 低 | 高 |
| 用途 | 回调、临时方法传递 | UI控件、通知、发布订阅 |
| 关系 | 底层基础 | 委托的封装升级版 |

## 七、总结

1. 事件 = 封装后的多播委托，必须依赖委托
2. 关键字：`public event 委托类型 事件名`
3. 触发：只能在**本类内部** `事件名?.Invoke()`
4. 订阅：外部只能 `+=` 方法，取消 `-=` 方法