# C# 变量与常量

## 一、变量命名规范

1. 不能重名
2. 不能数字开头
3. 不能使用程序关键字命名
4. 不能有特殊符号（下划线除外）

> 建议：变量名要有意义，不要用汉字命名

### 常用命名规则

| 规则 | 说明 | 示例 |
|------|------|------|
| **驼峰命名法** | 首字母小写，之后单词首字母大写 | `myName`, `mySex` |
| **帕斯卡命名法** | 所有单词首字母都大写（函数、类） | `MyClass`, `ShowInfo` |

::: tip
C# 是大小写敏感的
:::

```csharp
string myName;
string mySex;
double myATK = 10000d;
double myDef = 100000d;
double youHeight = 180d;
double youWeight = 60d;
```

## 二、常量

### 声明常量

关键字：`const`

**固定写法：**
```csharp
const 变量类型 变量名 = 初始值;

const int i2 = 20;
```

### 常量的特点
1. **必须初始化**
2. **不能被修改**

> **作用：** 声明一些常用不变的变量

---

## 三、类型转换

### 显式转换

**作用：** 将高精度转换为低精度（不强制转换时会报错）

**语法：**
```csharp
变量类型 变量名 = (变量类型)变量;
```

**注意：** 精度问题、范围问题

### 转换方式

| 方式 | 说明 | 示例 |
|------|------|------|
| **括号强转** | 数值之间的转换，低精度转高精度 | `(int)3.14` |
| **Parse法** | 把字符串转成对应类型 | `int.Parse("123")` |
| **Convert法** | 通用转换方法 | `Convert.ToInt32()` |

```csharp
// Parse 示例
int i = int.Parse("123");

// Convert 示例
int i = Convert.ToInt32("123");
```

---

## 四、异常捕获

```csharp
// 将玩家输入的内容存储到 string 类型的变量中
string str = Console.ReadLine();
// Parse 转字符串为数值类型时必须合法合规
int i = int.Parse(str); // 这里代码可能出问题
```

> 通过对异常捕获的学习，可以避免当代码报错时造成程序卡死的情况

### 基本语法

```csharp
// 必备部分
try
{
    // 希望进行异常捕获的代码块
    // 如果 try 中的代码报错，不会让代码卡死
}
catch (Exception e)   // 当 try 的代码出错时，携带错误信息到 catch
{
    // 如果出错了，会执行 catch 中的代码来捕获异常
    // catch(Exception e) 具体报错跟踪，获取具体的错误信息
}
// 可选部分
finally
{
    // 最后执行的代码，不管有没有错都会执行
}
```

---

## 五、控制台输入输出

### 输出

```csharp
Console.WriteLine();   // 自动换行
Console.Write();       // 不换行
```

### 输入

```csharp
Console.ReadLine();   // 等待玩家输入完毕后（按回车）
Console.ReadKey();    // 检测玩家是否按键，按了任意键就认为输入结束
```

## 六、随机数

### 创建随机数对象

```csharp
Random 随机数变量名 = new Random();
Random r = new Random();
```

### 生成随机数

```csharp
// 生成一个非负的随机整数
int i = r.Next();

// 生成一个 0~99 的随机数（左包含，右不包含）
i = r.Next(99);

// 生成指定范围的随机数
i = r.Next(5, 100);   // 左包含，右不包含
```