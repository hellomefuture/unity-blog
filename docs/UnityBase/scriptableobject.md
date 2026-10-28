# ScriptableObject 数据驱动

## 文档简介

数值散落在代码里，是项目变复杂的第一信号：改一个敌人的血量要翻三个脚本、策划想调平衡要程序改代码重新出包。

**ScriptableObject（SO）** 是 Unity 提供的"数据资产"机制，把配置从代码里抽出来变成可以在 Inspector 里编辑的文件，是**数据驱动设计**最基础的落地方式。

---

## 1 SO 是什么

`ScriptableObject` 是继承自 `UnityEngine.Object` 的可序列化数据容器，可以保存成 `.asset` 文件。

| 对比 | MonoBehaviour | ScriptableObject |
| --- | --- | --- |
| 依附 | 必须挂在 GameObject 上 | 独立资产，不挂场景 |
| 生命周期 | 随场景/对象销毁 | 内存中单例式存在，随资源卸载 |
| 用途 | 行为 | **数据** |
| 能否 Update | 能 | 不能（没有帧更新） |
| 序列化 | 场景/预制体保存 | `.asset` 文件保存 |

**一句话**：MonoBehaviour 管"做什么"，ScriptableObject 管"是什么"。

---

## 2 定义一个配置

```csharp
using UnityEngine;

[CreateAssetMenu(fileName = "EnemyConfig", menuName = "CryptWalker/Data/EnemyConfig")]
public class EnemyConfig : ScriptableObject
{
    public string configID;
    public string enemyName;
    public int maxHp = 100;
    public float moveSpeed = 2f;
    public float attackRange = 1.5f;
    public float attackInterval = 1.2f;
    public int coinDrop = 5;
}
```

在 `Assets` 里右键 → `Create → CryptWalker → Data → EnemyConfig`，就能生成一个 `.asset` 文件，在 Inspector 里填数值。

### 2.1 为什么要 `[CreateAssetMenu]`

没有这个特性也能建，但要写编辑器脚本。加上之后右键菜单直接创建，省事。

### 2.2 字段设计原则

| 原则 | 说明 |
| --- | --- |
| 只存数据，不写逻辑 | 需要计算的方法放运行时类 |
| 用 `[Tooltip]` 说明 | 策划看一眼就懂 |
| 用 `[Range]` 限制范围 | 防止填出离谱数值 |
| 用 `[Header]` 分组 | 字段多了必须分组 |

```csharp
[Header("基础属性")]
[Tooltip("留空 → 敌人会变成「木桩」")]
public string enemyName;

[Header("战斗数值")]
[Range(1, 10000)] public int maxHp = 100;
[Range(0.1f, 20f)] public float moveSpeed = 2f;
```

---

## 3 数据驱动的三层结构

把"配置 / 运行时 / 表现"拆开，是 SO 用得好的关键：

```
EnemyConfig（SO，静态数据）
    ↓ 注入
EnemyBase（运行时逻辑，持有当前状态：当前血量、当前目标）
    ↓ 通知
EnemyView / Animator（表现层）
```

| 层 | 存什么 | 例子 |
| --- | --- | --- |
| 配置层（SO） | 不会变的设计数值 | 最大血量、移速、掉落 |
| 运行时层 | 每局会变的状态 | 当前血量、当前目标、冷却 |
| 表现层 | 视觉表现 | 血条、动画、特效 |

**为什么不能把当前血量写进 SO**：SO 是共享资产，所有同类型敌人会读到同一个值；而且编辑器里改了 SO 会真的改文件，运行时改它等于改配置。

---

## 4 SO 的常见用法

### 4.1 配置表（最基础）

| 用途 | SO 类型 |
| --- | --- |
| 敌人数值 | `EnemyConfig` |
| 玩家数值 | `PlayerConfig` |
| 武器数值 | `WeaponConfig` |
| 关卡数据 | `LevelConfig` |
| 物品数据 | `ItemData` |

每个敌人一个 `.asset`：`Enemy_Orc1.asset`、`Enemy_Orc2.asset`……

### 4.2 列表容器

一个 SO 里放数组，做"配置集合"：

```csharp
[CreateAssetMenu(menuName = "CryptWalker/Data/LevelTable")]
public class LevelTable : ScriptableObject
{
    public LevelConfig[] levels;
}
```

好处：一次加载拿到全部关卡，不用逐个加载。

### 4.3 事件通道（Event Channel）

用 SO 做事件中转，避免脚本互相引用：

```csharp
[CreateAssetMenu(menuName = "Events/IntEvent")]
public class IntEventChannel : ScriptableObject
{
    public event System.Action<int> OnRaised;

    public void Raise(int value) => OnRaised?.Invoke(value);
}
```

发送方和接收方都只依赖这个 SO 资产，彼此不知道对方存在。

⚠️ **注意**：SO 的事件在编辑器里跨播放会残留订阅，`OnEnable/OnDisable` 里要正确加减。

### 4.4 运行时数据容器（Runtime Set）

