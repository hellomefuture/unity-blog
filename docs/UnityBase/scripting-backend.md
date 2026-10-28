# 脚本后端：Mono 与 IL2CPP

## 文档简介

Unity 把 C# 跑起来，靠的是**脚本后端（Scripting Backend）**。编辑器里永远是 Mono，但出包时有 Mono 和 IL2CPP 两条路。

这两个选择直接影响：**包体大小、运行性能、平台支持、能不能用反射、以及热更新方案怎么选**。

---

## 1 两种后端是什么

### 1.1 Mono

```
C# 源码 → 编译成 IL（中间语言）→ 运行时由 Mono 虚拟机 JIT 编译成本地代码
```

- 编辑器和 PC 平台常用
- **支持 JIT（即时编译）**，启动快
- 包体小（只带 IL 和运行时）
- 缺点：性能不如 AOT、代码可被反编译、iOS 不支持

### 1.2 IL2CPP

```
C# 源码 → IL → IL2CPP 转成 C++ → 各平台编译器编译成原生机器码
```

- **AOT（提前编译）**，运行的是原生代码
- 性能更好，反编译难度高
- 支持 64 位、支持 iOS / 主机平台
- 缺点：编译慢、包体大、**不支持 JIT**（影响热更新和反射）

---

## 2 对比表

| 维度 | Mono | IL2CPP |
| --- | --- | --- |
| 编译方式 | JIT | AOT（IL → C++ → 原生） |
| 运行性能 | 一般 | 更好（尤其数值计算） |
| 启动速度 | 快 | 稍慢（要加载更多代码） |
| 包体 | 小 | 大（含生成的 C++ 与原生库） |
| 反编译难度 | 低（IL 可直接反编译） | 高 |
| 平台支持 | PC / Android（部分） | 全平台，**iOS 必须** |
| 64 位支持 | 有限 | 完整 |
| 热更新 | 可用 DLL 替换 | **不支持 JIT，需要 HybridCLR 等方案** |
| 反射 | 完整支持 | 受裁剪影响，可能失败 |
| 泛型 | 完整 | **值类型泛型需提前实例化** |

**结论**：
- 编辑器调试 → Mono（不用等编译，改完即跑）
- 正式出包 → **IL2CPP**（性能 + 平台 + 安全）

---

## 3 IL2CPP 的三个关键影响

### 3.1 代码裁剪（Code Stripping）

IL2CPP 构建时会**删掉"看起来没用到"的代码**以减小包体。问题在于：它靠静态分析判断，而**反射调用的代码在静态分析里"没被引用"**。

```csharp
// 代码里写了，但没有直接调用 → 可能被裁掉
var type = Type.GetType("MyNamespace.MyClass");
var method = type.GetMethod("DoSomething");
method.Invoke(null, null);     // 运行时可能报 null
```

**解决**：用 `link.xml` 保留指定程序集/类型：

```xml
<linker>
  <assembly fullname="Assembly-CSharp" preserve="all"/>
  <assembly fullname="MyGame.Data">
    <type fullname="MyGame.Data.ConfigBase" preserve="all"/>
  </assembly>
</linker>
```

文件放在 `Assets/` 下即可生效。

### 3.2 值类型泛型必须提前实例化

IL2CPP 是 AOT，**运行时无法为新的值类型生成泛型代码**。

```csharp
// 如果代码里从未出现过 List<int>，运行时通过反射创建会失败
var listType = typeof(List<>).MakeGenericType(typeof(int));
var list = Activator.CreateInstance(listType);   // 可能报错
```

这在热更新场景里尤其常见：热更 DLL 里用了 `List<MyStruct>`，但 AOT 侧没编译过这个组合 → 运行时崩。

**解决**：
1. AOT 侧显式写一行"占位"代码，强制编译该泛型组合
2. 或使用 HybridCLR 的**补充元数据**机制（本站 HybridCLR 一文有详述）

