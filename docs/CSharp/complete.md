# C# 知识完全指南

> 从入门到进阶，系统掌握 C# 编程语言

<!-- 目录仅用于视觉导航，实际页面导航请使用右侧大纲 -->

---

# 一、入门篇

## 1.1 变量

### 命名规范

1. 不能重名
2. 不能数字开头
3. 不能使用程序关键字命名
4. 不能有特殊符号（下划线除外）

```csharp
string myName;
string mySex;
double myATK = 10000d;
double myDef = 100000d;
```

### 常用命名规则

| 规则 | 说明 | 示例 |
|------|------|------|
| 驼峰命名法 | 首字母小写，之后单词首字母大写 | `myName`、`mySex` |
| 帕斯卡命名法 | 所有单词首字母都大写（函数/类） | `MyClass`、`ShowInfo` |

> C# 是大小写敏感的。变量名要有意义，不建议用汉字命名。

## 1.2 常量

关键字：`const`

```csharp
const int i2 = 20;
```

### 特点

1. 必须初始化
2. 不能被修改

> 作用：声明一些常用不变的变量。

## 1.3 类型转换

### 显式转换

将高精度转换为低精度（不强制转换时会报错）。

| 方式 | 说明 | 示例 |
|------|------|------|
| 括号强转 | 数值之间的转换 | `(int)3.14` |
| Parse法 | 字符串转对应类型 | `int.Parse("123")` |
| Convert法 | 通用转换方法 | `Convert.ToInt32("123")` |

```csharp
int i = (int)3.14;
i = int.Parse("123");
i = Convert.ToInt32("123");
```

## 1.4 异常捕获

```csharp
string str = Console.ReadLine();

try
{
    int i = int.Parse(str);
}
catch (Exception e)
{
    Console.WriteLine("出错了：" + e.Message);
}
finally
{
    Console.WriteLine("无论如何都会执行");
}
```

> 通过对异常捕获的学习，可以避免当代码报错时造成程序卡死的情况。

### try-catch-finally 执行流程

| 情况 | try | catch | finally |
|------|-----|-------|---------|
| 没有异常 | ✅ 执行 | ❌ 跳过 | ✅ 执行 |
| 有异常且捕获成功 | 中断 | ✅ 执行 | ✅ 执行 |
| 有异常未捕获 | 中断 | ❌ 跳过（崩溃） | ✅ 仍然执行 |

### 多个 catch 分支

```csharp
try
{
    string str = Console.ReadLine();
    int num = int.Parse(str);
    int result = 100 / num;
}
catch (FormatException)
{
    Console.WriteLine("输入的不是有效数字");
}
catch (DivideByZeroException)
{
    Console.WriteLine("不能除以0");
}
catch (Exception e)
{
    Console.WriteLine("其他错误：" + e.Message);
}
```

### 自定义异常

```csharp
public class AgeOutOfRangeException : Exception
{
    public AgeOutOfRangeException(string message) : base(message) { }
}

void SetAge(int age)
{
    if (age < 0 || age > 150)
        throw new AgeOutOfRangeException("年龄必须在 0~150 之间");
    Console.WriteLine($"设置年龄为：{age}");
}

try
{
    SetAge(200);
}
catch (AgeOutOfRangeException e)
{
    Console.WriteLine(e.Message);
}
```

## 1.5 控制台输入输出

```csharp
Console.WriteLine();    // 输出并自动换行
Console.Write();        // 输出不换行
Console.ReadLine();     // 等待输入直到按回车
Console.ReadKey();      // 按任意键继续
```

## 1.6 随机数

```csharp
Random r = new Random();

int i = r.Next();         // 非负随机整数
int j = r.Next(100);      // 0~99（左包含，右不包含）
int k = r.Next(5, 100);   // 5~99
```

---

# 二、基础篇

## 2.1 参数默认值与变长参数（params）

### 参数默认值（可选参数）

给方法的参数提前设置默认值，调用时传参数就用传入值，不传就自动用默认值。

```csharp
// 必选参数在前，带默认值的可选参数在后
返回值 方法名(类型 必选参数, 类型 参数名 = 默认值)
```