```csharp
[CreateAssetMenu(menuName = "Runtime/EnemySet")]
public class EnemyRuntimeSet : ScriptableObject
{
    public List<EnemyBase> items = new();

    public void Add(EnemyBase e) { if (!items.Contains(e)) items.Add(e); }
    public void Remove(EnemyBase e) => items.Remove(e);
}
```

敌人自己在 `OnEnable` 注册、`OnDisable` 注销，其他系统通过这个 SO 拿到"当前所有敌人"，不用 `FindObjectsOfType`。

---

## 5 与热更新的配合（重要）

这是实际项目里最容易翻车的地方。

**规则：被资产引用的 SO 类型，必须属于 AOT 程序集。**

原因：Unity 解析 prefab / asset 里的脚本引用，靠的是打包时的脚本表；热更程序集是运行时加载的，不在表里，引用会解析失败（表现为 `missing script`）。

所以项目里的结构是：

| 内容 | 程序集 |
| --- | --- |
| `EnemyConfig` / `PlayerConfig` / `WeaponConfig` 等 SO 类 | **AOT** |
| 使用这些配置的业务逻辑 | 热更 |

代理组件持有 SO 引用，运行时把配置注入给热更组件：

```csharp
// AOT 侧
public class EnemyProxy : MonoBehaviour
{
    [SerializeField] private EnemyConfig _config;   // SO 引用

    void Awake()
    {
        var type = Type.GetType("CryptWalker.HotUpdate.Entity.Enemy.EnemyBase");
        var comp = (MonoBehaviour)gameObject.AddComponent(type);
        type.GetMethod("ApplyTuning").Invoke(comp, new object[] { _config });
    }
}
```

**改数值 vs 加字段**：

| 操作 | 要不要重新出包 |
| --- | --- |
| 改 SO 里的数值 | 要（SO 随包发布） |
| 给 SO 加字段 | 要（AOT 类变了） |

如果想让"改数值不重新出包"，就把配置放到可远程更新的资源里（如 JSON / CSV），用 SO 只做本地默认值。

---

## 6 加载与释放

SO 也是资源，要走资源系统加载：

```csharp
// 走 YooAsset / Addressables，不要用 Resources
var config = await DataService.GetAsync<EnemyConfig>("asset://data/config/Enemy_Orc1");
```

### 6.1 缓存

配置是只读的，加载一次就缓存：

```csharp
private static readonly Dictionary<string, ScriptableObject> _cache = new();

public static async Task<T> GetAsync<T>(string address) where T : ScriptableObject
{
    if (_cache.TryGetValue(address, out var c)) return (T)c;
    var handle = await LoadAsync<T>(address);
    _cache[address] = handle.Result;
    return handle.Result;
}
```

### 6.2 什么时候释放

| 策略 | 适用 |
| --- | --- |
| 常驻不释放 | 全局配置（玩家、武器） |
| 切换关卡时释放 | 关卡专属配置 |
| 引用计数 | 大型项目、配置很多 |

小项目里配置总量很小（几十个 SO），常驻内存完全可接受，别为了"严谨"搞出一堆释放逻辑。

---

## 7 SO vs JSON / Excel

| 维度 | ScriptableObject | JSON / CSV |
| --- | --- | --- |
| 编辑体验 | Inspector 友好，有类型检查 | 需要文本编辑器 |
| 策划协作 | 一般（要装 Unity） | 好（Excel 直接改） |
| 热更 | 随资源包更新 | 可直接下载 |
| 版本管理 | `.asset` 是二进制/YAML，冲突难合 | 文本，易 diff |
| 运行时开销 | 直接引用，零解析 | 需要解析 |

**实践组合**：

```
设计期  →  Excel / CSV 配表
构建期  →  导出成 SO 或 JSON
运行期  →  优先 SO（快），需要热更的用 JSON
```

---

## 8 常见坑

| 坑 | 表现 | 解决 |
| --- | --- | --- |
| 运行时改 SO 字段 | 编辑器里数值被永久改掉 | 运行时数据放普通类 |
| SO 里存场景对象引用 | 打包后引用丢失 | 只存资源引用，不存场景实例 |
| 事件通道忘了退订 | 重复触发、空引用 | OnEnable/OnDisable 成对加减 |
| SO 类型放在热更程序集 | 真机 `missing script` | 类型放 AOT，业务放热更 |
| 用 `Resources.Load` 加载 SO | 无法热更、无法分包 | 走 YooAsset / Addressables |
| 一个 SO 塞所有配置 | 改一处要动整个大文件 | 按数据类型拆 |

---

## 9 小结

| 要点 | 结论 |
| --- | --- |
| 定位 | SO 是数据资产，MonoBehaviour 是行为 |
| 分层 | 配置（SO）/ 运行时状态 / 表现，三者不能混 |
| 用途 | 配置表、列表容器、事件通道、运行时集合 |
| 热更 | 被资产引用的 SO 类型必须在 AOT 程序集 |
| 加载 | 走资源系统 + 缓存，别用 Resources |
| 取舍 | 策划改得勤用 Excel 导出，运行时要快用 SO |

SO 的价值不是"少写代码"，而是**把数值从代码里搬出来，让改数值这件事不再需要程序介入**。做到这一点，项目的迭代速度会有质的变化。
