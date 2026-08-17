import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/unity-blog/',

  title: "Unity学习笔记",
  description: "个人Unity技术知识库",

  appearance: true,

  search: {
    provider: 'local'
  },

  themeConfig: {
    // 关闭侧边栏
    sidebar: false,

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      { text: 'C#编程', link: '/CSharp/variables' },
      { text: 'Unity开发', link: '/UnityBase/lifeCycle' },
      { text: '框架架构', link: '/Framework/puremvc' }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/hellomefuture/unity-blog' }
    ]
  },

  markdown: {
    lineNumbers: true
  }
})