```csharp
using System;

class Program
{
    static void Main()
    {
        PrintInfo("小明", 18);
        PrintInfo("小红");
        PrintInfo();
    }

    static void PrintInfo(string name = "游客", int age = 20)
    {
        Console.WriteLine($"姓名：{name}，年龄：{age}");
    }
}
```

**输出：**
```
姓名：小明，年龄：18
姓名：小红，年龄：20
姓名：游客，年龄：20
```

#### 硬性规则

1. 可选参数必须放在所有必选参数的最后面
2. 可以有多个可选参数
3. 调用时可传、可省略，省略就用默认值

### 变长参数（params）

允许传任意数量的同类型参数，编译器自动打包成数组。

```csharp
返回值 方法名(params 类型[] 参数名)
```

```csharp
using System;

class Program
{
    static void Main()
    {
        Console.WriteLine(Add(10));                // 10
        Console.WriteLine(Add(1, 2, 3));           // 6
        Console.WriteLine(Add(10, 20, 30, 40, 50)); // 150
    }

    static int Add(params int[] numbers)
    {
        int total = 0;
        foreach (int num in numbers) total += num;
        return total;
    }
}
```

也可传入数组：

```csharp
int[] arr = { 100, 200, 300 };
int sum = Add(arr);  // 600
```

#### 硬性规则

1. 一个方法只能有一个 params 参数
2. params 必须修饰一维数组
3. params 必须放在所有参数的最后一位
4. 可传多个值、可传数组、可不传

### 两者一起用

```csharp
// 顺序：必选参数 → 默认参数 → params（最后）
void Test(int a, string b = "默认", params int[] c) { }
```

### 新手必避 3 大坑

| 错误 | 正确 |
|------|------|
| `void Test(string name = "游客", int age)` | `void Test(int age, string name = "游客")` |
| `void Test(params int[] a, string b)` | `void Test(string b, params int[] a)` |
| `void Test(params int[] a, params string[] b)` | 一个方法只能有一个 params |

## 2.2 里氏替换原则

### 核心本质

**里氏替换原则** = 子类必须能够替换掉父类，程序逻辑不发生改变。

核心代码写法：**父类引用指向子类对象**，是多态的核心基础，面向对象设计的六大原则之一。

### 核心规则（铁律）

1. 子类可以扩展父类的功能，但不能改变父类原有的功能
2. 父类能出现的地方，子类一定能出现
3. 反向不成立：子类引用不能指向父类对象
4. 接口/抽象类完全适用里氏替换

### 标准写法

```csharp
class Person { }
class Student : Person { }

// ✅ 里氏替换（正确）
Person p = new Student();

// ❌ 错误（子类引用指向父类对象，编译报错）
// Student s = new Person();
```

### 核心作用

1. 实现多态的基础
2. 增强程序的可扩展性、可维护性
3. 遵循面向对象的设计规范

### 小练习

题目：里氏替换原则的核心代码写法是（ ）

A. 子类引用指向父类对象  B. 父类引用指向子类对象  C. 随便写都可以  D. 接口不能使用里氏替换

> **你的答案：** B
>
> ✅ **批改：完全正确**。里氏替换的核心就是父类引用指向子类对象，是多态的标准写法。

---

# 三、集合与泛型篇

## 3.1 非泛型集合

这 4 个是 C# 古老的**非泛型集合**，统一存储 `object`，存在**装箱拆箱**，现代 C# 已被泛型集合替代。

| 集合 | 特性 | 对应 C++ STL |
|------|------|-------------|
| ArrayList | 顺序存储，动态数组 | `std::vector` |
| Stack | 栈，后进先出 LIFO | `std::stack` |
| Queue | 队列，先进先出 FIFO | `std::queue` |
| Hashtable | 哈希表，键值对 | `std::unordered_map` |

### 逐个详解

```csharp
// ArrayList
ArrayList list = new ArrayList();
list.Add(10);           // 装箱
int a = (int)list[0];   // 拆箱

// Stack
Stack stack = new Stack();
stack.Push(1);
int val = (int)stack.Pop();

// Queue
Queue queue = new Queue();
queue.Enqueue(10);
int v = (int)queue.Dequeue();

// Hashtable
Hashtable table = new Hashtable();
table.Add("key1", "value1");
string str = (string)table["key1"];
```

> 开发中不再使用非泛型集合，全部用泛型集合替代。

## 3.2 泛型

### 核心本质

