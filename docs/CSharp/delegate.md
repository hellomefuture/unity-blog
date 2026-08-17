# 委托与 UnityEvent

## 1. 委托（Delegate）

> 委托是方法的引用，可以把方法当作参数传递

```csharp
// 声明委托
public delegate void MyDelegate(string msg);

// 使用
MyDelegate del = Debug.Log;
del("Hello");
```

## 2. 多播委托

```csharp
MyDelegate del = MethodA;
del += MethodB;
del("调用"); // MethodA 和 MethodB 都会执行
```

## 3. UnityEvent

> Unity 官方封装的事件系统，可以在 Inspector 面板可视化绑定

```csharp
using UnityEngine.Events;

public class Test : MonoBehaviour {
    public UnityEvent onEvent;

    void Start() {
        onEvent.Invoke();
    }
}
```

## 4. 对比总结

| 特性 | 委托 | UnityEvent |
|------|------|------------|
| 性能 | 快 | 较慢 |
| 序列化 | ❌ | ✅ |
| Inspector 绑定 | ❌ | ✅ |
| 多播 | ✅ | ✅ |

## 5. 注意事项

- 事件订阅后记得取消订阅，防止内存泄漏
- UnityEvent 性能较委托差，Update 中用委托更好
- 使用 `?.Invoke()` 安全调用