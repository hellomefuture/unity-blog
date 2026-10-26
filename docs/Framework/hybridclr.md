# HybridCLR 热更新与双程序集架构

## 文档简介

手游上线后，改一行业务代码也要重新出包、提审、等审核——这个成本高到无法接受。**热更新**要解决的就是：把业务逻辑放进一个运行时可以替换的 DLL 里，改完直接下发，不重新打包。

本文记录基于 **HybridCLR** 的 C# 原生热更新方案，以及在《地穴行者》中落地的 **AOT + 热更双程序集架构**。

---

## 1 方案选型

| 方案 | 原理 | 优点 | 缺点 |
| --- | --- | --- | --- |
| Lua（xLua / ToLua） | 业务写 Lua，C# 只做桥接 | 成熟、生态大 | 要写两套语言，性能与调试体验差，重构困难 |
| ILRuntime | 运行时解释执行 IL | 纯 C# 开发 | 解释执行慢，跨域调用开销大，泛型支持有限 |
| **HybridCLR** | 扩展 IL2CPP 运行时，让热更 DLL 以**原生 AOT 方式**执行 | 纯 C#、性能接近原生、支持泛型与反射 | 需要补充 AOT 元数据，构建流程更复杂 |

选 HybridCLR 的核心理由：**不需要为了热更而换一门语言**。业务代码仍然是普通 C#，编辑器里能断点调试，性能也不打折。

---

## 2 双程序集结构

### 2.1 为什么必须拆成两个程序集

IL2CPP 在打包时会把所有程序集 AOT 编译成原生代码，**打进包里的程序集无法在运行时替换**。所以必须把代码按"是否允许热更"切开：

| 程序集 | 目录 | 内容 | 能否热更 |
| --- | --- | --- | --- |
| **AOT 程序集** | `Assets/Main` | 启动入口、HybridCLR 桥接、YooAsset 初始化、配置类 | 否（随包发布） |
| **热更程序集** | `Assets/HotUpdate` | 玩家、敌人、UI、地图、战斗、FSM、模块系统等全部业务逻辑 | 是 |

### 2.2 分层约束

```
Platform (Android / PC)
        │
   AOT Assembly (Main)
   ├── MainLauncher          唯一物理入口
   ├── IAppBridge            跨程序集接口
   ├── HotUpdateProvider     加载热更 DLL
   └── YooAssetService       资源初始化
        │  ▲
        │  │ 仅通过 IAppBridge 交互
        ▼  │
  HotUpdate Assembly
   └── GameRoot / Player / Enemy / UI / Map / Combat / FSM
```

**硬约束**：热更程序集**不允许**直接引用 AOT 类型。所有跨端调用都必须经过 `IAppBridge` 接口，否则 IL2CPP 链接阶段会直接报错。

---

## 3 启动流程

顺序不能乱，尤其是元数据必须在 DLL 加载**之前**补完。

```csharp
async void Start()
{
    try
    {
        // 1. 补充 AOT 元数据（mscorlib / System / System.Core 等）
        //    必须在热更 DLL 加载之前完成，否则泛型与反射会崩
        HybridCLRHelper.LoadMetadataForAOTAssembly();

        // 2. 初始化资源系统（YooAsset）
        await YooAssetService.InitializeAsync();

        // 3. 加载热更 DLL 并执行入口
        var assembly = await HotUpdateProvider.LoadAssemblyAsync("CryptWalker.HotUpdate.dll");
        var entry = assembly.GetType("HotUpdate.GameRoot");
        entry.GetMethod("Start").Invoke(null, null);
    }
    catch (Exception e)
    {
        // 4. 失败必须降级：提示 + 重试，不能让玩家卡在启动页
        Core.Log.Error($"[Boot] 热更启动失败: {e}");
    }
}

void Update()
{
    // 每帧驱动热更侧逻辑（AOT 侧不写业务）
    _hotUpdateTick?.Invoke(Time.deltaTime);
}
```

### 3.1 三个关键点

| 环节 | 说明 | 出错的后果 |
| --- | --- | --- |
| 补充元数据 | 把热更 DLL 用到的 AOT 泛型实例化信息补进运行时 | 缺元数据 → 运行到某个泛型方法时崩溃，且现场难定位 |
| 资源初始化 | YooAsset 必须先就绪，否则热更 DLL 加载不到 | 加载失败，卡启动 |
| 容错降级 | `async void` + `try/catch`，失败可重试 | 白屏、玩家流失 |

