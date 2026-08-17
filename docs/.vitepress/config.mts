import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/unity-blog/', // ⚠️前后斜杠必须保留，适配github pages子目录

  title: "Unity学习笔记",
  description: "个人Unity技术知识库",

  themeConfig: {
    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: 'C#编程', link: '/csharp/basic' },
      { text: 'Unity开发', link: '/unity/overview' },
    ],

    // 侧边栏配置（重点修复导航失效问题）
    sidebar: [
      {
        text: 'C#编程',
        base: '/csharp/', // 当前分组的基础路径，子项link不要写/开头
        items: [
          { text: '基础语法', link: 'basic' },
          { text: '面向对象', link: 'oops' },
          { text: '泛型与委托', link: 'delegate' }
        ]
      },
      {
        text: 'Unity开发',
        base: '/unity/',
        items: [
          { text: '总览', link: 'overview' },
          { text: 'UGUI', link: 'ugui' },
          { text: '资源管理', link: 'asset' }
        ]
      }
    ],

    outline: { level: [2,3] },
    socialLinks: []
  }
})