# PureMVC框架详解
## 文档简介
PureMVC 是一款**跨平台、轻量级 MVC 标准化程序框架**，最早为 Flex/ActionScript 设计，现已支持 C#、JS、Python 等多语言，广泛用于 Unity 手游、客户端管理系统。 核心设计：通过 `Proxy/Mediator/Command/Facade` 分层 + 观察者消息总线实现模块高度解耦，适合中大型长线游戏 / 富客户端项目。

---

## 1 PureMVC 基础架构认知
### 1.1 经典 MVC 三层核心定义
MVC 是分层架构思想，将程序拆分为职责完全隔离的三部分，解决 UI、数据、逻辑代码耦合混乱问题：

| 分层 | 核心职责 |
| --- | --- |
| Model（模型） | 全局数据、网络缓存、本地持久化、配置表管理 |
| View（视图） | UI 界面渲染、用户交互、视觉展示 |
| Controller（控制器） | 业务流程调度、模块协同、指令执行 |


#### 传统代码 vs MVC 分层对比
| 对比维度 | 原生杂糅写法 | MVC 分层架构 |
| --- | --- | --- |
| 代码耦合 | UI、数据、业务写在同一脚本，牵一发动全身 | 三层完全隔离，互不直接引用 |
| 维护难度 | 功能迭代极易产生 BUG，排查困难 | 各司其职，修改单一模块不影响其他 |
| 团队协作 | 多人开发频繁冲突 | 程序可分工写界面 / 数据 / 逻辑 |
| 代码复用 | 数据、UI 逻辑无法抽离复用 | Model/View/Controller 模块可独立复用 |


### 1.2 PureMVC 四大设计核心思想
1. **单一职责、关注点分离** 每个组件只做一件事，数据、界面、业务逻辑完全拆分，杜绝巨型脚本。
2. **基于通知的松耦合通信** 模块之间不持有对方实例，依靠全局消息通知交互，降低类依赖。
3. **全平台可移植** 框架内核逻辑统一，仅需适配对应语言 API，Unity / 前端 / 桌面端通用。
4. **高扩展能力** 原生内置宏命令、多实例 Multiton 机制，适配复杂多流程业务。

### 1.3 适用项目场景
+ 手游客户端：MMORPG、塔防、卡牌等界面 / 数据复杂长线游戏（如寰宇九州冰雨火项目）
+ PC 富客户端、后台管理系统
+ 需要热更新、模块化拆分的大型客户端程序

### 1.4 本章小结
MVC 是底层分层思想，PureMVC 是这套思想**完整可落地的工业级框架**，内置统一通信、生命周期、数据管理能力，下文拆解四大核心组件。

---

## 2 PureMVC 四大核心组件
框架整体由 `Model、View、Controller、Facade` 四大内核组成，配套 `Proxy、Mediator、Command` 业务组件，同时支持 Multiton 多实例隔离。

### 2.1 Model：全局数据管理层
Model 采用**多例（Multiton）单例**管理，全局唯一数据入口，所有数据统一由 Proxy 封装托管。

#### 2.1.1 Model 实例获取
通过唯一 Key 创建独立 Model 实例，支持多模块数据隔离：

```plain
// 根据标识获取独立Model实例
var model:Model = Model.getInstance("GameClient");
```

| 特性 | 说明 |
| --- | --- |
| 实例模式 | Multiton 多单例，不同 Key 生成独立数据域 |
| 生命周期 | 程序初始化创建，程序销毁释放 |
| 线程安全 | 内核加锁，支持多线程读写数据 |


#### 2.1.2 Proxy 注册与完整生命周期
Proxy 是 Model 层唯一数据载体，每一类数据对应一个 Proxy，统一注册到 Model 管理：

```plain
// 1. 创建数据代理，NAME为唯一标识，第二个参数为初始数据
var userProxy:Proxy = new UserProxy("UserProxy", userVoData);
// 2. 注册进全局Model
model.registerProxy(userProxy);
```

Proxy 生命周期流程：

#### 2.1.3 Proxy 数据封装规范
禁止外部直接操作原始数据，所有增删改查统一封装方法，数据变更自动推送全局通知：

```plain
// 根据ID查询用户数据
public function getUserById(id:String):UserVO {
    return userDict[id];
}
// 新增用户，修改完成发送通知同步全模块
public function addUser(user:UserVO):void {
    userDict[user.id] = user;
    sendNotification("USER_DATA_UPDATE", user);
}
```

| 方法 | 参数 | 功能 |
| --- | --- | --- |
| getUserById | 用户 ID | 读取指定用户缓存数据 |
| addUser | 用户数据实体 | 新增用户，广播数据更新通知 |


### 2.2 View：视图 UI 管理层
View 负责管理所有 UI 界面，核心载体为 `Mediator`，一个 UI 面板绑定一个中介者，隔离 UI 与业务代码。

