# UGUI 基础

## 1. Canvas

> 所有 UI 元素的根节点，有三种渲染模式：

- **Screen Space - Overlay**: 覆盖在屏幕上（默认）
- **Screen Space - Camera**: 由指定相机渲染
- **World Space**: 3D 世界空间中的 UI

## 2. 常用 UI 组件

| 组件 | 用途 |
|------|------|
| Text (TMP) | 文本显示（推荐使用 TextMeshPro） |
| Image | 图片显示 |
| Button | 按钮 |
| InputField | 输入框 |
| Slider | 滑动条 |
| ScrollView | 滚动视图 |

## 3. RectTransform 锚点

锚点是 UGUI 布局的核心概念：

- **锚点 (Anchors)**: 确定 UI 元素相对于父节点的位置参考
- **枢轴 (Pivot)**: 旋转/缩放的中心点
- 锚点配合不同屏幕分辨率自适应

## 4. 示例：动态创建按钮

```csharp
GameObject btnObj = new GameObject("DynamicBtn", typeof(RectTransform));
btnObj.transform.SetParent(canvas.transform);

Button btn = btnObj.AddComponent<Button>();
btn.onClick.AddListener(() => Debug.Log("Clicked!"));
```

## 5. 性能优化

- 使用图集 (Sprite Atlas) 减少 Draw Call
- 禁用不需要的 Raycast Target
- 合理使用对象池管理频繁创建销毁的 UI