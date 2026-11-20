import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "资源雷达",
  description: "全网福利、黑五好价、拼车交易、开源项目与新闻资讯的多兴趣自托管聚合雷达站",
  base: "/freebie-radar/",
  head: [["link", { rel: "icon", href: "/freebie-radar/logo.svg" }]],
  lastUpdated: true,
  markdown: {
    languages: ["dotenv", "nginx"],
    languageAlias: { env: "dotenv", caddyfile: "nginx" },
  },
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "指南", link: "/deploy" },
      { text: "数据源", link: "/data-sources" },
      { text: "在线演示", link: "https://radar.zichuanlan.top" },
      { text: "GitHub", link: "https://github.com/ZiChuanLan/freebie-radar" },
    ],
    sidebar: [
      {
        text: "上手",
        items: [
          { text: "部署与运维", link: "/deploy" },
          { text: "公网部署与安全边界", link: "/security" },
          { text: "公开站：登录与个人隔离", link: "/accounts" },
        ],
      },
      {
        text: "分类与治理",
        items: [
          { text: "分类设置与人工纠正", link: "/classification" },
          { text: "获取方式 obtain", link: "/obtain" },
          { text: "AI 语义审核", link: "/ai" },
          { text: "分类抽样核对", link: "/classification-review" },
        ],
      },
      {
        text: "采集与推送",
        items: [
          { text: "数据源侦察报告", link: "/data-sources" },
          { text: "时效性改造", link: "/timing" },
          { text: "推送系统", link: "/push" },
        ],
      },
      {
        text: "界面",
        items: [
          { text: "UI 与功能改造", link: "/ui-v2" },
          { text: "操作流程与联动检查", link: "/ui-review" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/ZiChuanLan/freebie-radar" }],
    outline: { label: "本页目录", level: [2, 3] },
    docFooter: { prev: "上一篇", next: "下一篇" },
    lastUpdated: { text: "最后更新" },
    search: { provider: "local" },
    editLink: {
      pattern: "https://github.com/ZiChuanLan/freebie-radar/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页",
    },
    footer: {
      message: "MIT License · 数据与内容版权归各自来源所有",
      copyright: "自托管聚合雷达站",
    },
  },
});
