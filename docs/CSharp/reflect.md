# C# 反射 Unity实战

## 1. 什么是反射
> 运行时获取类型信息，可以访问私有字段、调用方法

```csharp
using System.Reflection;

Assembly asm = Assembly.GetExecutingAssembly();
Type t = asm.GetType("TestRole");
```

## 2. 常见用途

- 动态创建对象（绕过 new）
- 访问私有字段 / 属性
- 动态调用方法
- 编辑器工具、序列化

## 3. 示例：访问私有字段

```csharp
public class Player {
    private int hp = 100;
}

Type type = typeof(Player);
FieldInfo field = type.GetField("hp", BindingFlags.NonPublic | BindingFlags.Instance);
Player player = new Player();
int val = (int)field.GetValue(player); // 100
```

## 4. 常见坑

- `GetField` 获取私有成员**必须**带上 `BindingFlags.NonPublic | BindingFlags.Instance`
- 性能比直接调用慢，避免在 Update 中使用
- 可以配合缓存优化：缓存 FieldInfo / MethodInfo

## 5. Unity 中的应用

- 编辑器 Inspector 扩展
- 序列化工具
- 热更新方案中的类型查找