# 委托（Delegate）详解

## 一、核心本质

**委托** = 存储方法的引用类型。把方法当成数据传递，是安全的函数指针。委托是事件的底层基础。

## 二、自定义委托

### 声明和调用

```csharp
// 声明委托（返回值 + 参数必须和方法完全一致）
delegate void MyDelegate(string msg);

// 使用
MyDelegate del = Debug.Log;
del("Hello");
```

### 多播委托

一个委托绑定多个方法，`+=` 添加，`-=` 删除。

```csharp
MyDelegate del = MethodA;
del += MethodB;
del("调用"); // MethodA 和 MethodB 都会执行
```

## 三、系统内置委托

### Action：无返回值

```csharp
Action<string> log = ShowLog;

static void ShowLog(string s)
{
    Console.WriteLine(s);
}
```

### Func：有返回值（最后一个类型参数 = 返回值类型）

```csharp
Func<int, int, int> add = CalcAdd;

static int CalcAdd(int a, int b)
{
    return a + b;
}
```

## 四、极简总结

1. 委托 = 存方法的引用类型
2. Action = 无返回值，Func = 有返回值
3. 多播：+= 绑定，-= 取消