/**
 * 数据台前端。
 *
 * 三种模式共用一套「泳道」抽象：
 *   竞猜 → data/predictions/<event>.json
 *   结果 → data/events.json
 *   队伍 → data/teams.json
 *
 * 所有编辑先落到内存，再 debounce 写回；容量与去重在这里兜底。
 */

const STAGES = [
  { id: 'stage-1', label: '第一阶段' },
  { id: 'stage-2', label: '第二阶段' },
  { id: 'stage-3', label: '第三阶段' },
  { id: 'playoffs', label: '决胜阶段' },
]

const SWISS_FINAL = ['3-0', '3-1', '3-2', '2-3', '1-3', '0-3']
const SWISS_PROGRESS = ['2-2', '2-1', '2-0', '1-2', '1-1', '1-0', '0-2', '0-1']
const SWISS_ALL = [...SWISS_PROGRESS, ...SWISS_FINAL]

const PICK_LANES = [
  { key: '3-0', label: '3-0', size: 2, tone: 'good', note: '全胜晋级' },
  { key: '3-X', label: '3-X', size: 6, tone: 'flat', note: '两负内晋级' },
  { key: '0-3', label: '0-3', size: 2, tone: 'bad', note: '全败淘汰' },
]

const PLAYOFF_PICK_LANES = [
  { key: '8-to-4', label: '四强', size: 4, tone: 'good', note: '八进四' },
  { key: '4-to-2', label: '二强', size: 2, tone: 'flat', note: '半决赛' },
  { key: '2-to-1', label: '冠军', size: 1, tone: 'accent', note: '决赛' },
]

const SWISS_RESULT_LANES = [
  { key: '3-0', label: '3-0', size: 2, tone: 'good', note: '全胜' },
  { key: '3-1', label: '3-1', size: 3, tone: 'good', note: '一负' },
  { key: '3-2', label: '3-2', size: 3, tone: 'good', note: '两负' },
  { key: '2-3', label: '2-3', size: 3, tone: 'bad', note: '两胜' },
  { key: '1-3', label: '1-3', size: 3, tone: 'bad', note: '一胜' },
  { key: '0-3', label: '0-3', size: 2, tone: 'bad', note: '全败' },
]

const SWISS_PROGRESS_LANES = SWISS_PROGRESS.map((key) => ({
  key,
  label: key,
  size: 16,
  tone: 'flat',
  note: '进行中',
}))

const PLAYOFF_RESULT_LANES = [
  { key: '8-to-4:win', label: '八进四 晋级', size: 4, tone: 'good', note: '四强' },
  { key: '8-to-4:lose', label: '八进四 淘汰', size: 4, tone: 'bad', note: '八强' },
  { key: '4-to-2:win', label: '半决赛 晋级', size: 2, tone: 'good', note: '决赛' },
  { key: '4-to-2:lose', label: '半决赛 淘汰', size: 2, tone: 'bad', note: '四强' },
  { key: '2-to-1:win', label: '冠军', size: 1, tone: 'accent', note: '决赛胜者' },
  { key: '2-to-1:lose', label: '亚军', size: 1, tone: 'flat', note: '决赛败者' },
]

const SWISS_BUCKET_MATCH = { '3-0': ['3-0'], '3-X': ['3-1', '3-2'], '0-3': ['0-3'] }

const els = {
  layout: document.querySelector('#layout'),
  eventSelect: document.querySelector('#event-select'),
  search: document.querySelector('#search'),
  railList: document.querySelector('#rail-list'),
  railSummary: document.querySelector('#rail-summary'),
  editor: document.querySelector('#editor'),
  status: document.querySelector('#save-status'),
  reload: document.querySelector('#reload'),
  addPredictor: document.querySelector('#add-predictor'),
  predictorDialog: document.querySelector('#predictor-dialog'),
  predictorForm: document.querySelector('#predictor-form'),
  eventDialog: document.querySelector('#event-dialog'),
  eventForm: document.querySelector('#event-form'),
  teamDialog: document.querySelector('#team-dialog'),
  teamForm: document.querySelector('#team-form'),
  toast: document.querySelector('#toast'),
}

const state = {
  mode: 'picks',
  events: [],
  predictors: [],
  teams: [],
  predictions: {},
  teamMap: new Map(),
  eventId: null,
  predictorId: null,
  stageId: 'stage-1',
  selectedTeam: null,
  query: '',
  dirty: { predictors: false, predictions: false, events: false, teams: false },
  history: [],
}

const timers = {}
let toastTimer = null

/* -------------------------------------------------------------------------- */
/*                                  基础工具                                   */
/* -------------------------------------------------------------------------- */

const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  )

const allLanes = (groups) => groups.flatMap((group) => group.lanes)

function toast(message) {
  els.toast.textContent = message
  els.toast.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2000)
}

function setStatus(kind, text) {
  els.status.dataset.state = kind
  els.status.textContent = text
}

function nowLabel() {
  return new Date().toLocaleTimeString('zh-CN', { hour12: false })
}

/* -------------------------------------------------------------------------- */
/*                                  数据访问                                   */
/* -------------------------------------------------------------------------- */

const currentEvent = () => state.events.find((event) => event.id === state.eventId)
const currentFile = () => state.predictions[state.eventId]
const currentEntry = () => currentFile()?.predictions.find((item) => item.id === state.predictorId)
const currentProfile = () => state.predictors.find((item) => item.id === state.predictorId)

/** 当前阶段参赛队伍（含上一阶段晋级） */
function availableTeams() {
  const event = currentEvent()
  if (!event) return []

  if (state.stageId === 'playoffs') return event.playoffs?.teams ?? []

  const stage = event[state.stageId]
  if (!stage) return []
  return [...new Set([...(stage.teams ?? []), ...(stage.teamsFromAdvanced ?? [])])]
}

