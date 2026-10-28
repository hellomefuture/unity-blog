# 设计模式：单例、工厂、观察者与对象池

## 文档简介

设计模式不是"面试背名词"，而是**在真实项目里被同一类问题反复折磨之后，自然收敛出来的写法**。

本文不铺 23 种模式，只讲游戏客户端里用得最多、也最容易被用错的四类：**单例、工厂、观察者、对象池**，每一种都给出"为什么需要 / 怎么写 / 什么时候不该用"。

---

## 1 单例（Singleton）

### 1.1 它要解决的问题

全局唯一、且需要被任意位置访问的对象：

| 场景 | 例子 |
| --- | --- |
| 服务/管理器 | `AudioService`、`UIService`、`DataService` |
| 纯 C# 工具 | 对象池管理、事件总线、配置读取入口 |
| 引擎入口 | `MainLauncher`（游戏唯一物理入口） |

没有单例时的做法是层层传参（`new PlayerController(audioService, uiService, dataService...)`），
一层套一层，最后每个类都背着一堆用不到的依赖。

### 1.2 纯 C# 单例：先看不会出错的那一种

```csharp
public sealed class EventBus
{
    // 静态构造由 CLR 保证线程安全，且是 lazy 的（第一次访问才创建）
    private static readonly EventBus s_instance = new EventBus();
    public static EventBus Instance => s_instance;

    private EventBus() { }   // 私有构造，禁止外部 new
}
```

为什么推荐这一版：

| 写法 | 线程安全 | 懒加载 | 评价 |
| --- | --- | --- | --- |
| `public static readonly T Instance = new T();` | ✅ CLR 保证 | ❌ 类型初始化时创建 | 简单、够用 |
| 静态构造 + `readonly` 字段 | ✅ | ✅ | **推荐** |
| 双重检查锁（`lock` + `volatile`） | ✅ | ✅ | 能用，但样板代码多 |
| 朴素懒汉式（`if (_instance == null)`） | ❌ 多线程会造出两个 | ✅ | **禁止** |
| `[ThreadStatic]` | 每线程一个 | — | 不是单例，容易误用 |

### 1.3 Unity 单例：MonoBehaviour 的两条额外约束

```csharp
public abstract class SingletonBehaviour<T> : MonoBehaviour where T : SingletonBehaviour<T>
{
    private static T s_instance;

    public static T Instance
    {
        get
        {
            if (s_instance == null)
                Log.Error($"[{typeof(T).Name}] 单例尚未初始化就被访问");
            return s_instance;
        }
    }

    protected virtual void Awake()
    {
        if (s_instance != null && s_instance != this)
        {
            Destroy(gameObject);   // 场景切换/重复挂载时销毁后来者
            return;
        }
        s_instance = (T)this;
        DontDestroyOnLoad(gameObject);   // 跨场景常驻
    }

    protected virtual void OnDestroy()
    {
        if (s_instance == this) s_instance = null;
    }
}
```

三条容易漏的点：

| 点 | 说明 |
| --- | --- |
| 重入保护 | 同一个 prefab 被实例化两次，`Awake` 会跑两次；必须 `Destroy` 后来者，否则场上有两个"唯一" |
| 跨场景 | 不加 `DontDestroyOnLoad`，切场景后对象被销毁，静态字段变成"已销毁的引用"（`== null` 为 true，但 C# 引用不为 null） |
| 退出清理 | `OnDestroy` 里置空静态字段，避免编辑器反复进入播放模式时残留 |

### 1.4 静态字段 + 场景重载的经典坑

Unity 有一个反直觉行为：**静态字段不会随播放模式退出而重置**（在编辑器里）。

```csharp
// 第一次 Play：s_instance 被赋值
// 停止 → 第二次 Play：场景重新加载，Awake 又跑一次
// 如果 Awake 里没有 "已存在就销毁后来者"，就会出现两个实例
```

所以单例的 `Awake` **必须**写成 `if (s_instance != null && s_instance != this) { Destroy(gameObject); return; }`——
这行不是为了"防御"，而是直接决定第二次 Play 会不会报错。

### 1.5 什么时候不该用单例

| 反模式 | 后果 | 替代方案 |
| --- | --- | --- |
| 什么都是单例 | 全局状态无处不在，模块间隐式耦合，改一处炸一片 | 能传参就传参，能注入就注入 |
| 单例持有 UI 引用 | UI 销毁后单例里留着野引用，切场景必空指针 | 单例只做服务和数据，UI 走面板管理器 |
| 单例里写业务逻辑 | 单例变成"上帝类"，几千行一个文件 | 单例只做门面，业务拆到普通类/模块 |
| 用单例代替事件 | 模块 A 直接拿模块 B 的单例调方法，等于强耦合 | 跨模块用事件总线（见第 3 节） |

