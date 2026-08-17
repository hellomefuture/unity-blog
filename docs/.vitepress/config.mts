import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Unity学习笔记",
  description: "个人Unity客户端学习博客 | C# | YooAsset | HybridCLR | PureMVC",

  // 强制暗色模式
  appearance: true,

  // 本地搜索
  search: {
    provider: 'local'
  },

  themeConfig: {
    // 社交链接（显示在导航栏右侧）
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hellomefuture/unity-blog' }
    ],

    // 顶部导航
    nav: [
      { text: "首页", link: "/" },
      { text: "C#基础", link: "/CSharp/variables" },
      { text: "Unity基础", link: "/UnityBase/lifeCycle" },
      { text: "框架架构", link: "/Framework/puremvc" }
    ],

    // 左侧侧边栏目录
    sidebar: {
      '/CSharp/': [
        {
          text: "C# 基础语法",
          collapsed: false,
          items: [
            { text: "变量、常量与类型转换", link: "/CSharp/variables" },
            { text: "参数默认值与变长参数", link: "/CSharp/parameters" }
          ]
        },
        {
          text: "面向对象核心",
          collapsed: false,
          items: [
            { text: "里氏替换原则", link: "/CSharp/liskov" },
            { text: "反射", link: "/CSharp/reflect" }
          ]
        },
        {
          text: "泛型与集合",
          collapsed: false,
          items: [
            { text: "非泛型集合", link: "/CSharp/collections" },
            { text: "泛型", link: "/CSharp/generics" },
            { text: "泛型约束", link: "/CSharp/generic-constraints" },
            { text: "顺序/链式存储与Dictionary", link: "/CSharp/data-structures" },
            { text: "泛型栈和队列", link: "/CSharp/stack-queue" }
          ]
        },
        {
          text: "委托 · 事件 · Lambda",
          collapsed: false,
          items: [
            { text: "委托与UnityEvent", link: "/CSharp/delegate" },
            { text: "委托详解", link: "/CSharp/delegate-detail" },
            { text: "事件", link: "/CSharp/events" },
            { text: "空安全调用", link: "/CSharp/null-safety" },
            { text: "匿名函数与Lambda", link: "/CSharp/lambda" },
            { text: "协变与逆变", link: "/CSharp/covariance" }
          ]
        }
      ],
      '/UnityBase/': [
        {
          text: "Unity基础",
          items: [
            { text: "Mono生命周期", link: "/UnityBase/lifeCycle" },
            { text: "UGUI", link: "/UnityBase/ugui" }
          ]
        }
      ],
      '/Framework/': [
        {
          text: "游戏框架",
          items: [
            { text: "PureMVC", link: "/Framework/puremvc" }
          ]
        }
      ]
    }
  },

  // 代码行号
  markdown: {
    lineNumbers: true
  }
})