#### 2.2.1 Mediator 注册通信流程
```plain
// 传入UI面板实例，创建中介者
var bagMediator:BagMediator = new BagMediator(BagUIPanel);
// 通过全局Facade注册中介
facade.registerMediator(bagMediator);
```

#### 2.2.2 Mediator 生命周期回调
提供两个核心生命周期函数，用于初始化、销毁清理，防止内存泄漏：

```plain
// Mediator注册完成时执行，初始化UI事件
override public function onRegister():void {
    viewComponent.btnClose.addEventListener(clickEvt, onCloseClick);
}
// Mediator销毁移除时执行，解绑所有监听
override public function onRemove():void {
    viewComponent.btnClose.removeEventListener(clickEvt, onCloseClick);
}
```

| 生命周期函数 | 执行时机 | 常规用途 |
| --- | --- | --- |
| onRegister | Mediator 注册后 | 绑定 UI 按钮、初始化界面数据 |
| onRemove | Mediator 销毁前 | 移除事件监听、释放 UI 资源 |


#### 2.2.3 UI 事件与通知转发逻辑
UI 按钮点击等交互，不直接调用逻辑，统一发送全局通知，由 Command 处理业务：

```plain
// UI点击回调，发送登录请求通知
private function onLoginBtnClick(event:Event):void {
    var loginData = viewComponent.GetInputAccount();
    sendNotification("LOGIN_REQUEST", loginData);
}
// 监听数据更新通知，刷新背包界面
override public function listNotificationInterests():Vector.<String> {
    return ["BAG_DATA_REFRESH"];
}
override public function handleNotification(notification:INotification):void {
    if(notification.name == "BAG_DATA_REFRESH"){
        viewComponent.RefreshBagUI(notification.body);
    }
}
```

### 2.3 Controller：业务指令调度中心
Controller 接收全局通知，匹配注册的 Command 执行业务逻辑，分为单命令 `SimpleCommand`、组合宏命令 `MacroCommand`。

#### 2.3.1 Command 注册与执行机制
```plain
// 将通知名与命令类绑定
facade.registerCommand("LOGIN_REQUEST", LoginCommand);
```

#### 2.3.2 两种 Command 区分
| 类型 | 特性 | 使用场景 |
| --- | --- | --- |
| SimpleCommand | 单次独立逻辑，执行完销毁 | 登录、背包刷新、单步网络请求 |
| MacroCommand | 可顺序组合多个子命令 | 游戏初始化、注册多步骤流程 |


##### SimpleCommand 基础示例
```plain
public class LoginCommand extends SimpleCommand {
    override public function execute(notification:INotification):void {
        // 获取数据代理
        var userProxy:UserProxy = facade.retrieveProxy(UserProxy.NAME);
        // 调用网络登录逻辑
        userProxy.SendLoginRequest(notification.body);
    }
}
```

##### MacroCommand 多流程组合示例
```plain
public class GameInitMacroCommand extends MacroCommand {
    override protected function initializeMacroCommand():void {
        // 按顺序执行子命令
        addSubCommand(LoadConfigCommand);
        addSubCommand(LoadPlayerDataCommand);
        addSubCommand(InitMainUICommand);
    }
}
```

### 2.4 Multiton 多实例隔离模式
PureMVC 不局限于全局单框架，支持通过自定义 Key 创建多套独立 MVC 内核，模块之间数据、通知完全隔离。

#### 2.4.1 多实例创建示例
```plain
// 两套完全独立的Facade，互不干扰
var moduleAFacade:IFacade = Facade.getInstance("ModuleA");
var moduleBFacade:IFacade = Facade.getInstance("ModuleB");
```

#### 适用场景
1. 游戏分模块热更，每个模块独立一套 MVC；
2. 多账号、多角色缓存数据隔离；
3. 插件化客户端，插件拥有独立数据域。

---

## 3 Proxy 数据代理深度实战
Proxy 是 Model 层唯一数据源，封装网络请求、本地持久化、数据缓存、变更通知整套能力，是和服务端交互核心载体。

### 3.1 Proxy 标准封装模板
```plain
// 用户数据代理，实现标准化数据接口
public class UserProxy extends Proxy implements IUserProxy {
    // 全局唯一标识
    public static const NAME:String = "UserProxy";
    // 本地缓存用户数据
    private var userCache:UserVO;

    public function UserProxy(data:Object = null) {
        super(NAME, data);
        InitLocalData();
    }
    // 初始化本地存档数据
    private function InitLocalData():void {
        var saveData = SharedObject.getLocal("userSave");
        if(saveData.data.userInfo){
            userCache = JSON.parse(saveData.data.userInfo);
        }else{
            userCache = new UserVO();
        }
    }
    // 对外暴露读取接口
    public function GetUserInfo():UserVO {
        return userCache;
    }
    // 异步请求服务端用户数据
    public function RequestUserInfo(userId:String):void {
        var loader:URLLoader = new URLLoader();
        loader.addEventListener(Event.COMPLETE, OnUserDataLoad);
        loader.load(new URLRequest("api/user/get?id="+userId));
    }
    // 网络回调，更新缓存并广播通知
    private function OnUserDataLoad(event:Event):void {
        var resData = JSON.parse(URLLoader(event.target).data);
        userCache = new UserVO(resData);
        // 全局广播用户数据刷新
        sendNotification("USER_INFO_REFRESH", userCache);
    }
}
```