function laneGroups() {
  if (state.mode === 'results') {
    if (state.stageId === 'playoffs') {
      return [{ title: '决胜阶段结果', lanes: PLAYOFF_RESULT_LANES }]
    }
    return [
      { title: '最终结果', lanes: SWISS_RESULT_LANES },
      { title: '进行中战绩', lanes: SWISS_PROGRESS_LANES, compact: true },
    ]
  }

  return [{ lanes: state.stageId === 'playoffs' ? PLAYOFF_PICK_LANES : PICK_LANES }]
}

/* -------------------------------------------------------------------------- */
/*                                读写泳道数据                                 */
/* -------------------------------------------------------------------------- */

function readBoard() {
  const map = {}

  if (state.mode === 'results') {
    const event = currentEvent()
    if (!event) return map

    if (state.stageId === 'playoffs') {
      const result = event.playoffs.result
      map['8-to-4:win'] = [...result['8-to-4'].winners]
      map['8-to-4:lose'] = [...result['8-to-4'].losers]
      map['4-to-2:win'] = [...result['4-to-2'].winners]
      map['4-to-2:lose'] = [...result['4-to-2'].losers]
      map['2-to-1:win'] = result['2-to-1'].winner ? [result['2-to-1'].winner] : []
      map['2-to-1:lose'] = result['2-to-1'].loser ? [result['2-to-1'].loser] : []
      return map
    }

    const result = event[state.stageId]?.result ?? {}
    for (const key of SWISS_ALL) map[key] = [...(result[key] ?? [])]
    return map
  }

  const entry = currentEntry()
  const pred = state.stageId === 'playoffs' ? entry?.playoffs : entry?.[state.stageId]
  if (!pred) return map

  for (const lane of allLanes(laneGroups())) {
    const value = pred[lane.key]
    map[lane.key] = Array.isArray(value) ? [...value] : value ? [value] : []
  }
  return map
}

function writeBoard(map) {
  if (state.mode === 'results') {
    const event = currentEvent()
    if (!event) return

    if (state.stageId === 'playoffs') {
      event.playoffs.result = {
        '8-to-4': { winners: map['8-to-4:win'], losers: map['8-to-4:lose'] },
        '4-to-2': { winners: map['4-to-2:win'], losers: map['4-to-2:lose'] },
        '2-to-1': { winner: map['2-to-1:win'][0] ?? null, loser: map['2-to-1:lose'][0] ?? null },
      }
      return
    }

    for (const key of SWISS_ALL) event[state.stageId].result[key] = map[key]
    return
  }

  const entry = ensureEntry()
  if (!entry) return

  if (state.stageId === 'playoffs') {
    if (!entry.playoffs) entry.playoffs = { '8-to-4': [], '4-to-2': [], '2-to-1': null }
    entry.playoffs['8-to-4'] = map['8-to-4']
    entry.playoffs['4-to-2'] = map['4-to-2']
    entry.playoffs['2-to-1'] = map['2-to-1'][0] ?? null
    return
  }

  if (!entry[state.stageId]) entry[state.stageId] = { '3-0': [], '3-X': [], '0-3': [] }
  entry[state.stageId]['3-0'] = map['3-0']
  entry[state.stageId]['3-X'] = map['3-X']
  entry[state.stageId]['0-3'] = map['0-3']
}

/* -------------------------------------------------------------------------- */
/*                                  结果着色                                   */
/* -------------------------------------------------------------------------- */

function outcomeFor(team, board) {
  if (state.mode === 'results') return ''

  const event = currentEvent()
  if (!event) return ''

  const lane = allLanes(laneGroups()).find((item) => (board[item.key] ?? []).includes(team))
  if (!lane) return ''

  if (state.stageId === 'playoffs') {
    const result = event.playoffs?.result
    if (!result) return ''
    const key = lane.key

    if (key === '2-to-1') {
      if (result['2-to-1'].winner === team) return 'win'
      if (result['2-to-1'].winner) return 'lose'
      return ''
    }
    if (result[key].winners.includes(team)) return 'win'
    if (result[key].losers.includes(team)) return 'lose'
    if (key === '4-to-2' && result['8-to-4'].losers.includes(team)) return 'lose'
    return ''
  }

  const result = event[state.stageId]?.result
  if (!result) return ''

  const final = SWISS_FINAL.find((record) => result[record]?.includes(team))
  if (final) return SWISS_BUCKET_MATCH[lane.key].includes(final) ? 'win' : 'lose'

  const progress = SWISS_PROGRESS.find((record) => result[record]?.includes(team))
  if (progress) {
    const [wins, losses] = progress.split('-').map(Number)
    if (lane.key === '3-0' && losses > 0) return 'lose'
    if (lane.key === '0-3' && wins > 0) return 'lose'
  }

  return ''
}

/* -------------------------------------------------------------------------- */
/*                                  渲染                                       */
/* -------------------------------------------------------------------------- */

function logoHtml(id) {
  const team = state.teamMap.get(id)
  const src = team?.logo || `https://image.viki.moe/cs/t/${id}.png`
  return `<span class="logo" data-initial="${esc(id.slice(0, 2))}"><img referrerpolicy="no-referrer" src="${esc(src)}" alt="" loading="lazy" onerror="this.remove()"></span>`
}

function chipHtml(id, board, options = {}) {
  const outcome = outcomeFor(id, board)
  const selected = state.selectedTeam === id

  return `<button class="chip${selected ? ' selected' : ''}" type="button" draggable="true" data-team="${esc(id)}"${
    outcome ? ` data-outcome="${outcome}"` : ''
  } title="${esc(id)}">${logoHtml(id)}<span class="name">${esc(id)}</span></button>`
}

