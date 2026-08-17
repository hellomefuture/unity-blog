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

    // 右侧大纲（页面内标题导航）
    outline: [2, 3],

    // 顶部导航栏
    nav: [
      { text: '首页', link: '/' },
      {
        text: 'C#编程',
        items: [
          { text: '📘 C# 知识完全指南', link: '/CSharp/complete' },
          { text: '📝 变量、常量与类型转换', link: '/CSharp/variables' },
          { text: '🔍 反射', link: '/CSharp/reflect' },
          { text: '🔗 委托与 UnityEvent', link: '/CSharp/delegate' }
        ]
      },
      {
        text: 'Unity开发',
        items: [
          { text: '🔄 Mono 生命周期', link: '/UnityBase/lifeCycle' },
          { text: '🖥️ UGUI', link: '/UnityBase/ugui' }
        ]
      },
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