一句话判断：**"全局唯一 + 只做服务"才用单例；"全局唯一 + 还带业务状态"就该拆。**

---

## 2 工厂（Factory）

### 2.1 它要解决的问题

创建逻辑散落在各处时，会出现三种典型的烂摊子：

```csharp
// 反面示例：调用方直接 new / Instantiate
var enemy = Instantiate(prefab);
enemy.GetComponent<EnemyBase>().Init(config);
enemy.GetComponent<EnemyFSM>().Init();
// 换一个敌人类型，所有调用点都要改
```

| 问题 | 后果 |
| --- | --- |
| 创建步骤多且固定 | 漏掉 `Init` 就是"敌人站着不动" |
| 类型判断散落 | `switch (type)` 到处都是，新增类型要全局搜索 |
| 依赖具体类型 | 想换实现（近战/远程/法术武器）必须改调用方 |

### 2.2 简单工厂：一个入口收敛所有 new

```csharp
public static class WeaponFactory
{
    public static WeaponBase Create(WeaponConfig config, Transform parent)
    {
        // 由配置决定具体类型，调用方不再关心 new 了什么
        WeaponBase weapon = config.weaponType switch
        {
            WeaponType.Melee  => parent.gameObject.AddComponent<MeleeWeapon>(),
            WeaponType.Ranged => parent.gameObject.AddComponent<RangedWeapon>(),
            WeaponType.Spell  => parent.gameObject.AddComponent<SpellWeapon>(),
            _ => throw new ArgumentOutOfRangeException(nameof(config.weaponType))
        };
        weapon.Setup(config);
        return weapon;
    }
}
```

适用：类型不多、产品族固定、不需要扩展。

缺点：**违反开闭原则**——新增武器类型仍要改这个 `switch`。

### 2.3 工厂方法：把"造什么"交给子类

```csharp
public abstract class WeaponFactoryBase
{
    public WeaponBase Create(WeaponConfig config, Transform parent)
    {
        var weapon = CreateWeapon(parent);   // 具体类型由子类决定
        weapon.Setup(config);
        return weapon;
    }

    protected abstract WeaponBase CreateWeapon(Transform parent);
}

public class MeleeWeaponFactory : WeaponFactoryBase
{
    protected override WeaponBase CreateWeapon(Transform parent)
        => parent.gameObject.AddComponent<MeleeWeapon>();
}
```

适用：每种产品都有自己的创建流程（比如远程武器要先建弹道节点）。

代价：每多一种产品多一个子类，类数量膨胀。

### 2.4 抽象工厂：按"产品族"创建

当产品不止一个维度（武器 × 皮肤 × 音效）时，简单工厂会变成 `switch` 套 `switch`：

```csharp
public interface IWeaponKitFactory
{
    WeaponBase CreateWeapon();
    WeaponSkin CreateSkin();
    WeaponAudio CreateAudio();
}

public class SwordKitFactory : IWeaponKitFactory { /* 剑的一整套 */ }
public class BowKitFactory   : IWeaponKitFactory { /* 弓的一整套 */ }
```

适用：换主题/换风格要**整族替换**的场景（赛季皮肤、阵营皮肤）。

**一般游戏项目用不到抽象工厂**——真到那一步，往往更应该做成数据驱动（配置表 + 资源地址），而不是堆类。

### 2.5 三种工厂怎么选

| 类型 | 复杂度 | 适用 | 代价 |
| --- | --- | --- | --- |
| 简单工厂 | 低 | 类型少、产品固定 | 新增类型要改入口 |
| 工厂方法 | 中 | 每种产品创建流程不同 | 类数量增长 |
| 抽象工厂 | 高 | 产品族整体替换 | 结构重、过度设计风险高 |

### 2.6 数据驱动的工厂（工程里最实用的一版）

真正在项目里跑得最顺的，是把"造什么"从代码搬到配置：

```csharp
public class WeaponProxy : MonoBehaviour   // 挂在 prefab 上的 AOT 代理组件
{
    [SerializeField] private WeaponConfig _config;
    [SerializeField] private string _hotTypeFullName;   // 热更类型全名

    private void Awake()
    {
        // 用类型全名反射创建 → 热更程序集里的类型也能造出来
        var type = HotUpdateAssembly.Resolve(_hotTypeFullName);
        var weapon = (WeaponBase)gameObject.AddComponent(type);
        weapon.ApplyTuning(_config);   // 注入数值
    }
}
```

好处：