function renderMode() {
  els.layout.dataset.mode = state.mode
  els.eventSelect.hidden = state.mode === 'teams'
}

function renderEventSelect() {
  els.eventSelect.innerHTML = state.events
    .map(
      (event) =>
        `<option value="${esc(event.id)}"${event.id === state.eventId ? ' selected' : ''}>${esc(event.shortName || event.name)}</option>`,
    )
    .join('')
}

function renderRail() {
  if (state.mode !== 'picks') return

  const query = state.query.trim().toLowerCase()
  const file = currentFile()

  const ordered = [...state.predictors].sort((a, b) => Number(a.id === 'cs') - Number(b.id === 'cs'))

  const rows = ordered
    .filter((item) => {
      if (!query) return true
      return [item.name, item.id, item.platform].some((field) =>
        String(field ?? '').toLowerCase().includes(query),
      )
    })
    .map((item) => {
      const entry = file?.predictions.find((prediction) => prediction.id === item.id)
      const done = STAGES.filter((stage) => Boolean(entry?.[stage.id])).length
      const initial = (item.name || item.id).slice(0, 1)
      const avatar = item.avatar
        ? `<img referrerpolicy="no-referrer" class="avatar" src="${esc(item.avatar)}" alt="" loading="lazy" onerror="this.remove()">`
        : `<span class="avatar-fallback">${esc(initial)}</span>`

      return `<button class="row" type="button" role="option" data-predictor="${esc(item.id)}" aria-selected="${
        item.id === state.predictorId
      }">
        ${avatar}
        <span class="meta">
          <span class="name">${esc(item.name || item.id)}</span>
          <span class="sub">${esc(item.platform || item.id)}</span>
        </span>
        <span class="badge" data-complete="${done === STAGES.length}">${entry ? `${done}/4` : '—'}</span>
      </button>`
    })

  const participated = state.predictors.filter((item) =>
    file?.predictions.some((entry) => entry.id === item.id),
  ).length

  els.railSummary.textContent = `${state.predictors.length} 位 · 本赛事 ${participated} 位`

  els.railList.innerHTML = rows.length
    ? rows.join('')
    : '<div class="empty" style="height:auto;padding:24px 12px">没有匹配的竞猜者</div>'
}

function renderTabs() {
  els.editor.querySelectorAll('.tab').forEach((tab) => {
    const stageId = tab.dataset.stage
    const lanes = allLanes(laneGroupsFor(stageId))
    const board = readBoardFor(stageId)

    // 进行中战绩容量是弹性的，不参与完成度统计
    const scored = lanes.filter((lane) => lane.size <= 4)
    const filled = scored.reduce((sum, lane) => sum + (board[lane.key]?.length ?? 0), 0)
    const total = scored.reduce((sum, lane) => sum + lane.size, 0)

    tab.setAttribute('aria-selected', String(stageId === state.stageId))
    tab.dataset.complete = String(total > 0 && filled === total)

    const count = tab.querySelector('.count')
    if (count) count.textContent = `${filled}/${total}`
  })
}

/** 指定阶段的泳道配置（tab 统计用） */
function laneGroupsFor(stageId) {
  if (state.mode === 'results') {
    return stageId === 'playoffs'
      ? [{ lanes: PLAYOFF_RESULT_LANES }]
      : [{ lanes: SWISS_RESULT_LANES }, { lanes: SWISS_PROGRESS_LANES }]
  }
  return [{ lanes: stageId === 'playoffs' ? PLAYOFF_PICK_LANES : PICK_LANES }]
}

/** 指定阶段的数据快照（tab 统计用） */
function readBoardFor(stageId) {
  const saved = state.stageId
  state.stageId = stageId
  const board = readBoard()
  state.stageId = saved
  return board
}

function laneHtml(lane, board) {
  const teams = board[lane.key] ?? []
  const full = teams.length >= lane.size

  return `<div class="lane" data-lane="${lane.key}" data-drop="${lane.key}" data-tone="${lane.tone}">
    <div class="lane-head">
      <span class="lane-title">${lane.label}</span>
      <span class="lane-note">${lane.note}</span>
      <span class="lane-count" data-full="${full}">${teams.length}/${lane.size}</span>
    </div>
    <div class="lane-body">
      ${teams.length ? teams.map((id) => chipHtml(id, board)).join('') : '<div class="lane-empty">拖入队伍</div>'}
    </div>
    ${teams.length < lane.size && lane.size <= 4 ? `<div class="lane-foot">还差 ${lane.size - teams.length} 支</div>` : ''}
  </div>`
}

function renderBoard() {
  const board = readBoard()
  const groups = laneGroups()
  const lanes = allLanes(groups)
  const assigned = new Set(lanes.flatMap((lane) => board[lane.key] ?? []))
  const all = availableTeams()
  const pool = all.filter((team) => !assigned.has(team))

  els.poolCount.textContent = `${pool.length} / ${all.length}`
  els.poolBody.innerHTML = pool.length
    ? pool.map((id) => chipHtml(id, board)).join('')
    : `<span class="pool-empty">${all.length ? '全部队伍已分配' : '本阶段暂无队伍数据'}</span>`

  els.lanes.innerHTML = groups
    .map(
      (group) => `
      ${group.title ? `<div class="group-title">${esc(group.title)}</div>` : ''}
      <div class="lanes${group.compact ? ' compact' : ''}">
        ${group.lanes.map((lane) => laneHtml(lane, board)).join('')}
      </div>`,
    )
    .join('')

  renderFoot(board)
}

