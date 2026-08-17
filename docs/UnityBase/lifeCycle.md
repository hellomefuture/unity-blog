# Mono 生命周期

## 1. 生命周期流程图

```
Awake → OnEnable → Start → FixedUpdate → Update → LateUpdate → OnDisable → OnDestroy
```

## 2. 各阶段说明

| 阶段 | 说明 |
|------|------|
| Awake | 对象初始化时调用，无论脚本是否启用 |
| OnEnable | 每次脚本启用时调用 |
| Start | 第一次 Update 前调用，仅在启用时调用一次 |
| FixedUpdate | 固定时间间隔调用（默认 0.02s），用于物理计算 |
| Update | 每帧调用，用于常规逻辑更新 |
| LateUpdate | Update 之后调用，适合相机跟随等逻辑 |
| OnDisable | 脚本禁用时调用 |
| OnDestroy | 对象销毁时调用 |

## 3. 示例代码

```csharp
public class LifeCycleTest : MonoBehaviour {
    void Awake() {
        Debug.Log("Awake");
    }
    void Start() {
        Debug.Log("Start");
    }
    void Update() {
        Debug.Log("Update");
    }
    void OnDestroy() {
        Debug.Log("OnDestroy");
    }
}
```

## 4. 常见注意事项

- 即使脚本没有启用，Awake 也会执行
- 不要在 Awake / Start / Update 中写耗时操作
- 尽量在 Awake 中获取组件引用（GetComponent），在 Start 中做逻辑初始化