泛型 = **把数据类型当成参数传递**。`<T>` 是类型占位符，编译时确定具体类型。

**泛型 ≠ object**，无装箱拆箱、类型安全。

### 为什么要发明泛型？

非泛型（ArrayList）致命缺陷：

| ArrayList 的问题 | 泛型的解决 |
|------------------|-----------|
| 类型不安全，运行崩溃 | 编译期类型检测 |
| 装箱拆箱，性能极差 | 零装箱拆箱 |
| 代码无法复用 | 一份代码应对所有类型 |

### 标准写法

```csharp
// 泛型方法
static void Print<T>(T data)
{
    Console.WriteLine(data);
}

// 泛型类
class MyContainer<T>
{
    public T Value;
}

// 泛型集合（开发常用）
List<int> list = new List<int>();
Dictionary<string, int> dict = new Dictionary<string, int>();
Stack<float> stack = new Stack<float>();
Queue<string> queue = new Queue<string>();
```

### 泛型四大优点

1. **编译期类型安全**：类型不匹配直接报错
2. **零装箱拆箱**：高性能、零 GC 压力
3. **代码高度复用**：一个泛型类应对所有类型
4. **无需强制转换**：取值直接是目标类型

### C# 泛型 VS C++ 模板

| 对比 | C# 泛型 | C++ 模板 |
|------|---------|----------|
| 机制 | 运行时泛型 | 编译期文本替换 |
| 实例化 | 运行时生成 | 编译时展开 |

### 小练习

需求：手写一个泛型方法，接收任意类型参数并打印。

> **你的答案：**
> ```csharp
> static void Print<T>(T data)
> {
>     Console.WriteLine(data);
> }
> ```
>
> ✅ **批改：完全正确**

## 3.3 泛型约束 where

### 核心本质

泛型约束 = 限制泛型 T 的类型范围。不加约束 T 可以是任意类型；加约束后编译器知道 T 的能力，可调用方法/实例化。

### 四大约束（必考）

**① 引用类型约束 `where T : class`** — T 必须是类、string、接口等引用类型。

```csharp
void Test<T>(T obj) where T : class { }
```

**② 值类型约束 `where T : struct`** — T 必须是结构体、int、double 等值类型。

```csharp
void Demo<T>(T num) where T : struct { }
```

**③ 接口/父类约束 `where T : 接口名`** — T 必须实现接口/继承父类，可调用接口方法。

```csharp
void Work<T>(T t) where T : IWork { t.DoWork(); }
```

**④ 无参构造约束 `where T : new()`** — 允许 `new T()` 创建对象。

```csharp
T CreateInstance<T>() where T : new() { return new T(); }
```

### 多约束组合

顺序固定：`父类/接口` → `class/struct` → `new()`

```csharp
class Test<T> where T : IWork, class, new() { }
```

### 小练习

需求：写泛型类，约束 T 为引用类型 + 实现 Iword 接口 + 无参构造。

> ❌ **你的错误答案：**
> ```csharp
> class Person<T> where T : class, Iword
> {
>     public string Out() { return "001"; }
> }
> class Boy<T> : Person<T> { Console.WriteLine(); }
> ```
>
> ❌ **批改：**
> 1. 子类未继承泛型约束
> 2. 类内不能直接写执行代码
> 3. Person 未使用 T
>
> ✅ **正确代码：**
> ```csharp
> class Person<T> : Iword where T : class, Iword, new()
> {
>     public void Out() { }
> }
> class Boy<T> : Person<T> where T : class, Iword, new() { }
> ```

## 3.4 顺序存储 / 链式存储 / Dictionary

| 存储方式 | 内存布局 | 特点 | 代表 |
|----------|----------|------|------|
| 顺序存储 | 内存连续，数组实现 | 查快 O(1)，删慢 O(n) | `List<T>` |
| 链式存储 | 内存不连续，节点引用 | 删快 O(1)，查慢 O(n) | `LinkedList<T>` |
| Dictionary | 哈希数组 + 链表 | 平均 O(1) 查找 | `Dictionary<TKey,TValue>` |