function renderFoot(board) {
  const notes = []

  if (state.mode === 'results') {
    if (state.stageId === 'playoffs') {
      const four = board['8-to-4:win']
      const two = board['4-to-2:win']
      if (two.some((team) => !four.includes(team))) notes.push(['warn', '半决赛晋级队伍不在四强名单中'])
      const champion = board['2-to-1:win'][0]
      if (champion && !two.includes(champion)) notes.push(['warn', '冠军不在决赛名单中'])
    } else {
      const missing = SWISS_FINAL.reduce(
        (sum, key) => sum + Math.max(0, (SWISS_RESULT_LANES.find((l) => l.key === key)?.size ?? 0) - board[key].length),
        0,
      )
      if (missing) notes.push(['hint', `最终结果还差 ${missing} 支`])
    }
  } else {
    if (state.stageId === 'playoffs') {
      const two = board['4-to-2'] ?? []
      const champion = (board['2-to-1'] ?? [])[0]
      if (champion && !two.includes(champion)) notes.push(['hint', '冠军不在二强名单中'])
      if (two.some((team) => !(board['8-to-4'] ?? []).includes(team))) {
        notes.push(['warn', '二强中有队伍不在四强名单中'])
      }
    }
    const missing = allLanes(laneGroups()).reduce(
      (sum, lane) => sum + Math.max(0, lane.size - (board[lane.key]?.length ?? 0)),
      0,
    )
    if (missing) notes.push(['hint', `本阶段还差 ${missing} 支`])
  }

  els.foot.innerHTML = `<span class="path">${esc(boardPath())}</span>${notes
    .map(([kind, text]) => `<span class="${kind}">${esc(text)}</span>`)
    .join('')}`
}

function boardPath() {
  if (state.mode === 'results') return 'data/events.json'
  if (state.mode === 'teams') return 'data/teams.json'
  return `data/predictions/${state.eventId}.json`
}

function stageTabsHtml() {
  return `<nav class="stages" role="tablist">
    ${STAGES.map(
      (stage) =>
        `<button class="tab" type="button" role="tab" data-stage="${stage.id}" aria-selected="${stage.id === state.stageId}">${stage.label}<span class="count"></span></button>`,
    ).join('')}
    <div class="stages-tools">
      <button class="btn ghost" type="button" data-action="undo">撤销</button>
      <button class="btn ghost" type="button" data-action="clear-stage">清空本阶段</button>
    </div>
  </nav>`
}

function boardHtml() {
  return `<section class="pool" data-drop="pool">
      <div class="pool-head">
        <span class="pool-title">待选队伍<span class="num" id="pool-count"></span></span>
        <span class="lane-note">拖动，或点选后按 1 / 2 / 3</span>
      </div>
      <div class="pool-body" id="pool-body"></div>
    </section>
    <div id="lanes"></div>
    <div class="board-foot" id="board-foot"></div>`
}

function renderPicksEditor() {
  const profile = currentProfile()
  if (!profile) {
    els.editor.innerHTML = '<div class="empty">选择左侧竞猜者开始编辑</div>'
    return
  }

  const entry = currentEntry()
  const initial = (profile.name || profile.id).slice(0, 1)

  els.editor.innerHTML = `
    <header class="profile">
      ${
        profile.avatar
          ? `<img referrerpolicy="no-referrer" class="profile-avatar" id="profile-avatar" src="${esc(profile.avatar)}" alt="" onerror="this.style.visibility='hidden'">`
          : `<span class="profile-avatar" id="profile-avatar" style="display:grid;place-items:center;color:var(--ink-2)">${esc(initial)}</span>`
      }
      <div class="profile-main">
        <h1 class="profile-title">${esc(profile.name || profile.id)}<span class="id">${esc(profile.id)}</span></h1>
        <div class="form-grid">
          <label class="field"><span class="label">昵称</span>
            <input class="input" data-field="name" value="${esc(profile.name ?? '')}" /></label>
          <label class="field"><span class="label">平台</span>
            <input class="input" data-field="platform" value="${esc(profile.platform ?? '')}" /></label>
          <label class="field"><span class="label">主页</span>
            <input class="input" data-field="link" value="${esc(profile.link ?? '')}" placeholder="https://" /></label>
          <label class="field"><span class="label">头像</span>
            <input class="input" data-field="avatar" value="${esc(profile.avatar ?? '')}" placeholder="https://" /></label>
        </div>
      </div>
      <div class="profile-actions">
        <button class="btn danger" type="button" data-action="delete-predictor">删除</button>
      </div>
    </header>

    <nav class="stages" role="tablist">
      ${STAGES.map(
        (stage) =>
          `<button class="tab" type="button" role="tab" data-stage="${stage.id}" aria-selected="${stage.id === state.stageId}">${stage.label}<span class="count"></span></button>`,
      ).join('')}
      <div class="stages-tools">
        ${
          entry
            ? '<button class="btn ghost" type="button" data-action="undo">撤销</button><button class="btn ghost" type="button" data-action="clear-stage">清空本阶段</button>'
            : '<button class="btn primary" type="button" data-action="add-prediction">添加本赛事竞猜</button>'
        }
      </div>
    </nav>

    ${
      entry
        ? boardHtml()
        : `<div class="empty" style="height:auto;padding:64px 0">该竞猜者尚未参与本赛事<br><span style="font-size:11.5px">点击右上角「添加本赛事竞猜」</span></div>`
    }
  `

  cacheBoardEls()
  if (entry) renderBoard()
  renderTabs()
}

