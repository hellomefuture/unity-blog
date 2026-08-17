# PureMVC 框架

## 1. 什么是 PureMVC

> 一款轻量级 MVC 框架，常用于 Unity 项目架构

## 2. 核心角色

| 角色 | 说明 |
|------|------|
| **Facade** | 外观模式，统一入口 |
| **Proxy** | 数据代理，管理数据层 |
| **Mediator** | 视图中介，管理 UI 交互 |
| **Command** | 命令，业务逻辑处理 |
| **Notification** | 通知，各层之间通信 |

## 3. 工作流程

```
用户操作 UI → Mediator 发送 Notification
→ Command 执行逻辑 → 更新 Proxy
→ Proxy 发送 Notification → Mediator 更新 UI
```

## 4. 示例：登录流程

```csharp
// Facade 注册 Command
Facade.RegisterCommand("Login", typeof(LoginCommand));

// Mediator 发送通知
SendNotification("Login", loginData);

// Command 处理登录
public class LoginCommand : SimpleCommand {
    public override void Execute(INotification notification) {
        // 登录逻辑
        Facade.SendNotification("LoginSuccess", userData);
    }
}

// Mediator 监听并更新 UI
// 在 ListNotificationInterests 中返回 "LoginSuccess"
```

## 5. 优缺点

**优点：**
- 结构清晰，各层职责分离
- 解耦，Mediator 不需要知道具体的 Model
- 适合中大型项目

**缺点：**
- 文件数量多
- 通知满天飞，调试困难
- 学习曲线较陡