```csharp
// List — 顺序存储
List<int> list = new List<int>();
list.Add(10);
Console.WriteLine(list[0]);  // O(1) 下标访问

// LinkedList — 链式存储
LinkedList<int> link = new LinkedList<int>();
link.AddFirst(1);
link.AddLast(99);

// Dictionary — 哈希表
Dictionary<string, int> dict = new Dictionary<string, int>();
dict.Add("苹果", 5);
Console.WriteLine(dict["苹果"]);  // O(1) 查找
```

### 终极对比

| 集合 | 存储结构 | 查找 | 增删 | 内存 |
|------|----------|------|------|------|
| `List<T>` | 顺序数组 | O(1) | O(n) | 连续 |
| `LinkedList<T>` | 双向链表 | O(n) | O(1) | 分散 |
| `Dictionary<TKey,TValue>` | 哈希混合 | O(1) | O(1) | 混合 |

## 3.5 泛型栈和队列

### Stack\<T\>（后进先出 LIFO）

```csharp
Stack<int> stack = new Stack<int>();
stack.Push(10);           // 入栈
stack.Push(20);
int top = stack.Peek();   // 20（查看不移除）
int val = stack.Pop();    // 20（移除并返回）
```

**应用场景：** 撤销操作（Ctrl+Z）、浏览器后退、括号匹配检测。

### Queue\<T\>（先进先出 FIFO）

```csharp
Queue<string> queue = new Queue<string>();
queue.Enqueue("A");       // 入队
queue.Enqueue("B");
string first = queue.Peek();    // "A"（查看不移除）
string val = queue.Dequeue();   // "A"（移除并返回）
```

**应用场景：** 消息队列、任务调度、网络请求排队。

---

# 四、委托与事件篇

## 4.1 委托（Delegate）

### 核心本质

委托 = **存储方法的引用类型**。把方法当成数据传递，是安全的函数指针。委托是事件的底层基础。

### 自定义委托

```csharp
delegate void MyDelegate(string msg);

MyDelegate del = Console.WriteLine;
del("Hello");

// 多播委托：一个委托绑定多个方法
MyDelegate del = MethodA;
del += MethodB;
del("调用");  // MethodA 和 MethodB 都会执行
```

### 系统内置委托

| 类型 | 说明 | 示例 |
|------|------|------|
| `Action<T>` | 无返回值，最多 16 个参数 | `Action<string> log = ShowLog;` |
| `Func<T, TResult>` | 有返回值，最后一个类型参数是返回值 | `Func<int, int, int> add = CalcAdd;` |

```csharp
// Action 示例
Action<string> log = ShowLog;
static void ShowLog(string s) => Console.WriteLine(s);

// Func 示例
Func<int, int, int> add = CalcAdd;
static int CalcAdd(int a, int b) => a + b;
```

### 小练习

1. 用 Action 写方法输出姓名年龄
2. 用 Func 写方法计算两数之和

> **你的答案：**
> ```csharp
> static void ShowInfo(string name, int age)
>     => Console.WriteLine($"姓名：{name}，年龄：{age}");
> static int CalcAdd(int a, int b) => a + b;
> 
> static void Main()
> {
>     Action<string, int> showInfo = ShowInfo;
>     showInfo("李四", 20);
>     Func<int, int, int> calcAdd = CalcAdd;
>     Console.WriteLine(calcAdd(15, 25));
> }
> ```
>
> ✅ **批改：满分正确**

## 4.2 空安全调用

### ?.Invoke()（空条件调用）

```csharp
showInfo?.Invoke("李四", 20);
// 等价于：if (showInfo != null) showInfo.Invoke("李四", 20);
```

### ??（空合并运算符）

```csharp
int result = calcAdd?.Invoke(15, 25) ?? 0;
// 左边为 null 时用右边默认值
```

### 可空值类型（T?）与空合并

值类型默认不能为 null，用 `T?` 使其可空。

```csharp
int? age = null;

if (age.HasValue)
    Console.WriteLine(age.Value);
else
    Console.WriteLine("年龄未设置");

// ?? 空合并
int actualAge = age ?? 18;

// ?. 空条件 + ?? 组合
string? name = GetName();
int length = name?.Length ?? 0;
```

## 4.3 事件（event）

### 为什么有了委托还需要事件？

❌ 普通多播委托有安全漏洞：

```csharp
public Action MyDel;
// 外部可以 MyDel = 方法A → 覆盖清空所有已绑定方法
// 外部可以 MyDel.Invoke() → 强行触发内部逻辑
```