function renderResultsEditor() {
  const event = currentEvent()
  if (!event) {
    els.editor.innerHTML = '<div class="empty">没有赛事数据</div>'
    return
  }

  els.editor.innerHTML = `
    <header class="profile">
      <div class="profile-main">
        <h1 class="profile-title">${esc(event.name)}<span class="id">${esc(event.id)}</span></h1>
        <div class="form-grid">
          <label class="field"><span class="label">赛事名称</span>
            <input class="input" data-event-field="name" value="${esc(event.name ?? '')}" /></label>
          <label class="field"><span class="label">简称</span>
            <input class="input" data-event-field="shortName" value="${esc(event.shortName ?? '')}" /></label>
        </div>
      </div>
      <div class="profile-actions"><button class="btn ghost" type="button" data-mode="picks">返回竞猜</button></div>
    </header>
    ${stageTabsHtml()}
    ${boardHtml()}
  `

  cacheBoardEls()
  renderBoard()
  renderTabs()
}

function renderTeamsEditor() {
  const query = state.query.trim().toLowerCase()
  const rows = state.teams
    .filter((team) =>
      !query
        ? true
        : [team.id, team.name, team.shortName].some((field) =>
            String(field ?? '').toLowerCase().includes(query),
          ),
    )
    .map(
      (team) => `<tr>
        <td class="mono">${esc(team.id)}</td>
        <td><input class="input" data-team-id="${esc(team.id)}" data-team-field="name" value="${esc(team.name ?? '')}" /></td>
        <td><input class="input" data-team-id="${esc(team.id)}" data-team-field="shortName" value="${esc(team.shortName ?? '')}" /></td>
        <td><input class="input" data-team-id="${esc(team.id)}" data-team-field="logo" value="${esc(team.logo ?? '')}" /></td>
        <td><input class="input" data-team-id="${esc(team.id)}" data-team-field="link" value="${esc(team.link ?? '')}" /></td>
        <td><button class="btn danger" type="button" data-action="delete-team" data-team-id="${esc(team.id)}">删除</button></td>
      </tr>`,
    )

  els.editor.innerHTML = `
    <header class="profile">
      <div class="profile-main">
        <h1 class="profile-title">队伍资料<span class="id">${state.teams.length} 支</span></h1>
        <p class="muted-note">队徽、全名、HLTV 链接；赛事里的队伍 id 需与此处一致。</p>
      </div>
      <div class="profile-actions">
        <button class="btn ghost" type="button" data-mode="picks">返回竞猜</button>
        <button class="btn" type="button" data-action="add-team">新增队伍</button>
      </div>
    </header>

    <div class="table-wrap">
      <table class="grid">
        <thead><tr>
          <th style="width:120px">ID</th>
          <th>全名</th>
          <th style="width:120px">简称</th>
          <th>队徽 URL</th>
          <th>HLTV</th>
          <th style="width:64px"></th>
        </tr></thead>
        <tbody>${rows.join('') || '<tr><td colspan="6" class="empty-cell">没有匹配的队伍</td></tr>'}</tbody>
      </table>
    </div>
    <div class="board-foot"><span class="path">data/teams.json</span></div>
  `
}

function cacheBoardEls() {
  els.poolBody = els.editor.querySelector('#pool-body')
  els.poolCount = els.editor.querySelector('#pool-count')
  els.lanes = els.editor.querySelector('#lanes')
  els.foot = els.editor.querySelector('#board-foot')
}

function renderEditor() {
  renderMode()

  if (state.mode === 'teams') return renderTeamsEditor()
  if (state.mode === 'results') return renderResultsEditor()
  return renderPicksEditor()
}

/* -------------------------------------------------------------------------- */
/*                                  变更                                       */
/* -------------------------------------------------------------------------- */

function pushHistory() {
  if (state.mode === 'teams') return
  state.history.push({
    mode: state.mode,
    eventId: state.eventId,
    predictorId: state.predictorId,
    stageId: state.stageId,
    data: JSON.stringify(readBoard()),
  })
  if (state.history.length > 80) state.history.shift()
}

function undo() {
  const snapshot = state.history.pop()
  if (!snapshot) return toast('没有可撤销的操作')

  state.mode = snapshot.mode
  state.eventId = snapshot.eventId
  state.predictorId = snapshot.predictorId
  state.stageId = snapshot.stageId

  writeBoard(JSON.parse(snapshot.data))
  commit()
}

function ensureEntry() {
  const file = currentFile()
  if (!file) {
    toast('该赛事没有竞猜文件')
    return null
  }

  let entry = file.predictions.find((item) => item.id === state.predictorId)
  if (!entry) {
    entry = { id: state.predictorId }
    file.predictions.push(entry)
  }
  return entry
}

function commit() {
  const kind = state.mode === 'results' ? 'events' : 'predictions'
  state.dirty[kind] = true
  setStatus('dirty', '未保存')

  renderBoard()
  renderTabs()
  renderRail()
  scheduleSave(kind)
}

function assign(teamId, laneKey) {
  if (state.mode === 'results' && !currentEvent()) return

  const lane = allLanes(laneGroups()).find((item) => item.key === laneKey)
  if (!lane) return

  const board = readBoard()
  const current = board[laneKey] ?? []

  if (!current.includes(teamId) && current.length >= lane.size) {
    toast(`${lane.label} 已满，最多 ${lane.size} 支`)
    return
  }

  pushHistory()

  for (const item of allLanes(laneGroups())) {
    board[item.key] = (board[item.key] ?? []).filter((team) => team !== teamId)
  }
  board[laneKey] = [...(board[laneKey] ?? []), teamId]

  writeBoard(board)
  state.selectedTeam = null
  commit()
}

function removeTeam(teamId) {
  const board = readBoard()
  const assigned = allLanes(laneGroups()).some((lane) => (board[lane.key] ?? []).includes(teamId))
  if (!assigned) return

  pushHistory()
  for (const lane of allLanes(laneGroups())) {
    board[lane.key] = (board[lane.key] ?? []).filter((team) => team !== teamId)
  }
  writeBoard(board)
  commit()
}

