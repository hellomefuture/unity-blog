# 泛型

## 一、核心本质

**泛型** = 把数据类型当成参数传递。`<T>` 是类型占位符，编译时确定具体类型。

泛型 ≠ object，**无装箱拆箱、类型安全**。

## 二、为什么要发明泛型？

非泛型（ArrayList）致命缺陷：

1. **类型不安全** → 运行崩溃
2. **装箱拆箱** → 性能极差
3. **代码无法复用**

泛型完美解决以上问题。

## 三、泛型标准写法

### 1. 泛型方法

```csharp
static void Print<T>(T data)
{
    Console.WriteLine(data);
}
```

### 2. 泛型类

```csharp
class MyContainer<T>
{
    public T Value;
}
```

### 3. 泛型集合（开发常用）

```csharp
List<int> list = new List<int>();                    // 无装箱
Dictionary<string, int> dict = new Dictionary<string, int>();
Stack<float> stack = new Stack<float>();
Queue<string> queue = new Queue<string>();
```

## 四、泛型四大优点

1. **编译期类型安全**：类型不匹配直接报错
2. **零装箱拆箱**：高性能、零 GC 压力
3. **代码高度复用**：一个泛型类应对所有类型
4. **无需强制转换**：取值直接是目标类型

## 五、C# 泛型 VS C++ 模板

| 对比 | C# 泛型 | C++ 模板 |
|------|---------|----------|
| 机制 | 运行时泛型 | 编译期文本替换 |
| 实例化 | 运行时生成 | 编译时展开 |
| 限制 | 功能受限 | 任意类型操作 |

## 六、背诵总结

1. 泛型 = 类型参数化，T 是占位符
2. 无装箱、类型安全、高性能
3. 现代 C# 全用泛型集合
4. 泛型 ≠ object