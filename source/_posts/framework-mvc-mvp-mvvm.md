---
title: 'MVC、MVP、MVVM：三种 UI 架构怎么选'
date: 2026-10-28 16:14:43
categories:
  - 框架架构
tags:
  - 架构
  - MVC
  - MVP
  - MVVM
cover: /img/covers/c6.svg
top_img: /img/covers/c6.svg
description: '游戏项目写到中期，"UI 面板里塞满业务逻辑"几乎是必经的坑：一个 InventoryPanel 里既有数据请求、又有槽位复用、还有拖拽交换，两千行。'
---
## 文档简介

游戏项目写到中期，"UI 面板里塞满业务逻辑"几乎是必经的坑：一个 `InventoryPanel` 里既有数据请求、又有槽位复用、还有拖拽交换，两千行。

本文把 **MVC / MVP / MVVM** 三者的数据流向、职责边界、Unity 落地方式讲清楚，并给出**在游戏客户端里到底该选哪个**的结论。

---

## 1 问题的起点：UI 代码为什么会失控

一个典型的面板，一开始长这样：

```csharp
public class InventoryPanel : MonoBehaviour
{
    void Start()
    {
        var data = GameData.Instance.Items;          // 直接读全局数据
        foreach (var item in data) { /* 生成格子 */ }
    }

    void Update()
    {
        // 每帧检查数据有没有变，变了就重建一遍列表
    }

    public void OnClickSell(int index)
    {
        GameData.Instance.Items.RemoveAt(index);     // 直接改数据
        PlayerMoney.Instance.Add(100);               // 直接改另一个系统
        Refresh();                                   // 再刷新自己
    }
}
```

问题一目了然：

| 问题 | 后果 |
| --- | --- |
| UI 直接读数据源 | 数据格式一改，所有面板跟着改 |
| UI 直接改数据 | 业务规则散在界面里，无法复用、无法单测 |
| 数据变了 UI 不知道 | 只能 `Update` 轮询，或者到处手动 `Refresh()` |
| 一个面板牵连多个系统 | 改一处崩一片 |

三种架构解决的是**同一个问题**：**把"数据"和"显示"拆开**。差别只在于**中间那一层是谁**。

---

## 2 MVC：Model - View - Controller

### 2.1 数据流

```
用户操作 ──▶ Controller ──▶ Model 改变
                  │              │
                  ▼              ▼
                View ◀──── 通知/读取
```

- **Model**：数据 + 业务规则（不含任何 UI 概念）
- **View**：只负责显示（订阅 Model 的变化）
- **Controller**：接收输入，调 Model，决定用哪个 View

### 2.2 Unity 里的 MVC

```csharp
// ---------- Model：纯数据 + 规则 ----------
public class InventoryModel
{
    private readonly List<ItemData> _items = new();
    public IReadOnlyList<ItemData> Items => _items;
    public event Action OnChanged;

    public bool TryRemove(int index, out ItemData item)
    {
        item = null;
        if (index < 0 || index >= _items.Count) return false;
        item = _items[index];
        _items.RemoveAt(index);
        OnChanged?.Invoke();          // Model 只"通知"，不管谁来听
        return true;
    }
}

// ---------- View：只显示 ----------
public class InventoryView : MonoBehaviour
{
    [SerializeField] private Transform _slotRoot;
    private InventoryModel _model;

    public void Bind(InventoryModel model)
    {
        _model = model;
        _model.OnChanged += Refresh;
        Refresh();
    }

    private void OnDestroy()
    {
        if (_model != null) _model.OnChanged -= Refresh;
    }

    private void Refresh() { /* 只做渲染，不碰业务 */ }
}

// ---------- Controller：接输入 ----------
public class InventoryController
{
    private readonly InventoryModel _model;
    public InventoryController(InventoryModel model) => _model = model;

    public void Sell(int index)
    {
        if (!_model.TryRemove(index, out var item)) return;
        EconomyService.Instance.AddCoin(item.sellPrice);   // 业务规则在 Controller
    }
}
```

### 2.3 MVC 的特点

| 优点 | 缺点 |
| --- | --- |
| 职责边界清晰 | View 仍然直接持有 Model 引用 |
| Model 完全可单测 | View 与 Model 仍有耦合，换 UI 框架要动 Model |
| 结构简单、上手快 | Controller 容易膨胀成"什么都管" |