function clearStage() {
  const board = readBoard()
  const hasAny = allLanes(laneGroups()).some((lane) => (board[lane.key] ?? []).length)
  if (!hasAny) return toast('本阶段已经是空的')

  if (!confirm(`清空「${STAGES.find((stage) => stage.id === state.stageId)?.label}」的全部数据？`)) return

  pushHistory()
  for (const lane of allLanes(laneGroups())) board[lane.key] = []
  writeBoard(board)
  commit()
}

/* -------------------------------------------------------------------------- */
/*                                  持久化                                     */
/* -------------------------------------------------------------------------- */

async function api(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.error || `请求失败（${response.status}）`)
  return payload
}

function scheduleSave(kind) {
  clearTimeout(timers[kind])
  timers[kind] = setTimeout(() => save(kind), 700)
}

async function save(kind) {
  if (!state.dirty[kind]) return
  setStatus('saving', '保存中…')

  try {
    if (kind === 'predictors') {
      const result = await api('PUT', '/api/predictors', state.predictors)
      if (result.predictions) state.predictions = result.predictions
    } else if (kind === 'predictions') {
      await api('PUT', `/api/predictions/${state.eventId}`, currentFile())
    } else if (kind === 'events') {
      await api('PUT', '/api/events', { events: state.events })
    } else if (kind === 'teams') {
      await api('PUT', '/api/teams', { teams: state.teams })
      state.teamMap = new Map(state.teams.map((team) => [team.id, team]))
    }

    state.dirty[kind] = false
    setStatus('idle', `已保存 ${nowLabel()}`)
  } catch (error) {
    setStatus('error', '保存失败')
    toast(error.message)
  }
}

async function loadData({ keepSelection = true } = {}) {
  setStatus('saving', '载入中…')

  try {
    const data = await api('GET', '/api/data')
    state.events = data.events
    state.predictors = data.predictors
    state.teams = data.teams
    state.predictions = data.predictions
    state.teamMap = new Map(state.teams.map((team) => [team.id, team]))
    state.dirty = { predictors: false, predictions: false, events: false, teams: false }
    state.history = []

    if (!state.eventId || !state.events.some((event) => event.id === state.eventId)) {
      state.eventId = state.events[0]?.id ?? null
    }
    if (!keepSelection || !state.predictors.some((item) => item.id === state.predictorId)) {
      state.predictorId = state.predictors[0]?.id ?? null
    }

    renderEventSelect()
    renderRail()
    renderEditor()
    setStatus('idle', `已载入 ${nowLabel()}`)
  } catch (error) {
    setStatus('error', '载入失败')
    toast(error.message)
  }
}

/* -------------------------------------------------------------------------- */
/*                                  交互绑定                                   */
/* -------------------------------------------------------------------------- */

function switchMode(mode) {
  if (!mode || state.mode === mode) return
  state.mode = mode
  state.selectedTeam = null
  state.history = []
  closeToolsMenu()
  renderEditor()
  renderRail()
}

function closeToolsMenu() {
  const menu = document.querySelector('#tools-menu')
  if (menu) menu.open = false
}

document.addEventListener('click', (event) => {
  const modeButton = event.target.closest('[data-mode]')
  if (modeButton) {
    switchMode(modeButton.dataset.mode)
    return
  }

  if (event.target.closest('[data-action="add-event"]')) {
    closeToolsMenu()
    openEventDialog()
    return
  }

  if (!event.target.closest('#tools-menu')) closeToolsMenu()
})

els.eventSelect.addEventListener('change', (event) => {
  state.eventId = event.target.value
  state.selectedTeam = null
  state.history = []
  renderRail()
  renderEditor()
})

els.search.addEventListener('input', (event) => {
  state.query = event.target.value
  if (state.mode === 'teams') renderTeamsEditor()
  else renderRail()
})

els.reload.addEventListener('click', async () => {
  const dirty = Object.values(state.dirty).some(Boolean)
  if (dirty && !confirm('有未保存的改动，重新载入会丢弃，继续？')) return
  await loadData()
})

els.railList.addEventListener('click', (event) => {
  const row = event.target.closest('[data-predictor]')
  if (!row) return
  state.predictorId = row.dataset.predictor
  state.selectedTeam = null
  renderRail()
  renderEditor()
})

els.editor.addEventListener('click', (event) => {
  const tab = event.target.closest('.tab')
  if (tab) {
    if (tab.dataset.stage === state.stageId) return
    state.stageId = tab.dataset.stage
    state.selectedTeam = null
    renderEditor()
    return
  }

  const action = event.target.closest('[data-action]')?.dataset.action
  if (action === 'undo') return undo()
  if (action === 'clear-stage') return clearStage()
  if (action === 'delete-predictor') return deletePredictor()
  if (action === 'add-team') return openTeamDialog()
  if (action === 'delete-team') return deleteTeam(event.target.dataset.teamId)

  if (action === 'add-prediction') {
    const entry = ensureEntry()
    if (entry) {
      commit()
      renderEditor()
      toast('已添加本赛事竞猜')
    }
    return
  }

  const chip = event.target.closest('.chip')
  if (chip) {
    if (chip.closest('.pool')) {
      state.selectedTeam = state.selectedTeam === chip.dataset.team ? null : chip.dataset.team
      renderBoard()
    } else {
      removeTeam(chip.dataset.team)
    }
    return
  }

  const lane = event.target.closest('.lane')
  if (lane && state.selectedTeam) assign(state.selectedTeam, lane.dataset.lane)
})