✅ 事件用 `event` 关键字加锁：

```csharp
public event Action MyEvent;
// 外部只能用 += 订阅、-= 取消
// 外部不能 Invoke
// 只有声明事件的类内部才能触发
```

### 完整案例：热水器烧水事件

场景：水温达标 → 触发报警事件 → 闹钟、手机订阅执行。

```csharp
using System;

class Heater
{
    public event Action BoilEvent;

    public void BoilWater()
    {
        Console.WriteLine("水温达到100度！");
        BoilEvent?.Invoke();
    }
}

class Program
{
    static void Alarm() => Console.WriteLine("闹钟响了：水开了！");
    static void PhoneTip() => Console.WriteLine("手机推送：水开了！");

    static void Main()
    {
        Heater heater = new Heater();
        heater.BoilEvent += Alarm;
        heater.BoilEvent += PhoneTip;
        heater.BoilWater();
        heater.BoilEvent -= Alarm;
    }
}
```

**输出：**
```
水温达到100度！
闹钟响了：水开了！
手机推送：水开了！
```

### 事件权限测试

```csharp
// ❌ 事件不允许外部直接赋值
heater.BoilEvent = Alarm;       // 编译报错

// ❌ 外部不能 Invoke 事件
heater.BoilEvent?.Invoke();     // 编译报错

// ✅ 只能在 Heater 类内部触发
```

### 带参数的事件

```csharp
class Heater
{
    public event Action<int> BoilEvent;  // 带 int 参数

    public void BoilWater()
    {
        int temp = 100;
        BoilEvent?.Invoke(temp);
    }
}

static void Alarm(int t)
{
    Console.WriteLine($"当前温度：{t}度，水开了");
}
```

### 委托 VS 事件终极对比（面试必背）

| 对比 | 委托（Action/Func） | 事件（event） |
|------|---------------------|---------------|
| 关键字 | 无 | 必须加 `event` |
| 外部赋值 | 允许 `=` 覆盖 | 只允许 `+=` / `-=` |
| 外部调用 | 可以直接 Invoke | 禁止外部调用 |
| 安全性 | 低 | 高 |
| 用途 | 回调、临时方法传递 | UI 控件、通知、发布订阅 |
| 关系 | 底层基础 | 委托的封装升级版 |

### 小练习（Cat 类事件）

需求：写 Cat 类，定义无参数事件 MeowEvent，方法 Shout() 内部触发事件。写两个静态方法 CatSound()、OwnerTip()。Main 中实例化 Cat，订阅事件，调用 Shout 触发。

> ❌ **你的错误答案：**
> ```csharp
> class Cat
> {
>     public event Action MeowEvect;  // 拼写错误
>     public void Shout()
>     {
>         MeowEvect += CatSound;      // ❌ 发布者不能自己订阅
>         MeowEvect += OwnerTip;
>         MeowEvect?.Invoke();
>     }
>     private void CatSound() { }
>     private void OwnerTip() { }
> }
> ```
>
> ❌ **批改：**
> 1. 拼写错误：`MeowEvect` → `MeowEvent`
> 2. **发布者不能自己订阅自己**，订阅必须写在 Main 中
> 3. Cat 类不应该包含订阅方法
>
> ✅ **正确代码：**
> ```csharp
> class Cat
> {
>     public event Action MeowEvent;
>     public void Shout()
>     {
>         Console.WriteLine("猫叫了一声！");
>         MeowEvent?.Invoke();
>     }
> }
> 
> class Program
> {
>     static void CatSound() => Console.WriteLine("猫听见了");
>     static void OwnerTip() => Console.WriteLine("这个猫是我的");
> 
>     static void Main()
>     {
>         Cat cat = new Cat();
>         cat.MeowEvent += CatSound;
>         cat.MeowEvent += OwnerTip;
>         cat.Shout();
>     }
> }
> ```

---

# 五、进阶篇

## 5.1 匿名函数

### 核心本质

匿名函数 = **没有方法名的临时方法**，必须依托委托/事件使用。关键字：`delegate`

### 语法

```csharp
委托类型 变量 = delegate(参数列表)
{
    方法体逻辑
};
```

### 基础示例

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

