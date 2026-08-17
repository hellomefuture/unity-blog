# 空安全调用

## 一、核心本质

### 1. `?.Invoke()`：委托不为 null 才执行，防止崩溃

```csharp
// 等价于：
if (委托 != null) 委托.Invoke();

// 实际写法：
showInfo?.Invoke("李四", 20);
```

### 2. `??`：左边为 null，用右边默认值

```csharp
int result = calcAdd?.Invoke(15, 25) ?? 0;
```
规则：null → 用 0，非 null → 用结果

## 二、极简总结

1. `?.Invoke()`：安全调用委托
2. `??`：设置默认值
3. 防止程序空引用崩溃