els.editor.addEventListener('input', (event) => {
  const profileField = event.target.dataset.field
  if (profileField) {
    const profile = currentProfile()
    if (!profile) return

    profile[profileField] = event.target.value

    if (profileField === 'name') {
      const title = els.editor.querySelector('.profile-title')
      if (title) title.firstChild.textContent = profile.name
      renderRail()
    }

    if (profileField === 'avatar') {
      const avatar = els.editor.querySelector('#profile-avatar')
      if (avatar?.tagName === 'IMG') avatar.src = profile.avatar
    }

    state.dirty.predictors = true
    setStatus('dirty', '未保存')
    scheduleSave('predictors')
    return
  }

  const eventField = event.target.dataset.eventField
  if (eventField) {
    const current = currentEvent()
    if (!current) return
    current[eventField] = event.target.value
    if (eventField === 'name' || eventField === 'shortName') {
      const title = els.editor.querySelector('.profile-title')
      if (title) title.firstChild.textContent = current.name
      renderEventSelect()
    }
    state.dirty.events = true
    setStatus('dirty', '未保存')
    scheduleSave('events')
    return
  }

  const teamId = event.target.dataset.teamId
  const teamField = event.target.dataset.teamField
  if (teamId && teamField) {
    const team = state.teams.find((item) => item.id === teamId)
    if (!team) return
    team[teamField] = event.target.value
    state.teamMap = new Map(state.teams.map((item) => [item.id, item]))
    state.dirty.teams = true
    setStatus('dirty', '未保存')
    scheduleSave('teams')
  }
})

/* 拖拽 ------------------------------------------------------------------ */

document.addEventListener('dragstart', (event) => {
  const chip = event.target.closest('.chip')
  if (!chip) return
  event.dataTransfer.setData('text/plain', chip.dataset.team)
  event.dataTransfer.effectAllowed = 'move'
  chip.classList.add('dragging')
})

document.addEventListener('dragend', () => {
  document.querySelectorAll('.dragging').forEach((node) => node.classList.remove('dragging'))
  document.querySelectorAll('.drop-over').forEach((node) => node.classList.remove('drop-over'))
})

document.addEventListener('dragover', (event) => {
  const zone = event.target.closest('[data-drop]')
  if (!zone) return
  event.preventDefault()
  zone.classList.add('drop-over')
})

document.addEventListener('dragleave', (event) => {
  const zone = event.target.closest('[data-drop]')
  if (zone && !zone.contains(event.relatedTarget)) zone.classList.remove('drop-over')
})

document.addEventListener('drop', (event) => {
  const zone = event.target.closest('[data-drop]')
  if (!zone) return

  event.preventDefault()
  zone.classList.remove('drop-over')

  const team = event.dataTransfer.getData('text/plain')
  if (!team) return

  if (zone.dataset.drop === 'pool') removeTeam(team)
  else assign(team, zone.dataset.drop)
})

/* 键盘 ------------------------------------------------------------------ */

document.addEventListener('keydown', (event) => {
  if (event.target.matches('input, select, textarea')) return

  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
    event.preventDefault()
    undo()
    return
  }

  if (event.key === 'Escape') {
    state.selectedTeam = null
    if (state.mode !== 'teams') renderBoard()
    return
  }

  if (event.key === '/') {
    event.preventDefault()
    els.search.focus()
    return
  }

  if (/^[1-9]$/.test(event.key) && state.selectedTeam) {
    const lane = allLanes(laneGroups())[Number(event.key) - 1]
    if (lane) assign(state.selectedTeam, lane.key)
  }
})

/* 竞猜者 ---------------------------------------------------------------- */

els.addPredictor.addEventListener('click', () => {
  els.predictorForm.reset()
  els.predictorForm.querySelector('[data-error]').hidden = true
  els.predictorDialog.showModal()
  els.predictorForm.querySelector('#new-id').focus()
})

els.predictorForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const data = new FormData(els.predictorForm)
  const id = String(data.get('id') ?? '').trim()
  const name = String(data.get('name') ?? '').trim()
  const platform = String(data.get('platform') ?? '').trim()
  const error = els.predictorForm.querySelector('[data-error]')

  if (!/^[\w.-]+$/.test(id)) return showDialogError(error, 'ID 只能包含字母、数字、下划线、点和连字符')
  if (state.predictors.some((item) => item.id === id)) return showDialogError(error, '该 ID 已存在')

  state.predictors.push({ id, name, platform, link: '', avatar: '' })
  state.predictorId = id
  state.mode = 'picks'
  state.dirty.predictors = true

  els.predictorDialog.close()
  renderEditor()
  renderRail()
  await save('predictors')
})

async function deletePredictor() {
  const profile = currentProfile()
  if (!profile) return

  const ok = confirm(`删除「${profile.name || profile.id}」？\n会同时移除所有赛事中的竞猜记录，且不可撤销。`)
  if (!ok) return

  try {
    const result = await api('POST', '/api/predictors/delete', { id: profile.id })
    state.predictors = result.predictors
    state.predictions = result.predictions
    state.predictorId = state.predictors[0]?.id ?? null
    renderRail()
    renderEditor()
    setStatus('idle', `已删除 ${nowLabel()}`)
  } catch (error) {
    toast(error.message)
  }
}

/* 赛事 ------------------------------------------------------------------ */

function openEventDialog() {
  els.eventForm.reset()

  const copyFrom = els.eventForm.querySelector('#copy-from')
  copyFrom.innerHTML =
    '<option value="">手动填写</option>' +
    state.events
      .map((event) => `<option value="${esc(event.id)}">复制自 ${esc(event.shortName || event.name)}</option>`)
      .join('')

  els.eventForm.querySelector('[data-error]').hidden = true
  els.eventDialog.showModal()
  els.eventForm.querySelector('[name="id"]').focus()
}