1. 普通方法禁止嵌套，但匿名函数允许写在方法内部
2. 无名字，无法独立复用，定义一次性
3. 签名必须和委托完全匹配（参数、返回值）
4. 逻辑存入委托后，委托可多次调用

### 小练习

使用 `static event` 搭配匿名函数，实现 Action 无参数输出文本 + Func 接收参数返回平方。

> **你的答案：**
> ```csharp
> class Program
> {
>     static event Action action = delegate ()
>     {
>         Console.WriteLine("我是匿名函数");
>     };
>     static event Func<int, int> func = delegate (int a)
>     {
>         return a * a;
>     };
>     static void Main()
>     {
>         action?.Invoke();
>         Console.WriteLine(func?.Invoke(5));
>     }
> }
> ```
>
> ✅ **批改：语法完全正确。** 匿名函数绑定事件、空安全调用 `?.Invoke()` 使用规范。

## 5.2 Lambda 表达式

### 核心本质

Lambda = **匿名函数的极简简化版**。核心符号：`=>`

### 语法进化

```csharp
// 普通方法（繁琐）
void Test() { }

// 匿名函数（中等）
Action a = delegate() { };

// Lambda（最简）
Action a = () => { };
```

### 三套标准语法

```csharp
// ① 无参数
Action act = () => { Console.WriteLine("Hello"); };

// ② 单个参数（可省略括号）
Action<string> act = s => Console.WriteLine(s);

// ③ 多个参数
Func<int, int, int> func = (a, b) => a + b;
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
```

### 多播委托 + Lambda

```csharp
Action act = () => Console.WriteLine("1");
act += () => Console.WriteLine("2");
act();
```

### 课后练习

题目：1. `Action<int>` 打印传入数字  2. `Func<double,double>` 返回数值的一半

> **参考答案：**
> ```csharp
> Action<int> printNum = n => Console.WriteLine($"数字：{n}");
> Func<double, double> getHalf = num => num / 2;
> 
> printNum(99);
> Console.WriteLine(getHalf(20));
> ```

## 5.3 Lambda 闭包陷阱

### 核心本质

**Lambda / 匿名函数 捕获的是「变量引用」，不是变量当前值。** 所有内部 Lambda 共享同一个循环变量，执行时统一读取最终值。

### 经典闭包陷阱

> ❌ **你的错误代码：**
> ```csharp
> static Action ret()
> {
>     Action act = () => Console.WriteLine($"{1}");
>     for (int i = 2; i <= 10; i++)
>     {
>         act += () => Console.WriteLine($"{i}");
>     }
>     return act;
> }
> 
> static void Main()
> {
>     ret()();
> }
> ```
>
> **错误现象：** 输出 1 后面全部打印 10
>
> **错误原理：**
> 1. 循环变量 `i` 只有**一份内存地址**
> 2. 所有 Lambda 全部捕获 `i` 的引用
> 3. 循环结束 i = 10
> 4. 最后统一执行，全部读取最终值 10

### 修复方案

循环内部定义临时局部变量，每次循环生成独立变量：

```csharp
static Action ret()
{
    Action act = () => Console.WriteLine($"{1}");
    for (int i = 2; i <= 10; i++)
    {
        int temp = i;  // 每次循环新建独立变量
        act += () => Console.WriteLine($"{temp}");
    }
    return act;
}
```

## 5.4 协变与逆变

### 前置基础

| 概念 | 说明 |
|------|------|
| 里氏替换 | 父类引用 = 子类对象 |
| 普通泛型 | 严格类型匹配，不支持父子类隐式转换 |
| 协变/逆变 | 只作用于泛型委托、泛型接口 |
| `out` | 协变关键字 |
| `in` | 逆变关键字 |

### 核心定义（必背）

| 类型 | 关键字 | 作用位置 | 转换规则 |
|------|--------|----------|----------|
| 协变 | `out` | 返回值 | 子类泛型 → 父类泛型 |
| 逆变 | `in` | 方法参数 | 父类泛型 → 子类泛型 |

### 系统原生支持

- `Func<out T>` 天生协变（返回值位置）
- `Action<in T>` 天生逆变（参数位置）

### 完整可运行代码