| 好处 | 说明 |
| --- | --- |
| 换武器不改代码 | 改 prefab 上两个字段即可 |
| 数值与逻辑分离 | 数值在 SO，逻辑在热更 dll |
| 新增类型只写一个类 | 不需要改工厂入口 |

这正是 CryptWalker 里 `WeaponProxy` / `EnemyProxy` / `PlayerProxy` 的思路：
**资产只挂 AOT 类型，热更组件由代理运行时创建**（跨程序集序列化的硬约束，详见热更新那篇）。

---

## 3 观察者（Observer / 事件总线）

### 3.1 它要解决的问题

模块 A 发生了事，模块 B、C、D 都要知道，但 A **不该认识** B、C、D。

```csharp
// 反面：敌人死亡后直接调用一堆系统
player.GainExp(enemy.exp);
questSystem.OnEnemyDied(enemy);
audioSystem.PlayDeath(enemy.position);
ui.RefreshKillCount();
// 每加一个"关心死亡"的系统，就要改一次敌人代码
```

### 3.2 事件总线写法

```csharp
public enum GameEvent
{
    PlayerHpChanged,
    EnemyDied,
    CoinChanged,
    LevelCleared
}

public static class EventBus
{
    private static readonly Dictionary<GameEvent, Action<object>> s_handlers = new();

    public static void Subscribe(GameEvent e, Action<object> handler)
    {
        s_handlers.TryGetValue(e, out var list);
        s_handlers[e] = list + handler;
    }

    public static void Unsubscribe(GameEvent e, Action<object> handler)
    {
        if (s_handlers.TryGetValue(e, out var list))
            s_handlers[e] = list - handler;
    }

    public static void Raise(GameEvent e, object payload = null)
    {
        if (!s_handlers.TryGetValue(e, out var list)) return;

        // 反向迭代：允许广播过程中取消订阅而不会下标越界
        var arr = list.GetInvocationList();
        for (int i = arr.Length - 1; i >= 0; i--)
            ((Action<object>)arr[i]).Invoke(payload);
    }
}
```

两个细节决定了它能不能上生产：

| 细节 | 不这么写的后果 |
| --- | --- |
| 反向迭代 `GetInvocationList()` | 在回调里 `Unsubscribe` 会抛 `InvalidOperationException` |
| 枚举做事件名 | 裸字符串必然拼错，且 IDE 无法跳转 |

### 3.3 事件该不该用：三条判据

| 判据 | 该用事件 | 该直接调用 |
| --- | --- | --- |
| 方向 | 只是"通知我变了" | "我要你干活" |
| 频率 | 低频（死亡、升级、金币变化） | 每帧（坐标、瞄准方向） |
| 归属 | 跨模块 | 同模块内部 |

最容易犯的错是**每帧 Raise**：一帧几十次字典查找 + 委托调用，GC 和 CPU 都疼。
每帧变化的数据在 `Update` 里直接读属性，不进总线。

### 3.4 C# 原生 `event` 与事件总线的区别

| | 原生 `event` | 事件总线 |
| --- | --- | --- |
| 订阅者 | 必须持有发布者引用 | 不需要，完全解耦 |
| 生命周期 | 随对象销毁自动断开（但静态事件不会） | 必须手动 `Unsubscribe`，否则内存泄漏 |
| 适用 | 同一个类/模块内部 | 跨模块广播 |

静态事件（`public static event Action X;`）是内存泄漏重灾区：
订阅者被销毁后，静态事件的委托链仍然握着它 → 整个对象无法被 GC。

---

## 4 对象池（Object Pool）

### 4.1 它要解决的问题

高频创建/销毁的对象会让 GC 与 Instantiate 开销同时爆炸：

| 对象 | 频率 |
| --- | --- |
| 子弹 | 每秒几十个 |
| 飘字/伤害数字 | 每次命中 |
| 列表项 | 滚动时不断回收复用 |
| 特效 | 每次攻击 |

`Instantiate` + `Destroy` 的问题不只是慢，还会造成**堆碎片**与**帧率尖刺**。

### 4.2 泛型对象池

```csharp
public class ObjectPool<T> where T : class, IPoolable
{
    private readonly Stack<T> _stack = new();
    private readonly Func<T> _create;
    private readonly int _maxSize;

    public ObjectPool(Func<T> create, int maxSize = 100)
    {
        _create = create ?? throw new ArgumentNullException(nameof(create));
        _maxSize = maxSize;
    }

    public T Get()
    {
        T item = _stack.Count > 0 ? _stack.Pop() : _create();
        item.OnSpawn();
        return item;
    }

    public void Return(T item)
    {
        item.OnRecycle();
        if (_stack.Count < _maxSize) _stack.Push(item);
        else DestroyIfNeeded(item);   // 超出容量才真正销毁，防止无限增长
    }
}

public interface IPoolable
{
    void OnSpawn();
    void OnRecycle();
}
```