元数据目录：`HybridCLRData/AssembliesPostIl2CppPatch`，通常包含 `mscorlib.dll`、`System.dll`、`System.Core.dll`。

---

## 4 最容易踩的坑：资产只能挂 AOT 类型

### 4.1 现象

编辑器里一切正常，**打包后一片 `missing script`**，玩家和敌人完全不工作。

```
The referenced script (CryptWalker.HotUpdate.Entity.Enemy.EnemyBase)
on this Behaviour is missing!
```

### 4.2 原因

Unity 解析 prefab / scene / asset 里序列化的脚本引用，靠的是**打包时那份脚本表**。热更程序集是运行时 `Assembly.Load` 进来的，**不在那份表里**，所以引用必然解析失败。

⚠️ 加载顺序救不了：实测过，日志里"热更程序集加载成功"**先于** prefab 实例化，组件照样 missing。这不是时序问题，是结构问题。

### 4.3 解决方案：AOT 代理组件

资产上挂 **AOT 类型**的代理，运行时代理再创建热更组件并注入配置：

| 资产上挂什么（AOT） | 运行时创建 + 注入 |
| --- | --- |
| `EnemyProxy` | `EnemyBase` ← 注入 `EnemyConfig` |
| `PlayerProxy` | `PlayerController` ← 注入 `PlayerConfig` |
| `WeaponProxy` | `MeleeWeapon` / `RangedWeapon` / `SpellWeapon` ← 注入 `WeaponConfig` |

```csharp
// AOT 侧代理
public class EnemyProxy : MonoBehaviour
{
    [SerializeField] private EnemyConfig _config;   // 数值放 AOT 的 ScriptableObject
    [SerializeField] private string _hotTypeFullName =
        "CryptWalker.HotUpdate.Entity.Enemy.EnemyBase";

    void Awake()
    {
        var type = Type.GetType(_hotTypeFullName);
        var comp = (MonoBehaviour)gameObject.AddComponent(type);
        // 注入后才派生：热更组件的 Awake 已经跑过一次（AddComponent 是同步的）
        type.GetMethod("ApplyTuning").Invoke(comp, new object[] { _config });
    }
}
```

### 4.4 两条配套约束

1. **数值放 AOT 的 ScriptableObject**：`EnemyConfig` / `PlayerConfig` / `WeaponConfig` 都必须属于 AOT 程序集，代理只持有 SO 引用。
2. **注入后必须重新派生**：热更组件的 `Awake` 会在 `AddComponent` 时同步执行，那一刻字段还是代码默认值；凡是 `Awake` 里用过的字段（例如 `Hp = maxHp`），`ApplyTuning` 里都要重算一次，否则血条会停在上限的旧值。

### 4.5 自检清单

出包后必须确认：

- 真机 `Player.log` 里 **0 条 `missing script`**
- 所有 prefab 的脚本引用都指向 AOT 类型
- 改动过 AOT 配置类字段后重新构建热更 DLL
- 元数据目录与热更 DLL 一起更新

---

## 5 与资源系统的配合

热更 DLL 本身也是一份资源，通过 YooAsset 的 Host 模式从 CDN 拉取：

| 模式 | 用途 |
| --- | --- |
| EditorSimulate | 编辑器内直接用 AssetDatabase，改完即生效 |
| Offline | 单机包，资源随包 |
| Host | 线上模式，DLL 与资源从远端更新 |

---

## 6 小结

| 要点 | 结论 |
| --- | --- |
| 语言 | 不换语言，纯 C# 热更 |
| 结构 | AOT + 热更双程序集，跨端只走 `IAppBridge` |
| 顺序 | 补元数据 → 初始化资源 → 加载 DLL |
| 资产 | 只挂 AOT 类型，热更组件由代理运行时创建 |
| 降级 | 启动失败必须可重试，不能让玩家卡死 |

热更新的价值不在"炫技"，而在于把**线上修复成本**从"重新出包等审核"降到"下发一个 DLL"。代价是架构复杂度上升——但只要把上面几条约束固化成规范，这套结构是可以长期维护的。