```csharp
// 占位：强制 AOT 编译这些泛型组合
static void PreserveGenerics()
{
    _ = new List<MyStruct>();
    _ = new Dictionary<int, MyStruct>();
    _ = new MyGenericClass<MyStruct>();
}
```

### 3.3 不支持 JIT → 热更新要换方案

Mono 可以运行时加载 DLL 并 JIT 编译，IL2CPP 不行。所以 IL2CPP 上的 C# 热更新必须借助：

| 方案 | 原理 |
| --- | --- |
| HybridCLR | 扩展 IL2CPP 运行时，让热更 DLL 以解释/AOT 混合方式执行 |
| ILRuntime | 自己实现一个 IL 解释器 |
| Lua | 业务换语言，绕开 C# |

这也是《地穴行者》选 HybridCLR 的根本原因：**IL2CPP 是出包必须，而热更新又必须保留**。

---

## 4 构建配置怎么选

在 `Project Settings → Player → Other Settings`：

| 设置 | 建议 |
| --- | --- |
| Scripting Backend | 出包选 **IL2CPP** |
| Api Compatibility Level | `.NET Standard 2.1`（兼容性好）或 `.NET Framework`（API 更全） |
| Managed Stripping Level | 先 `Low`，稳定后再逐级提高 |
| Il2Cpp Code Generation | `Speed`（默认）或 `Size`（包体优先） |

### 4.1 Stripping Level 怎么调

| 级别 | 效果 | 风险 |
| --- | --- | --- |
| Disabled | 不裁剪 | 包体最大 |
| Low | 少量裁剪 | 风险低 |
| Medium | 中等 | 可能裁掉反射代码 |
| High | 激进 | 极易裁掉反射 / 序列化代码 |

**建议流程**：先 `Low` 出包验证功能 → 逐级提高 → 每次都在真机上完整回归。不要一上来就 High。

---

## 5 真机问题排查

| 现象 | 原因 | 排查 |
| --- | --- | --- |
| 编辑器正常，真机报 `NullReferenceException` | 反射代码被裁剪 | 查 `link.xml`，看类型是否保留 |
| 真机泛型方法崩溃 | 值类型泛型未实例化 | 加占位代码或补充元数据 |
| 真机启动黑屏很久 | IL2CPP 加载大量代码 | 减少启动程序集体积、异步加载 |
| 序列化丢字段 | 字段被裁剪 | `[Preserve]` 标记或 link.xml |
| 包体突然变大 | 某个库被完整保留 | 看构建报告的代码体积 |

### 5.1 怎么看裁剪掉了什么

构建后在 `Temp/StrippedAOTAssemblies` 或构建日志里能看到裁剪结果。也可以用 `il2cpp` 的 `--print-usage` 之类参数（不同版本不同）。

最简单的方法：**在真机上跑一遍所有反射路径**，报错就补 `link.xml`。

---

## 6 与热更新的配合

| 层 | 内容 | 后端 |
| --- | --- | --- |
| AOT 程序集 | 启动、桥接、配置 | IL2CPP 编译进包 |
| 热更程序集 | 全部业务逻辑 | 运行时加载 |

关键约束（详见 HybridCLR 一文）：

1. 热更 DLL 用到的 AOT 泛型，**必须提前补充元数据**
2. 资产上只能挂 AOT 类型，热更组件用代理模式
3. 构建顺序：先出 AOT 包，再生成热更 DLL

---

## 7 小结

| 要点 | 结论 |
| --- | --- |
| 编辑器 | Mono，改完即跑 |
| 出包 | IL2CPP，性能和平台都需要 |
| 裁剪 | 反射代码会被裁，用 `link.xml` 或 `[Preserve]` |
| 泛型 | 值类型泛型必须提前实例化 |
| 热更 | IL2CPP 无 JIT，需 HybridCLR / ILRuntime / Lua |
| 调试顺序 | 先 Low 裁剪出包验证，再逐步提高 |

Mono 和 IL2CPP 的区别，表面是"编译方式不同"，实际影响的是**反射能不能用、泛型怎么处理、热更怎么做**。出包前先想清楚这三点，能省掉大量真机排查时间。
