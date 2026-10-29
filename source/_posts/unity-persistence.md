---
title: '数据持久化：PlayerPrefs / JSON / 二进制'
date: 2026-10-28 16:05:32
categories:
  - Unity开发
tags:
  - Unity
  - 持久化
  - 存档
  - JSON
cover: /img/covers/c4.svg
top_img: /img/covers/c4.svg
description: '游戏里要存的东西大概分三类：设置项（音量、画质）、进度数据（关卡、金币、解锁状态）、结构化大数据（存档、配置缓存）。'
---
## 文档简介

游戏里要存的东西大概分三类：**设置项**（音量、画质）、**进度数据**（关卡、金币、解锁状态）、**结构化大数据**（存档、配置缓存）。

这三类对存储的要求完全不同，用错了就会出现"存档丢失""改版本读不出来""数据能被随便改"这些问题。

本文把 Unity 里最常用的三种方式讲清楚，并给出选型标准。

---

## 1 三种方式横向对比

| 维度 | PlayerPrefs | JSON | 二进制 |
| --- | --- | --- | --- |
| 存储形式 | 键值对（string / int / float） | 文本 | 字节流 |
| 可读性 | 一般（注册表 / plist） | 高（可直接打开看） | 无（需要工具解析） |
| 数据结构 | 只支持单值 | 支持嵌套对象、数组 | 支持任意结构 |
| 体积 | 小 | 大（有字段名冗余） | 最小 |
| 读写速度 | 快 | 中等 | 快 |
| 安全性 | 低（明文） | 低（明文） | 中（可加密） |
| 跨平台 | 是 | 是 | 是（注意字节序） |
| 适合 | 设置项、简单标记 | 存档、配置 | 大存档、需要压缩加密 |

**一句话选型**：

- 音量、画质、是否看过新手引导 → **PlayerPrefs**
- 玩家存档、关卡进度 → **JSON**
- 存档很大、需要防篡改、需要压缩 → **二进制**

---

## 2 PlayerPrefs

### 2.1 基本 API

```csharp
// 写入
PlayerPrefs.SetInt("Volume", 80);
PlayerPrefs.SetFloat("Sensitivity", 1.5f);
PlayerPrefs.SetString("LastChapter", "Chapter_03");

// 读取（第二个参数是默认值，键不存在时返回它）
int volume = PlayerPrefs.GetInt("Volume", 100);
float sens = PlayerPrefs.GetFloat("Sensitivity", 1f);
string chapter = PlayerPrefs.GetString("LastChapter", "Chapter_01");

// 判断是否存在
if (PlayerPrefs.HasKey("Volume")) { /* ... */ }

// 删除单个 / 全部
PlayerPrefs.DeleteKey("Volume");
PlayerPrefs.DeleteAll();

// 写盘（重要）
PlayerPrefs.Save();
```

### 2.2 数据存在哪

| 平台 | 实际位置 |
| --- | --- |
| Windows | 注册表 `HKCU\Software\<公司名>\<产品名>` |
| Android | `/data/data/<包名>/shared_prefs/<包名>.xml` |
| iOS | `Library/Preferences/<包名>.plist` |
| WebGL | IndexedDB |

所以它本质是**平台的偏好设置系统**，不是文件。

### 2.3 三个必须知道的坑

**坑 1：不会自动立即写盘**

`SetInt` 只写内存，`PlayerPrefs.Save()` 才落盘。Unity 在 `OnApplicationQuit` 会调用一次，但**移动端被强杀时不会触发**，所以关键数据要主动 Save。

```csharp
void OnApplicationPause(bool paused)
{
    if (paused) PlayerPrefs.Save();   // 移动端切后台时保存
}
```

**坑 2：键名拼错不会报错**

`GetInt("Volumn")` 拼错了，只会静默返回默认值。所有键名必须集中成常量：

```csharp
public static class PrefKeys
{
    public const string Volume = "settings.volume";
    public const string Quality = "settings.quality";
}
```

**坑 3：明文可改**

注册表 / plist / xml 都能直接编辑，玩家可以随便改金币数。**不要用它存重要数值**。

### 2.4 适合存什么

| 适合 | 不适合 |
| --- | --- |
| 音量、画质、语言 | 玩家存档（金币、装备） |
| 是否看过引导 | 大段文本 |
| 上次登录的账号 ID | 需要防篡改的数据 |
| 简单的一次性标记 | 复杂嵌套结构 |

---

## 3 JSON

### 3.1 Unity 自带的 JsonUtility

```csharp
[Serializable]
public class SaveData
{
    public int level;
    public int gold;
    public List<string> unlockedItems;
    public Vector3 position;       // Unity 类型可直接序列化
}

// 序列化
SaveData data = new SaveData { level = 3, gold = 1200 };
string json = JsonUtility.ToJson(data, prettyPrint: true);

// 写入文件
string path = Path.Combine(Application.persistentDataPath, "save.json");
File.WriteAllText(path, json);

// 读取
string text = File.ReadAllText(path);
SaveData loaded = JsonUtility.FromJson<SaveData>(text);
```

### 3.2 JsonUtility 的四个限制

| 限制 | 说明 | 绕法 |
| --- | --- | --- |
| **不支持 Dictionary** | 序列化出来是空对象 | 转成 `List<KeyValuePair>` 或用 Newtonsoft |
| **不支持顶层数组** | `FromJson<List<T>>` 会失败 | 包一层 `{ "items": [...] }` |
| **只序列化 public / [SerializeField] 字段** | private 字段不会被存 | 加 `[SerializeField]` |
| **不支持 null 与多态** | 引用类型 null 变默认值 | 用 Newtonsoft / 自己加类型标记 |

### 3.3 什么时候该换 Newtonsoft.Json

