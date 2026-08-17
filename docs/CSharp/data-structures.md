# 顺序存储 / 链式存储 / Dictionary

## 一、核心本质

| 存储方式 | 内存布局 | 特点 | 代表 |
|----------|----------|------|------|
| **顺序存储** | 内存连续，数组实现 | 查快删慢 | `List<T>` |
| **链式存储** | 内存不连续，节点引用 | 删快查慢 | `LinkedList<T>` |
| **Dictionary** | 哈希数组+链表 | 平均 O(1) 查找 | `Dictionary<TKey,TValue>` |

## 二、顺序存储（List）

底层是动态数组，优点是下标访问 O(1)，缺点是中间增删 O(n)。

```csharp
List<int> list = new List<int>();
list.Add(10);
list[0] = 20;       // 下标访问 O(1)
list.Insert(1, 15); // 中间插入 O(n)
```

## 三、链式存储（LinkedList）

底层是双向链表，优点是任意位置增删 O(1)，缺点是无下标，查找 O(n)。

```csharp
LinkedList<int> link = new LinkedList<int>();
link.AddFirst(1);
link.AddLast(99);

// 遍历链表
foreach (int item in link)
{
    Console.WriteLine(item);
}
```

## 四、Dictionary

底层是哈希桶数组 + 单向链表（解决哈希冲突）。

- 核心：`GetHashCode()` 定位，`Equals()` 比对
- 优点：查找 / 增删极速 O(1)
- 特点：无序、键唯一

```csharp
Dictionary<string, int> dict = new Dictionary<string, int>();
dict.Add("苹果", 5);
dict.Add("香蕉", 3);

// 快速查找
int count = dict["苹果"];  // O(1)
```

## 五、终极对比

| 集合 | 存储结构 | 查找 | 增删 | 内存 |
|------|----------|------|------|------|
| `List<T>` | 顺序数组 | O(1) | O(n) | 连续 |
| `LinkedList<T>` | 双向链表 | O(n) | O(1) | 分散 |
| `Dictionary<TKey,TValue>` | 哈希混合 | O(1) | O(1) | 混合 |

## 六、背诵总结

1. 顺序存储：连续内存，查快删慢
2. 链式存储：节点引用，删快查慢
3. Dictionary：哈希结构，万物皆可 O(1)