### 4.3 三个必须遵守的约束

| 约束 | 原因 |
| --- | --- |
| 必须实现 `IPoolable` | 取出时重置数值/动画/计时器，否则会"带着上一次的状态复活" |
| 必须有容量上限 | 否则高峰期涨上去就永不回落，等于内存泄漏 |
| 创建委托要注入 | 池不依赖具体资源加载方式（YooAsset / prefab / 代码 new） |

### 4.4 池化对象最常见的 bug

```csharp
// 反面：回收时只关 active，忘了清状态
public void OnRecycle() => gameObject.SetActive(false);

// 下一次 Get 出来：血量还是 0、动画停在死亡帧、计时器还在跑
public void OnSpawn()
{
    gameObject.SetActive(true);
    _hp = _maxHp;
    _timer = 0f;
    _animator.Play("IdleSouth");   // 必须重播，否则残留上一轮的片段
}
```

排查口诀：**"池化对象出现诡异状态" → 先查 `OnSpawn` 有没有重置全。**
对象池不会帮你重置任何东西，它只是"不销毁"。

---

## 5 策略与状态：用组合替代分支

虽然不是用户点名的模式，但它是**写得最爽、收益最直接**的一类：

```csharp
// 反面：一个方法里堆满 if/else
if (weaponType == Melee) { ... }
else if (weaponType == Ranged) { ... }
else if (weaponType == Spell) { ... }
```

改成"每个类型一个类，公共接口统一"：

```csharp
public abstract class WeaponBase : MonoBehaviour
{
    public abstract void Attack(Vector2 dir);
}
```

这就同时解决了：

| 问题 | 解决方式 |
| --- | --- |
| 新增类型要改旧代码 | 只加一个类，旧代码不动 |
| 状态切换散落 | 交给状态机（`Fsm<T>`）统一 `ChangeState` |
| 单元测试困难 | 每个策略类可独立测试 |

> 状态机那篇讲的就是它的"状态"版本：`IdleState → WalkState → AttackState`，每个状态一个类。

---

## 6 常见误用对照表

| 误用 | 症状 | 正确做法 |
| --- | --- | --- |
| 单例当全局变量用 | 什么都能改，改错无从追溯 | 单例只做服务，数据放 SO / 存档 |
| 单例 `Awake` 不查重 | 编辑器第二次 Play 两个实例 | `if (s_instance != null && s_instance != this) Destroy` |
| 简单工厂里 `switch` 无限增长 | 每加类型都改工厂 | 类型多就转数据驱动（配置 + 反射/地址） |
| 抽象工厂做武器 | 类爆炸、没人看得懂 | 数据驱动 + 组合，别上抽象工厂 |
| 每帧 `Raise` 事件 | CPU 与 GC 双高 | `Update` 直接读属性 |
| 静态事件不取消订阅 | 对象销毁后仍被引用，内存泄漏 | 在 `OnDestroy` / `OnDisable` 里 `-=` |
| 对象池不重置状态 | 复用对象带着旧数值/旧动画 | `OnSpawn` 全量重置 |
| 对象池无上限 | 内存只涨不落 | 设 `maxSize`，超出真正销毁 |

---

## 7 小结

| 模式 | 一句话记住 | 项目里的位置 |
| --- | --- | --- |
| 单例 | 全局唯一 + 只做服务；`Awake` 必须查重 | `MainLauncher`、各 Service、EventBus |
| 工厂（简单） | 收敛创建步骤，调用方不碰 `new` | 武器/敌人的统一构造入口 |
| 工厂（方法/抽象） | 产品族扩展用，别为少量类型上 | 赛季皮肤、整套资源替换 |
| 工厂（数据驱动） | 配置里写"造什么"，代码里只写"怎么造" | `WeaponProxy` / `EnemyProxy` |
| 观察者 | 通知而非命令；高频数据不进总线 | `EventBus` + `GameEvent` |
| 对象池 | 不销毁但必须重置 + 有上限 | 子弹、飘字、列表项 |
| 策略/状态 | 一个类型一个类，消灭巨型 `switch` | `WeaponBase` 三个子类、`Fsm<T>` |

**判断标准只有一条**：模式是用来**消除重复和耦合**的，不是用来让目录看起来更"高级"的。
如果一个模式引入了比它消灭的更多的间接层，那就该退回去写直白的代码。