```csharp
using System;

public class Animal { }
public class Dog : Animal { }

// 协变委托
public delegate T GetObj<out T>();
// 逆变委托
public delegate void ShowMsg<in T>(T t);

class Program
{
    static void Main()
    {
        // === 协变演示 ===
        GetObj<Dog> funcDog = () => new Dog();
        GetObj<Animal> funcAn = funcDog;

        // === 逆变演示 ===
        ShowMsg<Animal> actAn = a => Console.WriteLine("父类方法执行");
        ShowMsg<Dog> actDog = actAn;
        actDog(new Dog());

        // === 系统自带 Func 协变 ===
        Func<Dog> f1 = () => new Dog();
        Func<Animal> f2 = f1;

        // === 系统自带 Action 逆变 ===
        Action<Animal> a1 = a => { };
        Action<Dog> a2 = a1;
    }
}
```

### 课后练习

基础父类：
```csharp
public class Animal { }
public class Dog : Animal { }
```

**第 1 题（协变）：** 自定义协变委托，完成子类委托赋值给父类委托。

**第 2 题（逆变）：** 自定义逆变委托，完成父类委托赋值给子类委托。

**第 3 题（综合）：** 使用原生 Func 协变、Action 逆变完成转换。

---

# 六、补充知识点

## 6.1 LINQ（语言集成查询）

### 核心本质

LINQ 让你用类似 SQL 的方式操作集合数据，有**方法语法**和**查询语法**两种写法。需要引入 `using System.Linq;`。

### 常用扩展方法

```csharp
using System.Linq;

int[] numbers = { 1, 2, 3, 4, 5, 6 };

// Where — 筛选
var evens = numbers.Where(n => n % 2 == 0);  // { 2, 4, 6 }

// Select — 投影
var squares = numbers.Select(n => n * n);     // { 1, 4, 9, 16, 25, 36 }

// OrderBy / OrderByDescending — 排序
var sorted = numbers.OrderByDescending(n => n);  // { 6, 5, 4, 3, 2, 1 }

// GroupBy — 分组
var grouped = numbers.GroupBy(n => n % 2 == 0 ? "偶数" : "奇数");

// 链式调用
var result = numbers
    .Where(n => n > 3)
    .Select(n => n * 10)
    .OrderByDescending(n => n);
// { 60, 50, 40 }
```

### 查询语法（类似 SQL）

```csharp
var result = from n in numbers
             where n > 3
             orderby n descending
             select n * 10;
```

### 适用场景

- 对集合做复杂筛选、排序、分组
- 替代多层 foreach 循环
- 数据库查询（配合 Entity Framework）

## 6.2 异步编程 async/await

### 核心本质

`async` / `await` 让异步代码看起来像同步代码，避免回调地狱。

```csharp
using System.Net.Http;

async Task<string> FetchDataAsync(string url)
{
    using HttpClient client = new HttpClient();
    string result = await client.GetStringAsync(url);
    return result;
}

// 调用
string data = await FetchDataAsync("https://api.example.com/data");
Console.WriteLine(data);
```

### 关键规则

| 规则 | 说明 |
|------|------|
| 方法签名 | 用 `async` 标记 |
| 返回值 | 通常是 `Task<T>`（有返回值）或 `Task`（无返回值） |
| `await` 关键字 | 等待异步操作完成，只能在 `async` 方法中使用 |

### 适用场景

- 网络请求（HTTP API 调用）
- 文件读写
- 数据库查询
- 任何可能阻塞的 I/O 操作

## 6.3 反射与特性

### 反射（Reflection）

运行时获取类型信息，可以访问私有字段、动态调用方法。

```csharp
using System.Reflection;

public class Player
{
    private int hp = 100;
    public void TakeDamage(int dmg) => hp -= dmg;
}

Type type = typeof(Player);

// 读取私有字段（必须带 BindingFlags）
FieldInfo field = type.GetField("hp",
    BindingFlags.NonPublic | BindingFlags.Instance);

Player player = new Player();
int val = (int)field.GetValue(player);  // 100

// 动态调用方法
MethodInfo method = type.GetMethod("TakeDamage");
method.Invoke(player, new object[] { 30 });
```

### 特性（Attribute）

给代码添加元数据，配合反射读取。

