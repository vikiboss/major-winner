# AGENTS.md

项目约定与开发说明（给 AI 助手和人类协作者）。

## 项目

Major Winner：CS2 Major 竞猜结果与排行榜，纯静态站点，无后端。

技术栈：Next.js 16（App Router、RSC）+ React 19 + TypeScript strict + Tailwind CSS v4 + pnpm。

## 命令

```bash
pnpm dev         # 开发（Turbopack）
pnpm build       # 构建（静态导出到 out/）
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest（测试紧贴源码）
pnpm data:check  # 校验 data/*.json
pnpm studio      # 本地数据台，可视化改 data/
pnpm format      # Prettier
```

## 数据

```
data/
├── events.json                 # 赛事 + 各阶段实际结果（唯一结果来源）
├── predictions/<event-id>.json # 各赛事竞猜（只存 id，昵称以 predictors 为准）
├── predictors.json             # 竞猜者资料（昵称唯一来源）
└── teams.json                  # 战队资料
```

数据层在 `lib/data/`，页面只从 `@/lib/data` 引入：

| 模块 | 职责 |
| --- | --- |
| `store.ts` | 读取 JSON，建立 id 索引 |
| `scoring.ts` | 胜负判定、通过状态、竞猜者成绩 |
| `progress.ts` | 由结果推导阶段/赛事进度 |
| `predictions.ts` | 竞猜查询与视图模型（带缓存） |
| `sort.ts` | 排序比较函数 |
| `index.ts` | 统一出口 |

阶段文案、通过规则、战绩分组等常量集中在 `lib/constants.ts`。

核心类型：`TaskStageType`（可评分任务）、`MajorStageType`（大阶段）、`PredictorRow`（表格行）、`StageView`（页面阶段）。

**禁止**在组件里自算「猜对/猜错」，用 `getSwissTeamOutcome` / `getPlayoffTeamOutcome`；排序统一走 `sort.ts`。

## 评分规则

瑞士轮 5/10（须精确匹配）；八进四 2/4；半决赛 1/2；决赛必中冠军。

## 结构

```
app/                        # 路由与页面（Server Component 为主）
├── [event-id]/page.tsx     # 首页：各阶段结果 + 竞猜预览
├── [event-id]/stages/      # 竞猜列表（layout + 阶段切换 + 表格）
├── [event-id]/leaderboard/ # 排行榜
└── [event-id]/teams/       # 战队

components/
├── ui/         # Card / Badge / EmptyState / PageHeader
├── predictor/  # 竞猜者头像、统计行
├── team/       # TeamLogo / TeamLogoGroup / 表现标签
└── stage/      # 阶段头部、结果面板、表格、预览
```

- 默认 Server Component，直接调 `@/lib/data`；仅 `StageNav` / `EventSelector` / `NavItems` 为 client 且不导入数据层
- 组合优于复制：优先复用 `StageTableFrame`、`PredictorCard`、`PassMark`、`TeamLogoGroup`

## 数据台

`pnpm studio` 起本地页面（默认 4310，被占用则自动顺延），改动直接写回 `data/`：

- 竞猜：左侧选竞猜者 → 拖队伍进 3-0 / 3-X / 0-3 或四强 / 二强 / 冠军
- 「数据工具」菜单：比赛结果、队伍资料、新建赛事；写盘走 prettier，内容未变不落盘

## 改数据

更新结果：编辑 `data/events.json` 对应阶段的 `result`（进行中填 `1-0`/`2-1`，结束填 `3-0`…/`0-3`；决胜阶段填 `winners`/`losers`/`winner`），然后 `pnpm data:check`。

新增竞猜者：在 `data/predictions/<event-id>.json` 加条目，`id` 对应 `predictors.json`；瑞士轮每阶段 2/6/2 支，决胜阶段 4/2/1。

新增赛事：`events.json` 加赛事 → 新建 `predictions/<event-id>.json` → 在 `lib/data/store.ts` 的 `predictionFiles` 补 import → `pnpm data:check`。进度、排行、阶段显隐均自动推导。

## 样式

- Tailwind v4，主题在 `app/globals.css`（无 `tailwind.config.ts`）
- 只用语义色：`text-primary/secondary/muted`、`text-win/lose`、`bg-surface-0..3`、`border-border`
- 移动优先；表格在 `md` 以下切换为卡片
- 路径别名 `@/*` → 项目根

## 约定

- Prettier：2 空格、单引号、无分号、100 列
- 文件名统一 kebab-case（`swiss-table.tsx`），组件名保持 PascalCase；Next 约定的 `page.tsx` / `layout.tsx` 例外
- `BUILD_AT` 由 `next.config.ts` 注入，用 `formatLastUpdated()` 展示；远程图片白名单同在此文件
- 阶段 id 固定为 `stage-1/2/3` 与 `8-to-4/4-to-2/2-to-1`，竞猜文件 key 必须一致
