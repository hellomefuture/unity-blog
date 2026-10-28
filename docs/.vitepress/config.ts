import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/unity-blog/',

  // ==================== 访问统计（Umami） ====================
  /*
   * 排除自己访问的办法：
   *   在自己浏览器控制台执行一次 localStorage.setItem('umami-no-track', '1')
   *   之后这台浏览器的访问不再计入统计；清缓存/换浏览器需要重新设置。
   *
   * data-domains 限定只统计正式域名，本地 dev / 预览访问不会上报。
   */
  head: [
    [
      'script',
      {},
      `if (!localStorage.getItem('umami-no-track')) {
  var s = document.createElement('script');
  s.defer = true;
  s.src = 'https://cloud.umami.is/script.js';
  s.setAttribute('data-website-id', '9199721c-031a-4078-a0e0-c07247096f67');
  s.setAttribute('data-domains', 'hellomefuture.github.io');
  document.head.appendChild(s);
}`
    ]
  ],

  lang: 'zh-CN',
  title: 'Unity 学习笔记',
  description: '个人 Unity + C# 游戏开发知识库 | 面向游戏客户端开发者',
  lastUpdated: true,

  appearance: 'dark',

  markdown: {
    lineNumbers: true,
    // @ts-ignore — VitePress 1.6.x 支持
    copyCode: {}
  },

  themeConfig: {
    // ==================== 社交链接 ====================
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hellomefuture/unity-blog' }
    ],

    // ==================== 搜索 ====================
    search: {
      provider: 'local',
      options: {
        translations: {
          button: { buttonText: '搜索文档', buttonAriaLabel: '搜索' },
          modal: { noResultsText: '未找到相关结果' }
        }
      }
    },

    // ==================== 右侧大纲 ====================
    outline: { level: [2, 3, 4], label: '页面导航' },

    // ==================== 底部翻页 ====================
    docFooter: {
      prev: '上一篇',
      next: '下一篇'
    },

    // ==================== 页脚 ====================
    footer: {
      message: '基于 VitePress 构建 | 面向游戏客户端开发者',
      copyright: 'Copyright © 2024 UnityDev'
    },

    // ==================== 顶部导航 ====================
    nav: [
      { text: '首页', link: '/' },
      {
        text: 'C#编程',
        items: [
          { text: '📘 知识完全指南', link: '/CSharp/complete' },
          { text: '📝 变量与常量',     link: '/CSharp/variables' },
          { text: '🔍 反射',            link: '/CSharp/reflect' },
          { text: '🔗 委托与UnityEvent', link: '/CSharp/delegate' }
        ]
      },
      {
        text: 'Unity开发',
        items: [
          { text: '🔄 Mono生命周期', link: '/UnityBase/lifeCycle' },
          { text: '🔄 内存泄露', link: '/UnityBase/内存泄露' },
          { text: '🖥️ UGUI',         link: '/UnityBase/ugui' },
          { text: '⚡ DrawCall与合批', link: '/UnityBase/drawcall' },
          { text: '📜 虚拟列表',       link: '/UnityBase/virtuallist' },
          { text: '💾 数据持久化',     link: '/UnityBase/persistence' },
          { text: '📦 AB包与AA包',     link: '/UnityBase/assetbundle' },
          { text: '⚙️ Mono与IL2CPP',   link: '/UnityBase/scripting-backend' },
          { text: '🧵 线程与Task',     link: '/UnityBase/threading' },
          { text: '⏳ async/await',    link: '/UnityBase/async-await' },
          { text: '🌐 TCP/UDP 网络',   link: '/UnityBase/network' },
          { text: '📊 SO 数据驱动',    link: '/UnityBase/scriptableobject' }
        ]
      },
      {
        text: '框架架构',
        items: [
          { text: '🏗️ PureMVC',          link: '/Framework/puremvc' },
          { text: '🧩 MVC / MVP / MVVM',  link: '/Framework/mvc-mvp-mvvm' },
          { text: '🎯 设计模式',          link: '/Framework/design-patterns' },
          { text: '🔁 通用状态机',        link: '/Framework/fsm' },
          { text: '🔥 HybridCLR 热更新', link: '/Framework/hybridclr' },
          { text: '📦 YooAsset 资源',    link: '/Framework/yooasset' }
        ]
      },
      {
        text: '更多',
        items: [
          { text: '👤 关于本人',      link: '/about' },
          { text: '📦 GitHub仓库',    link: 'https://github.com/hellomefuture/unity-blog' }
        ]
      }
    ],

    // ==================== 侧边栏（分组 base 模板） ====================
    /*
     * 📌 如何新增文档：
     *   1. 在 docs/ 下创建对应分类文件夹，放入 .md 文件
     *   2. 在下面 sidebar 对应分组的 items 数组里加上一条即可
     *   3. link 不要以 / 开头，base 会自动拼接
     *
     *   示例：新增一篇「LINQ」到 C# 目录
     *     - 创建 docs/CSharp/linq.md
     *     - 在 CSharp 分组的 items 中追加 { text: 'LINQ', link: 'linq' }
     */
    sidebar: {
      '/CSharp/': [
        {
          text: 'C# 编程',
          base: '/CSharp/',
          items: [
            { text: '📘 知识完全指南', link: 'complete' },
            { text: '📝 变量与常量',   link: 'variables' },
            { text: '🔍 反射',          link: 'reflect' },
            { text: '🔗 委托与UnityEvent', link: 'delegate' }
          ]
        }
      ],
      '/UnityBase/': [
        {
          text: 'Unity 基础',
          base: '/UnityBase/',
          items: [
            { text: '🔄 Mono生命周期', link: 'lifeCycle' },
            { text: '🖥️ UGUI',         link: 'ugui' },
            { text: '🔄 内存泄露', link: '内存泄露' }
          ]
        },
        {
          text: '性能优化',
          base: '/UnityBase/',
          items: [
            { text: '⚡ DrawCall与合批', link: 'drawcall' },
            { text: '📜 虚拟列表',       link: 'virtuallist' }
          ]
        },
        {
          text: '数据与资源',
          base: '/UnityBase/',
          items: [
            { text: '💾 数据持久化', link: 'persistence' },
            { text: '📦 AB包与AA包', link: 'assetbundle' },
            { text: '📊 ScriptableObject 数据驱动', link: 'scriptableobject' }
          ]
        },
        {
          text: '底层与并发',
          base: '/UnityBase/',
          items: [
            { text: '⚙️ Mono 与 IL2CPP', link: 'scripting-backend' },
            { text: '🧵 线程、线程池与 Task', link: 'threading' },
            { text: '⏳ 异步 async/await', link: 'async-await' },
            { text: '🌐 TCP / UDP 网络', link: 'network' }
          ]
        }
      ],
      '/Framework/': [
        {
          text: '架构模式',
          base: '/Framework/',
          items: [
            { text: '🏗️ PureMVC',          link: 'puremvc' },
            { text: '🧩 MVC / MVP / MVVM',  link: 'mvc-mvp-mvvm' },
            { text: '🎯 设计模式',          link: 'design-patterns' },
            { text: '🔁 通用状态机',        link: 'fsm' }
          ]
        },
        {
          text: '框架实践',
          base: '/Framework/',
          items: [
            { text: '🔥 HybridCLR 热更新', link: 'hybridclr' },
            { text: '📦 YooAsset 资源',    link: 'yooasset' }
          ]
        }
      ]
    }
  }
})