els.eventForm.querySelector('#copy-from').addEventListener('change', (event) => {
  const source = state.events.find((item) => item.id === event.target.value)
  const textarea = els.eventForm.querySelector('#event-teams')
  textarea.value = source ? source.teams.map((team) => `${team.id} ${team.stage}`).join('\n') : ''
})

els.eventForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const form = new FormData(els.eventForm)
  const id = String(form.get('id') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()
  const shortName = String(form.get('shortName') ?? '').trim()
  const rawTeams = String(form.get('teams') ?? '')
  const error = els.eventForm.querySelector('[data-error]')

  if (!/^[\w.-]+$/.test(id)) return showDialogError(error, 'ID 只能包含字母、数字、下划线、点和连字符')
  if (state.events.some((item) => item.id === id)) return showDialogError(error, '该赛事 ID 已存在')

  const teams = []
  for (const line of rawTeams.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    const [teamId, stage] = trimmed.split(/[\s,]+/)
    if (!teamId || !/^[\w.-]+$/.test(teamId)) return showDialogError(error, `队伍 ID 非法：${trimmed}`)
    if (!['stage-1', 'stage-2', 'stage-3'].includes(stage)) {
      return showDialogError(error, `阶段非法：${trimmed}（应为 stage-1 / stage-2 / stage-3）`)
    }
    if (!state.teamMap.has(teamId)) return showDialogError(error, `teams.json 中不存在队伍：${teamId}`)
    if (teams.some((item) => item.id === teamId)) return showDialogError(error, `队伍重复：${teamId}`)

    teams.push({ id: teamId, stage })
  }

  if (!teams.length) return showDialogError(error, '至少需要一支队伍')

  state.events.unshift(buildEvent({ id, name, shortName, teams }))
  state.eventId = id
  state.dirty.events = true

  els.eventDialog.close()
  renderEventSelect()
  renderEditor()

  await save('events')
  await loadData()
  toast('赛事已创建，竞猜文件已一并生成')
})

function buildEvent({ id, name, shortName, teams }) {
  const byStage = { 'stage-1': [], 'stage-2': [], 'stage-3': [] }
  for (const team of teams) byStage[team.stage].push(team.id)

  const emptyResult = () => ({
    '1-0': [],
    '0-1': [],
    '1-1': [],
    '2-0': [],
    '0-2': [],
    '2-1': [],
    '1-2': [],
    '2-2': [],
    '3-0': [],
    '3-1': [],
    '3-2': [],
    '2-3': [],
    '1-3': [],
    '0-3': [],
  })

  return {
    id,
    name,
    shortName,
    current: 'stage-1',
    teams,
    'stage-1': { name: '第一阶段', teams: byStage['stage-1'], result: emptyResult() },
    'stage-2': {
      name: '第二阶段',
      teams: byStage['stage-2'],
      teamsFromAdvanced: [],
      result: emptyResult(),
    },
    'stage-3': {
      name: '第三阶段',
      teams: byStage['stage-3'],
      teamsFromAdvanced: [],
      result: emptyResult(),
    },
    playoffs: {
      teams: [],
      result: {
        '8-to-4': { winners: [], losers: [] },
        '4-to-2': { winners: [], losers: [] },
        '2-to-1': { winner: null, loser: null },
      },
    },
  }
}

/* 队伍 ------------------------------------------------------------------ */

function openTeamDialog() {
  els.teamForm.reset()
  els.teamForm.querySelector('[data-error]').hidden = true
  els.teamDialog.showModal()
  els.teamForm.querySelector('#team-id').focus()
}

els.teamForm.addEventListener('submit', async (event) => {
  event.preventDefault()

  const form = new FormData(els.teamForm)
  const id = String(form.get('id') ?? '').trim()
  const name = String(form.get('name') ?? '').trim()
  const logo = String(form.get('logo') ?? '').trim()
  const error = els.teamForm.querySelector('[data-error]')

  if (!/^[\w.-]+$/.test(id)) return showDialogError(error, 'ID 只能包含字母、数字、下划线、点和连字符')
  if (state.teamMap.has(id)) return showDialogError(error, '该队伍已存在')

  state.teams.push({ id, name, shortName: name, logo, link: '' })
  state.teamMap = new Map(state.teams.map((team) => [team.id, team]))
  state.dirty.teams = true

  els.teamDialog.close()
  renderTeamsEditor()
  await save('teams')
})

async function deleteTeam(teamId) {
  const used = state.events.some(
    (event) =>
      event.teams.some((team) => team.id === teamId) ||
      ['stage-1', 'stage-2', 'stage-3'].some((stageId) =>
        (event[stageId]?.teams ?? []).includes(teamId),
      ) ||
      (event.playoffs?.teams ?? []).includes(teamId),
  )

  if (used) return toast('该队伍仍在赛事数据中，请先在 events.json 里移除')

  const team = state.teamMap.get(teamId)
  if (!confirm(`删除队伍「${team?.name || teamId}」？`)) return

  state.teams = state.teams.filter((item) => item.id !== teamId)
  state.teamMap = new Map(state.teams.map((item) => [item.id, item]))
  state.dirty.teams = true

  renderTeamsEditor()
  await save('teams')
}

/* 弹窗工具 -------------------------------------------------------------- */

function showDialogError(node, message) {
  node.textContent = message
  node.hidden = false
}

document.querySelectorAll('dialog [data-close]').forEach((button) => {
  button.addEventListener('click', () => button.closest('dialog').close())
})

/* -------------------------------------------------------------------------- */
/*                                  启动                                       */
/* -------------------------------------------------------------------------- */

loadData({ keepSelection: false })
