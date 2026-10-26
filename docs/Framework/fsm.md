# 通用状态机 Fsm&lt;T&gt;

## 文档简介

玩家、敌人、主流程——三者的行为逻辑都是"在若干状态之间切换，每个状态有自己的进入、更新、退出"。如果各写一套 `if/else`，代码会迅速失控。

本文记录一套**只写一次的通用状态机骨架**，以及它在三类角色上的复用方式。

---

## 1 为什么需要状态机

### 1.1 命令式写法的困境

```csharp
// 反面示例：用枚举 + switch 管理行为
switch (_state)
{
    case State.Idle:
        if (hasInput) _state = State.Walk;
        else if (attackPressed) _state = State.Attack;
        break;
    case State.Walk:
        if (!hasInput) _state = State.Idle;
        else if (attackPressed) _state = State.Attack;
        break;
    // 每加一个状态，所有分支都要改
}
```

问题：

| 问题 | 后果 |
| --- | --- |
| 状态逻辑混在一个方法里 | 越来越长，改一处影响全局 |
| 进入/退出逻辑散落 | 忘记重置朝向、动画、冷却 |
| 新增状态要改所有分支 | 违反开闭原则 |
| 无法复用 | 敌人要再写一遍 |

### 1.2 状态机要解决的

- 每个状态**独立成类**，只关心自己的行为
- 进入 / 更新 / 退出三个时机明确
- 切换统一入口，避免非法跳转
- 骨架复用，角色只提供具体状态

---

## 2 骨架设计

### 2.1 两个抽象类

```csharp
public abstract class Fsm<T> where T : class
{
    public T Owner { get; }
    public FsmState<T> CurrentState { get; private set; }

    protected Fsm(T owner) { Owner = owner; }

    public void ChangeState<TState>() where TState : FsmState<T>, new()
    {
        CurrentState?.OnExit(Owner);
        CurrentState = new TState();
        CurrentState.OnEnter(Owner);
    }

    public void OnUpdate(float deltaTime)
        => CurrentState?.OnUpdate(Owner, deltaTime);
}

public abstract class FsmState<T> where T : class
{
    public abstract void OnEnter(T owner);
    public abstract void OnUpdate(T owner, float deltaTime);
    public abstract void OnExit(T owner);
}
```

### 2.2 设计要点

| 点 | 说明 |
| --- | --- |
| 泛型 `T` | 状态机上挂谁，就传谁（玩家、敌人、流程管理器） |
| `new()` 约束 | 状态无参实例化，简单直接；需要依赖时通过 Owner 拿 |
| 单一 `ChangeState` 入口 | 所有切换走同一条路，便于加日志、加拦截 |
| 三段式生命周期 | `OnEnter` / `OnUpdate` / `OnExit`，职责清晰 |

---

## 3 三类复用

### 3.1 玩家：3 状态

| 状态 | 职责 |
| --- | --- |
| Idle | 待机，检测输入 |
| Walk | 移动，按朝向播放动画 |
| Attack | 攻击，管理前摇 / 判定 / 后摇 |

```csharp
public class PlayerFSM : Fsm<PlayerController>
{
    public PlayerFSM(PlayerController owner) : base(owner) { }
}

public class WalkState : FsmState<PlayerController>
{
    public override void OnEnter(PlayerController owner)
    {
        owner.PlayAction("Walk", owner.Facing);   // 按朝向拼片段名
    }

    public override void OnUpdate(PlayerController owner, float dt)
    {
        if (!owner.HasMoveInput) { owner.Fsm.ChangeState<IdleState>(); return; }
        owner.Move(dt);
    }

    public override void OnExit(PlayerController owner) { }
}
```

### 3.2 敌人：6 状态

`Idle / Walk / Run / Attack / Hurt / Death`。追击半径内切 Run，攻击范围内切 Attack，受击切 Hurt，血量归零切 Death。

### 3.3 主流程：4 状态

`Boot → MainMenu → Game → Settle`。流程状态机管的是"整个游戏处在哪个阶段"，与角色状态机完全同构，只是 Owner 换成了流程管理器。

---

## 4 状态机与动画的关系

**原则：动画由状态直接驱动，不用 Animator 参数和 Transition。**

```csharp
// 状态里直接按名字播放片段
owner.Animator.Play("WalkSouth");
```

理由：

| 做法 | 问题 |
| --- | --- |
| Animator 参数 + Transition | 状态机藏在 Animator 图里，代码看不到全貌；调试要两边对照 |
| 代码直控 clip | 行为逻辑与动画播放同一处，改状态即改动画，所见即所得 |

配套约定：

- 片段命名包含方向：`WalkSouth / WalkNorth / WalkLeft / WalkRight`
- 转向时必须**重播当前动画**，否则朝向不变
- 循环片段（Idle / Walk / Run）设 Loop，单次片段（Attack / Hurt / Death）不 Loop

---

## 5 扩展方式

### 5.1 加连招

不修改现有状态，**新增状态类**串联：

```text
Attack1State →（判定命中）→ Attack2State →（判定命中）→ Attack3State
```

每个状态只负责自己那段的动画、判定窗口与取消时机。

### 5.2 加技能

技能状态内部管理**冷却**与**硬直**：`OnEnter` 检查冷却，`OnUpdate` 递减计时，`OnExit` 写入冷却时间。

### 5.3 为什么不用事件总线切状态

状态切换是**模块内部**的高频同步行为，直接调用 `ChangeState<T>()` 更快、更可控。EventBus 是低频通知总线，不适合用来做状态驱动。

---

## 6 小结

| 要点 | 结论 |
| --- | --- |
| 骨架 | `Fsm<T>` + `FsmState<T>`，三段式生命周期 |
| 切换 | 统一 `ChangeState<TState>()` |
| 复用 | 玩家 3 状态、敌人 6 状态、主流程 4 状态共用一套骨架 |
| 动画 | 状态直接 `Animator.Play(clipName)`，不用参数与 Transition |
| 扩展 | 新行为加状态类，不改老状态 |

状态机的收益不是"代码少"，而是**每加一个行为，只需要加一个类，而不是在几百行的 switch 里再塞一个分支**。