**结论**：MVC 适合**中小型项目**、或者 UI 比较简单的编辑器工具。

---

## 3 MVP：Model - View - Presenter

### 3.1 与 MVC 的关键差异

MVP 把 View **彻底变成哑巴**：View 不知道 Model 的存在，一切通过 Presenter 中转。

```
用户操作 ──▶ View ──(事件)──▶ Presenter ──▶ Model
                  ▲                  │
                  └────(接口调用)─────┘
```

### 3.2 落地：View 只暴露接口

```csharp
// ---------- View 接口：只声明"能显示成什么样" ----------
public interface IInventoryView
{
    event Action<int> OnSellClicked;
    void ShowItems(IReadOnlyList<ItemData> items);
    void ShowToast(string msg);
}

// ---------- View 实现：Unity 侧 ----------
public class InventoryPanel : MonoBehaviour, IInventoryView
{
    public event Action<int> OnSellClicked;
    [SerializeField] private Transform _slotRoot;

    public void ShowItems(IReadOnlyList<ItemData> items) { /* 只渲染 */ }
    public void ShowToast(string msg) { /* 只弹提示 */ }

    // 按钮点击时触发，不写任何业务
    private void HandleSlotSell(int index) => OnSellClicked?.Invoke(index);
}

// ---------- Presenter：所有逻辑都在这里 ----------
public class InventoryPresenter
{
    private readonly InventoryModel _model;
    private readonly IInventoryView _view;

    public InventoryPresenter(InventoryModel model, IInventoryView view)
    {
        _model = model;
        _view = view;
        _view.OnSellClicked += HandleSell;
        _model.OnChanged += Refresh;
    }

    private void HandleSell(int index)
    {
        if (!_model.TryRemove(index, out var item)) return;
        EconomyService.Instance.AddCoin(item.sellPrice);
        _view.ShowToast($"已出售 {item.name}");
    }

    private void Refresh() => _view.ShowItems(_model.Items);

    public void Dispose()
    {
        _view.OnSellClicked -= HandleSell;
        _model.OnChanged -= Refresh;
    }
}
```

### 3.3 MVP 的特点

| 优点 | 缺点 |
| --- | --- |
| View 与 Model **完全解耦**，View 可替换 | 每加一个面板就要多写一个 View 接口 |
| Presenter 可脱离 Unity 单测 | 接口数量膨胀，样板代码多 |
| 数据流单向，好排查 | Presenter 容易变胖 |

**结论**：MVP 是**游戏项目里最实用的一档**。商业项目里 PureMVC 的 Mediator 本质上就是 MVP 的变体（Mediator ≈ Presenter，Proxy ≈ Model）。

---

## 4 MVVM：Model - View - ViewModel

### 4.1 数据流

```
View ──(双向绑定)── ViewModel ──▶ Model
```

核心是**绑定（Binding）**：View 的某个属性绑到 ViewModel 的某个属性上，ViewModel 变了 UI 自动变，不需要手动 `Refresh()`。

### 4.2 Unity 里的三种做法

| 做法 | 说明 | 评价 |
| --- | --- | --- |
| `INotifyPropertyChanged` + 手写订阅 | 纯 C# 实现，不依赖 UI 框架 | 可用，但不省事 |
| UI Toolkit 的 `dataSource` + Binding | 官方支持，真正双向绑定 | 新项目推荐 |
| 第三方 MVVM 框架（如 UniRx / 自研） | 用响应式流 | 学习成本高 |

```csharp
// ViewModel：属性变化主动通知
public class InventoryViewModel : INotifyPropertyChanged
{
    public event PropertyChangedEventHandler PropertyChanged;

    private int _coin;
    public int Coin
    {
        get => _coin;
        set
        {
            if (_coin == value) return;
            _coin = value;
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(nameof(Coin)));
        }
    }
}
```

```csharp
// View：绑定后不再手动刷新
public class CoinLabel : MonoBehaviour
{
    [SerializeField] private Text _text;

    public void Bind(InventoryViewModel vm)
    {
        vm.PropertyChanged += (_, e) =>
        {
            if (e.PropertyName == nameof(InventoryViewModel.Coin))
                _text.text = vm.Coin.ToString();
        };
        _text.text = vm.Coin.ToString();
    }
}
```

### 4.3 MVVM 的特点

