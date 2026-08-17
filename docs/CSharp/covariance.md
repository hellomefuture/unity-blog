# 协变与逆变

## 一、前置基础

1. **里氏替换**：父类引用 = 子类对象
2. 普通泛型**严格类型匹配**，不支持父子类隐式转换
3. 协变 / 逆变只作用于：**泛型委托、泛型接口**
4. 核心关键字：
   - `out` → 协变
   - `in` → 逆变

## 二、核心定义（必背）

| 类型 | 关键字 | 作用位置 | 转换规则 |
|------|--------|----------|----------|
| 协变 | `out` | 返回值 | 子类泛型 → 父类泛型 |
| 逆变 | `in` | 方法参数 | 父类泛型 → 子类泛型 |

## 三、系统原生支持

| 类型 | 说明 |
|------|------|
| `Func<out T>` | 天生**协变**（返回值位置） |
| `Action<in T>` | 天生**逆变**（参数位置） |

## 四、协变 out 详解

### 自定义协变委托

```csharp
// out T：协变，T 只能做返回值
public delegate T GetObj<out T>();
```

### 标准演示

```csharp
public class Animal { }
public class Dog : Animal { }

// 子类委托
GetObj<Dog> getDog = () => new Dog();
// 协变：子类泛型 → 父类泛型
GetObj<Animal> getAnimal = getDog;
```

## 五、逆变 in 详解

### 自定义逆变委托

```csharp
// in T：逆变，T 只能做参数
public delegate void ShowMsg<in T>(T t);
```

### 标准演示

```csharp
ShowMsg<Animal> showAnimal = a => Console.WriteLine("动物逻辑");
// 逆变：父类泛型 → 子类泛型
ShowMsg<Dog> showDog = showAnimal;
showDog(new Dog());
```

## 六、完整可运行代码

```csharp
using System;

public class Animal { }
public class Dog : Animal { }

// 协变委托
public delegate T GetObj<out T>();
// 逆变委托
public delegate void ShowMsg<in T>(T t);

internal class Program
{
    static void Main(string[] args)
    {
        // === 协变演示 ===
        GetObj<Dog> funcDog = () => new Dog();
        GetObj<Animal> funcAn = funcDog;

        // === 逆变演示 ===
        ShowMsg<Animal> actAn = a => Console.WriteLine("父类方法执行");
        ShowMsg<Dog> actDog = actAn;
        actDog(new Dog());

        // === 系统自带 Func 协变 ===
        Func<Dog> f1 = () => new Dog();
        Func<Animal> f2 = f1;

        // === 系统自带 Action 逆变 ===
        Action<Animal> a1 = a => { };
        Action<Dog> a2 = a1;
    }
}
```

## 七、总结

1. `out` 协变：返回值用，子 → 父
2. `in` 逆变：参数用，父 → 子
3. Func 自带 out 协变，Action 自带 in 逆变
4. 解决泛型父子类不能隐式转换的问题
5. 仅用于委托、接口，**泛型类不支持**