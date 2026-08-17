# C# 变量、常量与类型转换

## 变量命名规范

1. 不能重名
2. 不能数字开头
3. 不能使用程序关键字命名
4. 不能有特殊符号（下划线除外）

```csharp
string myName;
string mySex;
double myATK = 10000d;
double myDef = 100000d;
double youHeight = 180d;
```

## 常量

关键字 `const`，必须初始化，不能被修改。

```csharp
const int i2 = 20;
```

## 类型转换——显式转换

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

## 异常捕获

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

## 控制台输入输出

```csharp
Console.WriteLine();    // 输出并自动换行
Console.Write();        // 输出不换行
Console.ReadLine();     // 等待输入直到按回车
Console.ReadKey();      // 按任意键继续
```

## 随机数

```csharp
Random r = new Random();
int i = r.Next();          // 非负随机整数
int j = r.Next(100);       // 0~99（左包含，右不包含）
int k = r.Next(5, 100);    // 5~99
```