```csharp
// 定义特性
[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method)]
public class MyAttribute : Attribute
{
    public string Description { get; }
    public MyAttribute(string desc) => Description = desc;
}

// 使用特性
[MyAttribute("这是一个玩家类")]
class Player { }

// 通过反射读取特性
var attr = typeof(Player).GetCustomAttribute<MyAttribute>();
Console.WriteLine(attr.Description);
```

### 适用场景

- Unity Inspector 面板显示
- 序列化/反序列化
- ORM 框架（实体映射）
- 热更新中的类型查找

## 6.4 文件与流 I/O

```csharp
using System.IO;

// 写入文件
string content = "Hello, C#!";
File.WriteAllText("test.txt", content);

// 读取文件
string text = File.ReadAllText("test.txt");

// StreamWriter / StreamReader
using (StreamWriter writer = new StreamWriter("log.txt"))
{
    writer.WriteLine("日志信息");
}

using (StreamReader reader = new StreamReader("log.txt"))
{
    string line = reader.ReadLine();
}

// FileInfo — 文件信息
FileInfo info = new FileInfo("test.txt");
Console.WriteLine($"大小：{info.Length}，存在：{info.Exists}");

// Path — 路径操作
string fullPath = Path.Combine(@"C:\Data", "config.json");
string ext = Path.GetExtension("image.png");  // ".png"
```

### 适用场景

- 读写配置文件
- 日志记录
- 存档数据持久化
- 文件导入导出

## 6.5 扩展方法

在不修改原始类的情况下给类型添加新方法。

```csharp
public static class StringExtensions
{
    public static bool IsEmail(this string str)
    {
        return str.Contains("@") && str.Contains(".");
    }
}

// 使用（就像 string 自带的方法一样）
string email = "user@example.com";
bool valid = email.IsEmail();  // true
```

### 规则

1. 必须写在**静态类**中
2. 方法必须是**静态**的
3. 第一个参数用 **`this`** 关键字修饰
4. 通过 `using` 引入命名空间来使用

## 6.6 对象与集合初始化器

在创建对象/集合时直接给属性赋值。

```csharp
// 对象初始化器
Person p = new Person
{
    Name = "小明",
    Age = 18
};

// 集合初始化器
List<int> nums = new List<int> { 1, 2, 3, 4, 5 };

// 字典初始化器
Dictionary<string, int> scores = new Dictionary<string, int>
{
    ["语文"] = 90,
    ["数学"] = 85
};
```

## 6.7 匿名类型

用 `var` + `new { }` 创建临时类型，编译器自动生成类型名。

```csharp
var student = new { Name = "小明", Age = 18, Score = 95 };
Console.WriteLine(student.Name);
Console.WriteLine($"{student.Name} 的成绩是 {student.Score}");
```

### 特点

1. 用 `var` 声明，类型名由编译器生成
2. 属性**只读**，创建后不能修改
3. 常用于 LINQ 投影结果

## 6.8 using 语句（资源管理）

确保 `IDisposable` 对象使用完毕后自动释放资源。

```csharp
// 传统写法（大括号结束自动释放）
using (FileStream fs = new FileStream("test.txt", FileMode.Open))
using (StreamReader sr = new StreamReader(fs))
{
    string content = sr.ReadToEnd();
}  // 自动释放

// C# 8+ 简化写法
using FileStream fs = new FileStream("test.txt", FileMode.Open);
using StreamReader sr = new StreamReader(fs);
string content = sr.ReadToEnd();
// 作用域结束自动释放
```

## 6.9 动态类型（dynamic）

`dynamic` 绕过编译期类型检查，运行时才确定类型。

```csharp
dynamic obj = 123;
Console.WriteLine(obj + 10);   // 133

obj = "Hello";
Console.WriteLine(obj.Length);  // 5

obj = new { Name = "小明" };
Console.WriteLine(obj.Name);
```

### 注意事项

- ⚠️ **慎用**：失去编译期错误检测，运行时可能抛出异常
- ⚠️ **无智能提示**：IDE 无法显示成员列表
- 适合场景：与动态语言交互、COM 组件调用

---

> 我已把所有 C# 知识点按照统一格式、超详细讲解、包含你的原题 + 你的代码 + 错误分析、配套练习 + 总结，全部整理完毕！
>
> 保持练习，多写代码，把这些概念融会贯通。", "file_path": "E:\\VitePress\\unity-blog\\docs\\CSharp\\complete.md"}