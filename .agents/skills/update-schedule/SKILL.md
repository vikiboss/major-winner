---
name: update-schedule
description: 从 pwesports 赛事 API 拉取 CS2 Major 比赛时间与比分，人工核对后更新 data/events.json 中各阶段的 schedule.matches（开赛时间、比分、胜者）。当用户要求「更新赛程」「同步比赛时间」「更新比分/结果」或提供 getMatchList 接口链接时使用。
---

# 更新赛程

把 pwesports 比赛接口的数据落到 `data/events.json` 的 `schedule.matches`，供 `/schedule` 页面展示。

**这是人工核对流程，不是自动同步。** 网站是纯静态导出（`output: 'export'`），构建时不能请求外网；API 只作为「照抄数据的来源」，**不要把接口调用写进 `lib/`、`app/`、`scripts/` 或任何构建流程**。

## 接口

```
https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList?matchTime=2026-11-24%2000:00:00
```

`matchTime` 是**起点时间**，返回从该时刻起一段时间窗内的所有比赛（通常 24 小时左右），不是「只要这一天」。

### 先过滤，别照单全收

一次响应会混入多个赛事，务必按 `eventId` 过滤：

| eventId | 赛事                     |
| ------- | ------------------------ |
| `9303`  | PGL Major Singapore 2026 |
| `9485`  | 其它赛事（BO3）          |
| `9494`  | 其它赛事（占位 TBD）     |

另外**丢弃 `TBD vs TBD` 的占位场次**（`team1Id` 为 `99999` / `team2Id` 为 `99998`）：这些是后续阶段的待定槽位，不属于当前阶段赛程。

### 关键字段

数据在 `result.matchResponse.dtoList[]`：

| 字段                              | 含义                            |
| --------------------------------- | ------------------------------- |
| `matchId`                         | 比赛 id                         |
| `eventId`                         | 所属赛事（用于过滤）            |
| `startTime`                       | 开始时间，**epoch 毫秒**（UTC） |
| `team1DTO.name` / `team2DTO.name` | 队名（API 写法，见下方对照）    |
| `score1` / `score2`               | 比分；**未开赛为 `null`**       |
| `winnerTeamId`                    | 胜者队伍 id；未结束为 `null`    |
| `bo`                              | `bo1` / `bo3` / `bo5`           |
| `status`                          | 2 = 未开赛                      |

拉取后先用 node 扫一遍，不要直接读原始 JSON 长文：

```bash
curl -s -m 30 'https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList?matchTime=2026-11-25%2000:00:00' -o /tmp/matches.json && node -e '
const list = require("/tmp/matches.json").result.matchResponse.dtoList
for (const m of list) {
  if (m.eventId !== 9303) continue
  if (m.team1Id === 99999) continue
  console.log([m.matchId, new Date(m.startTime).toISOString(), m.bo, m.team1DTO.name, m.score1, m.score2, m.team2DTO.name, m.winnerTeamId].join(" | "))
}'
```

## 队名对照

API 用官方全名，`data/teams.json` 用 id。**必须手工核对**，没有自动映射：

| API                 | teams.json id |
| ------------------- | ------------- |
| `Lynn Vision`       | `LVG`         |
| `PVISION`           | `PV`          |
| `BC.G`              | `BCG`         |
| `Chinggis Warriors` | `CW`          |
| `100 Thieves`       | `100T`        |
| `Eternal Fire`      | `EF`          |
| `Ninjas in Pyjamas` | `NIP`         |

其余多数队名与 id 同名（`9z`、`HEROIC`、`FURIA`…）。拿不准时查 `data/teams.json`，**不要猜**；匹配不到就先问用户，不要新建一个不存在的 id。

## 写入格式

`data/events.json` → 赛事 → `stage-N.schedule.matches[]`：

```json
{
  "id": "stage-1-r1-m1",
  "start": "2026-11-24T04:00:00Z",
  "no": 1,
  "round": 1,
  "group": "0-0",
  "format": "bo1",
  "teamA": "9z",
  "teamB": "LVG",
  "score": null,
  "winner": null
}
```

- `id`：`{stage}-r{轮}-m{序号}`
- `start`：ISO 8601 **UTC**（`new Date(startTime).toISOString()`），页面会按 `event.timezone`（默认 `Asia/Shanghai`）显示
- `group`：开赛时战绩组。第 1 轮固定 `0-0`；后续轮次按实际战绩填
- `score`：未开赛 `null`；开赛后填 `[teamA, teamB]`
- `winner`：未结束 `null`，否则填 `teamA` 或 `teamB` 的 id

**状态不用填。** 页面由 `getMatchStatus(format, score)` 推导（无比分=未开始、达赛制所需局数=已结束、其余=进行中），手工填状态会和比分打架。

## 步骤

1. 问清要更新哪个赛事、哪个阶段；不明确就先问。
2. 拉接口，按 `eventId` 过滤，丢弃 `TBD` 占位场次。
3. 核对队名 → id 对照，逐条比对 `stage-N.teams`，确认每支队伍都属于该阶段。
4. 写入/更新 `schedule.matches`：保持按 `start` 升序、`id` 唯一。
5. 跑校验：

```bash
pnpm data:check   # 会校验 schedule 的 id 唯一、时间合法、赛制、队伍归属、比分格式
pnpm typecheck
```

6. 把改动摘要给用户看：新增/更新了几场、哪些填了比分、有没有对不上的队名。

## 注意

- **只更新用户要求的赛事/阶段**，不要顺手改别的阶段或竞猜数据。
- 比分与 `winner` 要一致：有比分就该有胜者（除非确实进行中）。
- API 的 `team1`/`team2` 顺序即 `teamA`/`teamB`，不要为「强队在前」之类的理由重排，否则比分会对错边。
- 拉取失败或该时段无数据，如实告诉用户，不要编造时间或比分。