| 优点 | 缺点 |
| --- | --- |
| 无手动刷新代码，数据一致性强 | 调试链路长，"谁改的值"不好追 |
| ViewModel 可完全脱离 Unity 测试 | 需要绑定基础设施，否则等于手写一堆订阅 |
| 适合表单密集、状态多的界面 | 游戏 HUD 这种"少状态、高频更新"并不适合 |

**结论**：MVVM 适合 **UI Toolkit / 表单/数据密集型界面**。
传统 UGUI 项目里硬上 MVVM，多半会退化成"手写一堆 `PropertyChanged` 订阅"，比 MVP 还啰嗦。

---

## 5 三者横向对比

| 维度 | MVC | MVP | MVVM |
| --- | --- | --- | --- |
| 中间层 | Controller | Presenter | ViewModel |
| View 是否知道 Model | ✅ 知道 | ❌ 不知道（只认接口） | ❌ 不知道（靠绑定） |
| 数据流 | 双向（View 可读 Model） | 单向 | 双向（绑定） |
| View 与中间层关系 | 一对多 | 一对一（接口） | 一对一（绑定） |
| 样板代码量 | 少 | 多（每面板一个接口） | 中（需绑定框架） |
| 可测试性 | Model 可测 | 全部可测 | 全部可测 |
| 上手难度 | 低 | 中 | 高 |
| 典型场景 | 小项目、工具 | **游戏面板** | 表单/UI Toolkit |

---

## 6 游戏项目里到底怎么选

### 6.1 我的实际选择

| 场景 | 用的架构 | 原因 |
| --- | --- | --- |
| 商业项目业务面板（背包/图鉴/强化） | **PureMVC（MVP 变体）** | 面板多、需要统一规范、多人协作 |
| 《地穴行者》HUD（血条/金币/技能） | **事件驱动 + 轻量 Controller** | 状态少、更新高频，上 MVP 纯属自找麻烦 |
| 配置/数据编辑工具 | **MVC** | 结构简单，不需要过度抽象 |

### 6.2 一条务实的判断线

| 面板特征 | 建议 |
| --- | --- |
| 状态多、交互复杂、需要复用 | MVP（或 PureMVC） |
| 只是显示几个数（血条、金币） | 事件订阅 + 直接刷 UI，别硬套 |
| 用 UI Toolkit 做数据密集界面 | MVVM |
| 一次性小工具 | 不用架构，直接写 |

### 6.3 分层边界的通用原则

不管选哪种，这三条不能破：

| 原则 | 说明 |
| --- | --- |
| **数据不进 UI** | UI 只读快照，不持有业务对象引用 |
| **UI 只做显示** | 计算、判断、请求全部在中间层 |
| **通知用事件，命令用调用** | "我变了"广播；"你去做"直接调 |

---

## 7 常见误用

| 误用 | 症状 | 修正 |
| --- | --- | --- |
| 面板里 `Update` 轮询数据 | CPU 空转、还是刷不干净 | 数据变化时 `event` / 事件总线通知 |
| View 持有 Model 后直接改 | 业务规则漏进 UI | 所有写操作经过 Controller / Presenter |
| Presenter 里 `GetComponent` | 逻辑层绑死 Unity，无法单测 | View 接口只暴露数据与事件 |
| 每个小 HUD 都做 MVP | 接口比代码还长 | 简单 HUD 用事件订阅 |
| MVVM 硬套 UGUI | 手写一堆 `PropertyChanged` | 换 MVP，或上 UI Toolkit |
| 忘了解除订阅 | 面板关闭后仍被回调，空引用/泄漏 | `OnDestroy` / `Dispose` 里全部 `-=` |

---

## 8 小结

| 架构 | 一句话 | 什么时候用 |
| --- | --- | --- |
| MVC | Controller 接输入，View 可以直接读 Model | 小项目、编辑器工具 |
| MVP | View 是哑巴，Presenter 管一切 | **游戏业务面板的首选** |
| MVVM | 靠绑定自动同步，不写刷新 | UI Toolkit / 表单型界面 |

真正决定代码质量的不是选了哪个缩写，而是**"业务逻辑有没有离开 UI 脚本"**。
只要这一条做到了，MVC 和 MVP 的差别往往没有想象中那么大；
反过来，如果业务逻辑还在 `Button.onClick` 里，叫 MVVM 也没用。
