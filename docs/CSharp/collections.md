# 非泛型集合：ArrayList / Stack / Queue / Hashtable

## 一、核心本质

这四个是 C# **古老非泛型集合**，统一存储 `object`，存在**装箱拆箱**问题，现代 C# 已被泛型集合替代。

| 集合 | 特性 | 对应 C++ STL |
|------|------|-------------|
| ArrayList | 顺序存储，动态数组 | `std::vector` |
| Stack | 栈，后进先出 LIFO | `std::stack` |
| Queue | 队列，先进先出 FIFO | `std::queue` |
| Hashtable | 哈希表，键值对 | `std::unordered_map` |

## 二、逐个详解

### 1. ArrayList（动态数组）

底层是自动扩容数组，支持下标随机访问。缺点：存 object、装箱拆箱、类型不安全。

```csharp
ArrayList list = new ArrayList();
list.Add(10);       // 装箱
int a = (int)list[0]; // 拆箱
```

### 2. Stack（非泛型栈）

后进先出（LIFO）。

```csharp
Stack stack = new Stack();
stack.Push(1);
int val = (int)stack.Pop();
```

### 3. Queue（非泛型队列）

先进先出（FIFO）。

```csharp
Queue queue = new Queue();
queue.Enqueue(10);
int v = (int)queue.Dequeue();
```

### 4. Hashtable（哈希表）

底层：哈希桶 + 链表，键值对存储。

- 缺点：非泛型、装箱拆箱
- 对比 Dictionary：Hashtable 线程安全，Dictionary 泛型高性能

```csharp
Hashtable table = new Hashtable();
table.Add("key1", "value1");
string val = (string)table["key1"];
```

## 三、核心区别总结

1. C# 非泛型：存 object，装箱拆箱
2. C++ STL：模板泛型，无装箱
3. **现代 C#：全部用泛型集合替代**

## 四、背诵总结

1. 4 个都是非泛型，存 object，有装箱拆箱
2. ArrayList = 动态数组，Stack = 栈，Queue = 队列
3. Hashtable = 哈希表，线程安全
4. 开发不用，用泛型替代