需要 Dictionary、需要多态、需要部分字段可选序列化时，用 `Newtonsoft.Json`（Unity 可通过 UPM 安装 `com.unity.nuget.newtonsoft-json`）：

```csharp
string json = JsonConvert.SerializeObject(data, Formatting.Indented);
SaveData loaded = JsonConvert.DeserializeObject<SaveData>(json);
```

### 3.4 版本兼容：字段增删怎么办

这是存档系统最常见的线上事故：**老版本存档读进新版本，字段对不上**。

```csharp
[Serializable]
public class SaveData
{
    public int version = 2;          // ← 存档版本号，必须有
    public int level;
    public int gold;
    public int gems;                 // v2 新增字段
}
```

读取时按版本迁移：

```csharp
SaveData Load(string json)
{
    var data = JsonUtility.FromJson<SaveData>(json);
    if (data.version < 2)
    {
        data.gems = 0;               // 老存档补默认值
        data.version = 2;
    }
    return data;
}
```

**规则**：
- 加字段 → 给默认值即可，JSON 缺失字段会保持默认
- 删字段 → 保留空字段一段时间再删，否则老版本读新存档会丢数据
- 改字段名 → 用 `[FormerlySerializedAs]` 或手动迁移

### 3.5 写入安全

直接 `File.WriteAllText` 有风险：写到一半断电，存档损坏。

```csharp
// 先写临时文件，再替换
string tmp = path + ".tmp";
File.WriteAllText(tmp, json);
if (File.Exists(path)) File.Delete(path);
File.Move(tmp, path);
```

---

## 4 二进制

### 4.1 不要用 BinaryFormatter

`BinaryFormatter` 在新版 .NET 已被标记为**不安全且过时**（反序列化可执行任意代码），Unity 也不推荐。用它存档 = 给自己埋雷。

### 4.2 手写 BinaryWriter / BinaryReader

```csharp
public static void Save(SaveData data, string path)
{
    using var fs = new FileStream(path, FileMode.Create);
    using var w = new BinaryWriter(fs);

    w.Write(data.version);
    w.Write(data.level);
    w.Write(data.gold);
    w.Write(data.unlockedItems.Count);
    foreach (var item in data.unlockedItems)
        w.Write(item);
}

public static SaveData Load(string path)
{
    using var fs = new FileStream(path, FileMode.Open);
    using var r = new BinaryReader(fs);

    var data = new SaveData();
    data.version = r.ReadInt32();
    data.level = r.ReadInt32();
    data.gold = r.ReadInt32();

    int count = r.ReadInt32();
    data.unlockedItems = new List<string>(count);
    for (int i = 0; i < count; i++)
        data.unlockedItems.Add(r.ReadString());

    return data;
}
```

**注意**：读写顺序必须**严格一致**，加字段只能在末尾追加并配合版本号，否则老存档会读错位。

### 4.3 简单加密

二进制存档可以按字节异或，成本低但有基本防护：

```csharp
static readonly byte Key = 0x5A;

static void Encrypt(byte[] bytes)
{
    for (int i = 0; i < bytes.Length; i++)
        bytes[i] ^= Key;
}
```

真要防作弊，客户端加密都不够，关键数值必须由服务器校验。

### 4.4 二进制适合存什么

| 场景 | 原因 |
| --- | --- |
| 大存档（几 MB） | JSON 字段名冗余，二进制体积能小一半以上 |
| 需要压缩 | 可直接接 GZip / LZ4 |
| 需要加密 | 字节流处理方便 |
| 高频写入 | 解析开销小 |

---

## 5 实际项目的组合用法

大多数项目不是二选一，而是**组合**：

```
PlayerPrefs  →  设置项（音量、画质、语言）
     │
JSON         →  存档主体（可读、易调试、便于版本迁移）
     │
二进制       →  大块数据（地图缓存、录像、缩略图）
```

《地穴行者》目前是「配置用 ScriptableObject，进度暂存内存」，下一步要加存档时按这个分层走：

1. 设置项 → PlayerPrefs
2. 存档 → JSON + 版本号 + 临时文件写入
3. 大量关卡缓存 → 二进制

---

## 6 常见坑汇总

| 坑 | 表现 | 解决 |
| --- | --- | --- |
| PlayerPrefs 忘了 Save | 移动端被杀后设置丢失 | 切后台时主动 Save |
| 键名拼错 | 读取永远是默认值 | 键名常量化 |
| JsonUtility 存 Dictionary | 读出来是空对象 | 换 Newtonsoft 或转 List |
| 顶层数组反序列化 | 报错或返回 null | 包一层对象 |
| 老存档缺新字段 | 数值变 0 / UI 异常 | 版本号 + 默认值迁移 |
| 直接覆盖写文件 | 断电后存档损坏 | 临时文件 + 替换 |
| 用二进制但没版本号 | 加字段后读错位 | 首字节写版本号 |
| 用 PlayerPrefs 存金币 | 玩家改注册表刷金币 | 服务端校验 |

---

## 7 小结

| 要点 | 结论 |
| --- | --- |
| 选型 | 设置用 PlayerPrefs，存档用 JSON，大数据用二进制 |
| PlayerPrefs | 本质是平台偏好设置，必须主动 Save，键名常量化 |
| JSON | JsonUtility 够用但有四个限制，复杂场景换 Newtonsoft |
| 版本管理 | 存档第一字段永远写版本号，读时做迁移 |
| 写入 | 临时文件 + 替换，避免半截文件 |
| 安全 | 客户端存储都可改，关键数据交服务端校验 |

持久化的难点从来不是"怎么存"，而是**版本演进和异常断电**。存之前先想清楚：三年后加了字段，老存档还能不能读？
