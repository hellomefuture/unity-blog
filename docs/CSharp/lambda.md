# 匿名函数与 Lambda 表达式

## 一、匿名函数

### 核心本质

匿名函数 = **没有方法名的临时方法**，必须依托**委托 / 事件**使用。

- 关键字：`delegate`
- 作用：简化一次性临时逻辑
- 定义是一次性的，但存入委托后可反复执行

### 基础语法

```csharp
// 无返回值 Action + 匿名函数
Action act = delegate ()
{
    Console.WriteLine("匿名函数执行");
};
act.Invoke();

// 有返回值 Func + 匿名函数
Func<int, int> square = delegate (int n)
{
    return n * n;
};
Console.WriteLine(square(5));
```

### 关键规则

1. 普通方法**禁止嵌套**（方法里不能写普通方法）
2. 匿名函数**允许写在方法内部**（Main 里也可以）
3. 无名字，无法独立复用，定义一次性
4. 签名必须和委托完全匹配（参数、返回值）

## 二、Lambda 表达式

### 核心本质

Lambda = **匿名函数的极简简化版**，专门搭配 `Action / Func / 事件` 使用。

核心符号：`=>`（Lambda 运算符）

### 语法进化链路

```csharp
// 普通方法（繁琐）
void Test() { }

// 匿名函数（中等）
Action a = delegate () { };

// Lambda（最简）
Action a = () => { };
```

### 三套标准语法

**① 无参数**
```csharp
Action act = () => { 逻辑 };
```

**② 单个参数（可省略括号）**
```csharp
Action<string> act = s => { Console.WriteLine(s); };
```

**③ 多个参数**
```csharp
Func<int, int, int> func = (a, b) => { return a + b; };
```

### 三大简化铁律

| 条件 | 简化规则 |
|------|----------|
| 单个参数 | 可省略小括号 `()` |
| 方法体只有一行 | 可省略大括号 `{}` |
| Func 单行返回 | 可省略 `return` 关键字 |

```csharp
// 完整写法
Func<int, int> f = (n) => { return n * 2; };

// 终极简化
Func<int, int> f = n => n * 2;

// 多播 lambda
Action act = () => Console.WriteLine("1");
act += () => Console.WriteLine("2");
act();
```

## 三、Lambda 闭包陷阱

### 核心本质

Lambda / 匿名函数**捕获的是变量引用，不是变量当前值**。所有内部 Lambda 共享同一个循环变量，执行时统一读取最终值。

### 经典错误代码

```csharp
static Action ret()
{
    Action act = () => Console.WriteLine($"{1}");
    for (int i = 2; i <= 10; i++)
    {
        act += () => Console.WriteLine($"{i}");
    }
    return act;
}

static void Main(string[] args)
{
    ret()();
}
```

**输出结果：** `1` 后面全部打印 `10`

**错误原理：**
1. 循环变量 `i` 只有**一份内存地址**
2. 所有 Lambda 全部捕获 `i` 的引用
3. 循环结束 `i = 10`
4. 最后统一执行时，全部读取最终值 `10`

### 修复方案

在循环内部**定义临时局部变量**，让每次循环生成独立变量：

```csharp
static Action ret()
{
    Action act = () => Console.WriteLine($"{1}");
    for (int i = 2; i <= 10; i++)
    {
        int temp = i;   // 每次循环新建独立变量
        act += () => Console.WriteLine($"{temp}");
    }
    return act;
}
```

### 背诵总结

1. 闭包捕获**变量引用**，不是瞬时值
2. 循环拼接 Lambda 必踩此坑
3. 解决方案：循环内定义临时变量
4. 委托可复用、多次执行

## 四、练习

**题目：** 使用 `Action<int>` 打印传入数字，使用 `Func<double,double>` 返回数值的一半

**参考答案：**
```csharp
Action<int> printNum = n => Console.WriteLine($"数字：{n}");
Func<double, double> getHalf = num => num / 2;

printNum(99);
Console.WriteLine(getHalf(20));
```