### 3.2 Proxy 标准调用方式
统一通过全局 Facade 获取 Proxy，禁止直接 new 实例：

```plain
// 任意Command/Mediator中获取数据代理
var userProxy:UserProxy = facade.retrieveProxy(UserProxy.NAME) as UserProxy;
var userData = userProxy.GetUserInfo();
```

### 3.3 Proxy 三大业务场景落地
1. **玩家基础数据管理**：角色等级、背包、金币、属性缓存，数据变更自动刷新 UI；
2. **本地配置持久化**：音量、画质、操作设置本地存档；
3. **异步网络封装**：统一封装 HTTP/TCP 请求，回调通过通知分发结果，隔离网络与 UI。

---

## 4 Command 命令流程实战
Command 承担所有跨模块业务逻辑，所有网络交互、多步骤流程统一放在 Command，Mediator 只负责 UI 渲染。

### 4.1 单业务命令：登录流程
### 4.2 宏命令复杂流程：游戏初始化
```plain
public class GameStartMacroCommand extends MacroCommand {
    override protected function initializeMacroCommand():void {
        // 1. 加载本地配置表
        addSubCommand(LoadTableCommand);
        // 2. 请求玩家存档数据
        addSubCommand(RequestPlayerDataCommand);
        // 3. 初始化主UI中介
        addSubCommand(InitMainUIMediatorCommand);
    }
}
```

### 4.3 异常统一处理宏命令
全局报错、日志上传、弹窗提示封装为统一命令链，所有报错统一调用：

```plain
public class ErrorHandleMacroCommand extends MacroCommand {
    override protected function initializeMacroCommand():void {
        addSubCommand(LogErrorCommand); // 本地写入日志
        addSubCommand(UploadErrorLogCommand); // 上传服务端
        addSubCommand(ShowErrorTipCommand); // UI弹出错误提示
    }
}
```

---

## 5 Mediator 视图中介实战
Mediator 是 UI 和框架的桥梁，**所有 UGUI 界面必须配套 Mediator**，完全分离 UI 显示与业务逻辑。

### 5.1 Mediator 标准开发规范
1. 构造函数绑定对应 UI 面板实例；
2. `onRegister` 绑定按钮、滑动条等 UI 事件；
3. `listNotificationInterests` 声明需要监听的全局消息；
4. `handleNotification` 根据通知刷新界面；
5. `onRemove` 解绑所有监听，销毁 UI 资源，杜绝内存泄漏。

### 5.2 Mediator、Proxy、Command 完整通信时序
---

## 6 PureMVC 用到的全部设计模式总结
### 高层架构模式
1. **MVC 架构模式**：整体分层核心规范，Model 数据、View 界面、Controller 业务分离。

### GoF 经典设计模式（框架底层实现）
1. **外观模式 Facade**：Facade 作为全局唯一入口，屏蔽 Model/View/Controller 底层复杂逻辑，外部仅操作 Facade；
2. **多例模式 Multiton**：通过 Key 生成多套独立框架实例，替代传统单例；
3. **中介者模式 Mediator**：Mediator 隔离 UI 与全局逻辑，UI 不直接和数据、命令交互；
4. **代理模式 Proxy**：Proxy 封装所有数据访问，屏蔽网络、本地存储底层；
5. **命令模式 Command**：将业务逻辑封装为可执行指令，支持顺序组合、用完销毁；
6. **观察者模式 Observer**：全局 Notification 通知总线，模块订阅 / 广播消息，实现松耦合。

## 7 PureMVC 优缺点总结
### 优势
1. 强制分层，代码结构标准化，多人协作无混乱；
2. 模块无直接引用，依靠消息通信，耦合度极低；
3. 天然适配热更新，Command/Mediator 可独立热更；
4. 一套框架多语言通用，Unity / 前端可复用架构思路；
5. 生命周期完善，规范资源释放，减少内存泄漏。

### 劣势
1. 大量字符串通知名，无编译校验，写错运行时报错；
2. 小型 Demo / 小游戏存在过度设计，模板代码量大；
3. 消息链路长，调试断点追踪复杂；
4. Mediator 容易堆积大量 UI 刷新逻辑，若不拆分会臃肿。
