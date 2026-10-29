---
title: '虚拟列表 ListView：千级条目不卡顿'
date: 2026-10-26 10:07:35
categories:
  - Unity开发
tags:
  - Unity
  - UGUI
  - 虚拟列表
  - 性能优化
cover: /img/covers/c3.svg
top_img: /img/covers/c3.svg
description: '背包、图鉴、排行榜这类界面，条目数经常上千。直接用 ScrollRect + VerticalLayoutGroup 全量实例化，结果是：打开慢、滑动卡、内存高。'
---
## 文档简介

背包、图鉴、排行榜这类界面，条目数经常上千。直接用 `ScrollRect + VerticalLayoutGroup` 全量实例化，结果是：**打开慢、滑动卡、内存高**。

虚拟列表（Virtual List）解决的就是这个问题：**只创建"看得见的那几个"**。

---

## 1 全量列表为什么不行

| 问题 | 说明 |
| --- | --- |
| 实例化开销 | 1000 个 Item 一次性 Instantiate，打开界面直接卡住 |
| 布局开销 | `LayoutGroup` 每次重建都要遍历全部子节点计算尺寸 |
| 合批压力 | 上千个 Graphic 参与排序与合批，Batches 暴涨 |
| 内存 | 每个 Item 都有组件、文本、图片引用，常驻内存 |
| 滑动掉帧 | 滚动时布局重建 + 大量 Canvas 重绘 |

结论：**条目数超过 100 左右，就该考虑虚拟化**。

---

## 2 虚拟列表的核心思路

```text
可视区（Viewport）：用户当前能看到的区域
缓冲区（Buffer）：可视区上下各多渲染几条，避免快速滑动时露白

只创建：可视区 + 缓冲区的 Item
其余条目：只有数据，没有 GameObject
```

滑动时复用已有 Item：**改变内容与坐标，而不是新建对象**。

---

## 3 实现结构

### 3.1 布局组成

| 组件 | 作用 |
| --- | --- |
| `ScrollRect` | 提供滚动容器 |
| `Viewport` | 裁剪区域（配合 `RectMask2D`） |
| `Content` | 撑起总长度（高度 = 条目数 × 单条高度） |
| Item 池 | 复用可视区内的 Item |

关键：`Content` 的总高度必须按**全部条目**算，滚动条才准确；但子节点只有可视区那十几个。

### 3.2 核心逻辑

```csharp
void UpdateVisibleItems()
{
    // 当前滚动位置对应的起始索引
    int startIndex = Mathf.FloorToInt(_content.anchoredPosition.y / _itemHeight);
    startIndex = Mathf.Clamp(startIndex, 0, _dataCount - 1);

    // 可视区能放下几条 + 上下各留 2 条缓冲
    int endIndex = Mathf.Min(startIndex + _visibleCount + 2, _dataCount);

    // 回收超出范围的 Item
    for (int i = _activeItems.Count - 1; i >= 0; i--)
    {
        if (_activeItems[i].Index < startIndex || _activeItems[i].Index >= endIndex)
            RecycleItem(_activeItems[i]);
    }

    // 为缺失的索引补充 Item（从池里取）
    for (int i = startIndex; i < endIndex; i++)
    {
        if (!_activeItems.ContainsKey(i))
            _activeItems[i] = SpawnItem(i);
    }
}
```

### 3.3 Item 复用

```csharp
ItemView SpawnItem(int index)
{
    var item = _pool.Get();                 // 对象池取，不 Instantiate
    item.Index = index;
    item.Bind(_dataList[index]);            // 只刷新内容
    item.Rect.anchoredPosition = new Vector2(0, -index * _itemHeight);
    return item;
}
```

要点：**内容刷新必须完整覆盖所有字段**。复用的 Item 还带着上一条的数据，漏刷一个图标就会串数据。

---

## 4 与对象池的配合

| 阶段 | 动作 |
| --- | --- |
| 取用 | `pool.Get()` → 激活 → 绑定数据 → 设置坐标 |
| 回收 | 解绑数据 → `pool.Return()` → 停用 |
| 容量 | 池上限设为"可视区 + 缓冲区"的 2 倍即可，不要无限增长 |

---

## 5 常见坑

| 坑 | 原因 | 解法 |
| --- | --- | --- |
| 快速滑动露白 | 没有缓冲区 | 上下各多渲染 2-4 条 |
| 数据串行 | 复用 Item 未刷新全部字段 | 绑定方法里逐字段赋值 |
| 滚动条长度不对 | `Content` 高度按实际 Item 算 | 按"总条目数 × 单条高度"计算 |
| 条目高度不一致 | 固定高度假设失效 | 改用"前缀和 + 二分查找"定位起始索引 |
| 打开仍卡 | 一次性读取全部数据 | 数据也分页 / 分帧加载 |
| 图集超限 | 每个 Item 的图标都从独立图集加载 | 统一图集 + 按需加载 |

---

## 6 效果对比

以千级条目为例（同一台机器、同一界面）：

| 指标 | ScrollRect + LayoutGroup | 虚拟列表 |
| --- | --- | --- |
| 实例化对象数 | 1000+ | 10-20 |
| 打开耗时 | 数百毫秒，明显卡顿 | 一帧内完成 |
| 滑动帧率 | 波动明显 | 稳定 |
| 布局重建 | 每次滚动全量重算 | 不触发（手动定位） |
| 内存占用 | 高 | 低 |

具体数字因项目而异，但**量级差异是确定的**。

---

## 7 小结

| 要点 | 结论 |
| --- | --- |
| 适用条件 | 条目数 > 100，或需要无限滚动 |
| 核心 | 只创建可视区 + 缓冲区，其余只留数据 |
| 实现 | Content 撑总长，Item 池复用，手动定位而非 LayoutGroup |
| 前提 | 固定条目高度；变高需前缀和二分 |
| 配套 | 对象池、图集统一、数据分帧加载 |

虚拟列表的价值不只是"少建对象"，而是把**UI 的复杂度从"条目数"解耦成"屏幕能放几条"**。条目从 100 涨到 10000，开销几乎不变。
