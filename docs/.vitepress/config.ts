import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/unity-blog/',

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
          { text: '🖥️ UGUI',         link: '/UnityBase/ugui' }
        ]
      },
      {
        text: '更多',
        items: [
          { text: '🏗️ 框架架构',      link: '/Framework/puremvc' },
          { text: '📦 GitHub仓库',    link: 'https://github.com/hellomefuture/unity-blog' },
          { text: '📖 关于本站',      link: '/about' }
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
          text: 'Unity 开发',
          base: '/UnityBase/',
          items: [
            { text: '🔄 Mono生命周期', link: 'lifeCycle' },
            { text: '🖥️ UGUI',         link: 'ugui' }
          ]
        }
      ],
      '/Framework/': [
        {
          text: '框架架构',
          base: '/Framework/',
          items: [
            { text: '🏗️ PureMVC', link: 'puremvc' }
          ]
        }
      ]
    }
  }
})