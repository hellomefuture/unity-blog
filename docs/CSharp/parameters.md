# 参数默认值与变长参数（params）详解

用超通俗的大白话 + 可运行代码 + 新手避坑，一次性把 C# 的**参数默认值（可选参数）**和**变长参数（params）**讲明白！

---

## 一、参数默认值（可选参数）

### 1. 一句话定义

给方法的参数**提前设置一个默认值**，调用方法时：
- ✅ 传参数 → 用你传的值
- ✅ 不传参数 → 自动用**默认值**

不用再写一堆重载方法了！

### 2. 核心语法

```csharp
// 必选参数在前，带默认值的可选参数在后
返回值 方法名(类型 必选参数, 类型 参数名 = 默认值)
```

### 3. 硬性规则（必记）

1. **可选参数必须放在所有必选参数的最后面**
2. 可以有**多个可选参数**
3. 调用时可传、可省略，省略就用默认值

### 4. 示例

```csharp
using System;

class Program
{
    static void Main(string[] args)
    {
        // 传两个参数：用传入的值
        PrintInfo("小明", 18);
        
        // 只传名字，年龄用默认值 20
        PrintInfo("小红");
        
        // 全部用默认值（名字默认：游客，年龄默认：20）
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

### 5. 实战场景

```csharp
// 必选参数：建筑名称
// 可选参数：等级、血量
void CreateBuilding(string name, int level = 1, int hp = 100)
{
    Console.WriteLine($"建筑：{name}，等级：{level}，血量：{hp}");
}

// 调用
CreateBuilding("木屋");       // 等级1，血量100
CreateBuilding("石屋", 3);    // 等级3，血量100
```

---

## 二、变长参数（params 关键字）

### 1. 一句话定义

允许你给方法**传任意数量的同类型参数**（0 个、1 个、多个都可以），编译器会自动把这些参数**打包成一个数组**！

### 2. 核心语法

```csharp
// params 必须修饰一维数组，且必须放在所有参数的最后
返回值 方法名(params 类型[] 参数名)
```

### 3. 硬性规则

1. 一个方法**只能有一个 params 参数**
2. params 必须修饰**一维数组**
3. params 参数**必须放在所有参数的最后一位**
4. 调用时：可传多个值、可传数组、可不传

### 4. 示例：求和

```csharp
using System;

class Program
{
    static void Main(string[] args)
    {
        // 传 1 个数字
        int sum1 = Add(10);
        // 传 3 个数字
        int sum2 = Add(1, 2, 3);
        // 传 5 个数字
        int sum3 = Add(10, 20, 30, 40, 50);

        Console.WriteLine(sum1); // 10
        Console.WriteLine(sum2); // 6
        Console.WriteLine(sum3); // 150
    }

    static int Add(params int[] numbers)
    {
        int total = 0;
        foreach (int num in numbers)
        {
            total += num;
        }
        return total;
    }
}
```

### 5. 传数组

```csharp
int[] arr = { 100, 200, 300 };
int sum = Add(arr); // 正常运行
```

### 6. 实战场景

```csharp
// 一次性添加任意数量的建筑
void AddBuildings(params string[] buildingNames)
{
    foreach (string name in buildingNames)
    {
        Console.WriteLine("已添加建筑：" + name);
    }
}

// 调用：想加几个加几个
AddBuildings("木屋");
AddBuildings("石屋", "塔楼", "城墙");
```

---

## 三、两者一起用

```csharp
// 顺序：必选参数 → 默认参数 → params 变长参数（最后）
void Test(int a, string b = "默认", params int[] c)
{
}
```

---

## 四、新手必避 3 个大坑

### 坑 1：可选参数不能放在必选参数前面
❌ `void Test(string name = "游客", int age) // 报错！`
✅ `void Test(int age, string name = "游客")`

### 坑 2：params 必须是最后一个
❌ `void Test(params int[] a, string b) // 报错！`
✅ `void Test(string b, params int[] a)`

### 坑 3：一个方法只能有一个 params
❌ `void Test(params int[] a, params string[] b) // 报错！`

---

## 总结

1. **参数默认值**：给参数设默认值，调用可传可不传 → 简化调用
2. **可选参数必须放最后**
3. **变长参数 params**：接收任意数量同类型参数 → 自动转数组
4. **params 必须是最后一个参数，只能有一个**
5. 两者都是为了**少写代码、少写重载方法**