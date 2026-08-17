# 泛型栈和队列

## 一、核心本质

泛型栈 `Stack<T>` + 泛型队列 `Queue<T>`

- **无装箱拆箱、类型安全**
- **底层：顺序数组**
- 替代老式非泛型 Stack / Queue

## 二、泛型栈 Stack（后进先出 LIFO）

### 核心方法

| 方法 | 说明 |
|------|------|
| `Push(T)` | 入栈 |
| `Pop()` | 出栈（移除并返回栈顶元素） |
| `Peek()` | 查看栈顶（不移除） |

```csharp
Stack<int> stack = new Stack<int>();
stack.Push(10);
stack.Push(20);

int top = stack.Peek(); // 20，不移除
int val = stack.Pop();  // 20，移除
```

### 应用场景

- 撤销操作（Ctrl+Z）
- 浏览器后退
- 括号匹配检测

## 三、泛型队列 Queue（先进先出 FIFO）

### 核心方法

| 方法 | 说明 |
|------|------|
| `Enqueue(T)` | 入队 |
| `Dequeue()` | 出队（移除并返回队首元素） |
| `Peek()` | 查看队首（不移除） |

```csharp
Queue<string> queue = new Queue<string>();
queue.Enqueue("A");
queue.Enqueue("B");

string first = queue.Peek(); // "A"，不移除
string val = queue.Dequeue(); // "A"，移除
```

### 应用场景

- 消息队列
- 任务调度
- 网络请求排队

## 四、背诵总结

1. **Stack**：后进先出，Push/Pop
2. **Queue**：先进先出，Enqueue/Dequeue
3. 泛型，无装箱，数组底层