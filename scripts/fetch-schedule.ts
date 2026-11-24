async function main() {
  const today = `2026-11-24%2000:00:00`

  const data = await (
    await fetch(
      `https://gwapi.pwesports.cn/eventcenter/app/csgo/event/getMatchList?matchTime=${today}`,
    )
  ).json()

  console.log(
    data.result.matchResponse.dtoList
      .filter((e: any) => e.eventId === 9303)
      .map((e: any) => ({
        start: new Date(e.startTime).toISOString(),
        teamA: e.team1DTO.name,
        teamB: e.team2DTO.name,
        score: e.score1 && e.score2 ? [e.score1, e.score2] : null,
        winner:
          e.score1 && e.score2 ? (e.score1 > e.score2 ? e.team1DTO.name : e.team2DTO.name) : null,
      })),
  )
}

main()
