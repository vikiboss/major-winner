![Major Winner Stats](https://socialify.git.ci/vikiboss/major-winner/image?description=1&font=Inter&forks=1&issues=1&language=1&logo=https%3A%2F%2Fimage.viki.moe%2Fcs%2Fi%2Ficon.png&name=1&owner=1&pattern=Circuit+Board&pulls=1&stargazers=1&theme=Auto)

# 🏆 Major Winner

Counter Strike 2 布达佩斯 Major 竞猜结果展示与排行榜。关于这个项目的最初想法可参考 [这篇博客文章](https://blog.viki.moe/major-winner)。

## 在线查看

https://major.viki.moe

## 数据来源

- **竞猜数据**: 主要整理自 B 站 [@原劫色](https://space.bilibili.com/472947493)、[@三米七七](https://space.bilibili.com/1428295) 等 UP 主汇总的公开数据
- **赛事结果**: 来源于 [HLTV](https://www.hltv.org/) 官方数据

感谢所有数据贡献者的辛勤付出!

## 功能截图

![竞猜详情](https://s2.loli.net/2025/12/11/c567EkBWbfYV9Xm.png)

## 交流群

QQ 群: [902511365](https://qm.qq.com/q/oiHxyHNfl6) (Major Winner)

<img src="https://image.viki.moe/cs/i/group-qrcode.png" alt="group-qrcode" style="width: 36%; border-radius: 3px;" />

## 技术栈

- **Next.js 16** - App Router + React Server Components
- **React 19** - 最新 React 版本
- **TypeScript** - 严格类型检查
- **Tailwind CSS v4** - 现代化 CSS 框架
- **pnpm** - 高效包管理器

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 代码格式化
pnpm format
```

## 项目特点

- 📊 **数据驱动** - 基于静态 JSON 数据的纯前端应用
- 🌓 **主题切换** - 支持明暗主题自动适配
- 📱 **响应式设计** - 移动优先的自适应布局
- 🎯 **类型安全** - 完整的 TypeScript 类型定义
- ⚡️ **性能优化** - Turbopack 构建、图片优化、React 19

## 项目结构

```
app/                       # Next.js App Router 页面
├── page.tsx              # 首页: 赛段结果总览
├── predictions/          # 竞猜预测相关页面
│   ├── page.tsx         # 竞猜总览
│   ├── [stage]/         # 具体赛段详情
│   ├── layout.tsx       # 竞猜页面布局
│   └── StageNav.tsx     # 赛段导航组件
├── predictors/           # 预测者排行榜
├── teams/                # 参赛队伍列表
├── layout.tsx           # 全局布局
├── globals.css          # 全局样式 + Tailwind 配置
├── robots.ts            # 搜索引擎爬虫配置
└── sitemap.ts           # 站点地图

components/               # 共享 UI 组件
├── Header.tsx           # 顶部导航栏
├── Footer.tsx           # 页脚
├── EventContext.tsx     # 赛事上下文
├── EventSelector.tsx    # 赛事选择器
├── TeamLogo.tsx         # 战队 Logo 组件
├── ThemeProvider.tsx    # 主题上下文提供者
└── ThemeToggle.tsx      # 主题切换按钮

data/                     # 静态数据文件
├── events.json          # 赛事数据(队伍、赛程、结果)
└── predictions.json     # 预测数据(各预测者的竞猜)

lib/                      # 工具函数库
└── data.ts              # 核心业务逻辑(计算、排名、统计)

types/                    # TypeScript 类型定义
└── index.ts             # 全局类型定义
```

## 数据更新流程

更新赛事结果只需编辑 `data/events.json`，应用会自动重新计算:

1. 各预测者的预测准确度
2. 赛段通过/失败状态
3. 排行榜排名变化
4. 赛事进度状态

无需修改代码，数据驱动一切!

## License

MIT © [Viki](https://github.com/vikiboss)
