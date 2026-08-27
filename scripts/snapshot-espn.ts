/**
 * Pulls the redraft league's pre-Sleeper (2018-2023) history from ESPN's
 * unofficial API and merges it into data/redraft.json, ahead of the
 * existing Sleeper-sourced seasons. Unlike scripts/snapshot.ts, this is a
 * one-time historical backfill, not a recurring prebuild step — ESPN's
 * espn_s2/SWID cookies expire, and these seasons are frozen, so there's no
 * reason to re-fetch them on every build. Run manually with `npm run
 * snapshot:espn` whenever ESPN_SEASONS in config/espn-seasons.ts changes
 * (e.g. once a working 2017 league id is found).
 *
 * Every field here was checked against real ESPN responses before being
 * relied on — see the identity-matching and bracket-shape investigation
 * this script's design came out of. In particular:
 *  - ESPN computes each team's final standing itself (`rankCalculatedFinal`),
 *    so unlike the Sleeper snapshot, there's no bracket-topology
 *    reconstruction needed to know who finished where.
 *  - ESPN's playoffs run 2 scoring weeks per round (not 1, like Sleeper),
 *    and split the non-championship bracket into two separate ladders
 *    (WINNERS_CONSOLATION_LADDER / LOSERS_CONSOLATION_LADDER) rather than
 *    Sleeper's single losers bracket — both get folded into this project's
 *    one `losersBracket` array, so the site doesn't need ESPN-specific UI.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ESPN_SEASONS } from "../config/espn-seasons.ts";
import { ESPN_MEMBER_TO_SLEEPER_OWNER } from "../config/manager-identity.ts";
import { getEspnLeagueSeason, getEspnPlayers } from "../lib/espn/client.ts";
import { ESPN_NFL_TEAM_BY_ID, ESPN_POSITION_BY_ID } from "../lib/espn/lookups.ts";
import type { EspnLeagueResponse, EspnMatchup, EspnPlayoffTier, EspnTeam } from "../lib/espn/types.ts";
import type {
  BracketMatchResolved,
  LeagueSnapshot,
  SnapshotDraft,
  SnapshotSeason,
  SnapshotTeam,
  WeeklyMatchup,
} from "../lib/sleeper/snapshot-types.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_PATH = join(ROOT, "data/redraft.json");

function ownerIdFor(memberGuid: string | undefined): string | null {
  if (!memberGuid) return null;
  return ESPN_MEMBER_TO_SLEEPER_OWNER[memberGuid] ?? null;
}

function teamName(team: EspnTeam): string {
  if (team.name) return team.name;
  if (team.location || team.nickname) return [team.location, team.nickname].filter(Boolean).join(" ");
  return `Team ${team.id}`;
}

function buildTeams(league: EspnLeagueResponse): SnapshotTeam[] {
  const memberById = new Map(league.members.map((m) => [m.id, m]));

  return league.teams
    .map((team): SnapshotTeam => {
      const ownerGuid = team.primaryOwner ?? team.owners?.[0];
      const ownerId = ownerIdFor(ownerGuid);
      const member = memberById.get(ownerGuid);
      return {
        rosterId: team.id,
        ownerId,
        teamName: teamName(team),
        displayName: member?.displayName ?? teamName(team),
        // ESPN gives a full logo URL, not a hash needing CDN prefixing like
        // Sleeper's avatar field — fine as-is since nothing renders it yet.
        avatar: team.logo ?? null,
        wins: team.record.overall.wins,
        losses: team.record.overall.losses,
        ties: team.record.overall.ties,
        pointsFor: team.record.overall.pointsFor,
        pointsAgainst: team.record.overall.pointsAgainst,
        finish: team.rankCalculatedFinal || null,
      };
    })
    .sort((a, b) => (a.finish ?? 99) - (b.finish ?? 99));
}

function buildWeeklyMatchups(schedule: EspnMatchup[]): WeeklyMatchup[] {
  return schedule
    .filter((m) => m.playoffTierType === "NONE" && m.home && m.away)
    .map((m) => ({
      week: m.matchupPeriodId,
      rosterIdA: m.home.teamId,
      pointsA: m.home.totalPoints,
      rosterIdB: m.away.teamId,
      pointsB: m.away.totalPoints,
    }));
}

/**
 * Resolves placement (1st/2nd, 3rd/4th, etc.) only for matches at a tier's
 * final round — reusing `rankCalculatedFinal` (already verified against the
 * real 2022 season, 1..10 with no gaps or dupes) rather than re-deriving it
 * from bracket shape, which is exactly the kind of guess that went wrong
 * once already with Sleeper's consolation bracket before it was checked
 * against real data.
 */
function buildBracket(schedule: EspnMatchup[], tiers: EspnPlayoffTier[], teams: SnapshotTeam[]): BracketMatchResolved[] {
  const teamById = new Map(teams.map((t) => [t.rosterId, t]));
  const results: BracketMatchResolved[] = [];

  for (const tier of tiers) {
    const matches = schedule.filter((m) => m.playoffTierType === tier);
    if (matches.length === 0) continue;
    const finalRound = Math.max(...matches.map((m) => m.matchupPeriodId));

    for (const m of matches) {
      // A round with an odd/uneven number of remaining teams gives the top
      // seed a bye: ESPN represents that as a match with only `home`
      // populated and winner "UNDECIDED" rather than a placeholder
      // opponent (confirmed against real 2018/2019 data, both 6-team
      // playoff fields). There's no real matchup to show here — the bye'd
      // team's advancement already shows up as a participant in the next
      // round's actual match — so skip rather than rendering a vs-nothing card.
      if (!m.home || !m.away) continue;

      const winnerRosterId = m.winner === "HOME" ? m.home.teamId : m.winner === "AWAY" ? m.away.teamId : null;
      const loserRosterId = m.winner === "HOME" ? m.away.teamId : m.winner === "AWAY" ? m.home.teamId : null;

      let placement: number | null = null;
      if (m.matchupPeriodId === finalRound && winnerRosterId != null && loserRosterId != null) {
        const winnerFinish = teamById.get(winnerRosterId)?.finish;
        const loserFinish = teamById.get(loserRosterId)?.finish;
        if (winnerFinish != null && loserFinish != null) placement = Math.min(winnerFinish, loserFinish);
      }

      results.push({
        round: m.matchupPeriodId,
        matchId: m.id,
        team1RosterId: m.home.teamId,
        team2RosterId: m.away.teamId,
        winnerRosterId,
        loserRosterId,
        placement,
      });
    }
  }

  return results;
}

async function buildDraft(league: EspnLeagueResponse, season: number): Promise<SnapshotDraft | null> {
  const picks = league.draftDetail?.picks ?? [];
  if (picks.length === 0) return null;

  const uniquePlayerIds = [...new Set(picks.map((p) => p.playerId))];
  const players = await getEspnPlayers(season, uniquePlayerIds);
  const playerById = new Map(players.map((p) => [p.id, p]));

  const isAuction = picks.some((p) => p.bidAmount > 0);

  // Resolved via team ownership (teamId -> team.primaryOwner), not
  // pick.memberId directly: 2018's picks all carry the exact same
  // placeholder memberId regardless of who actually picked, which is an
  // ESPN data quirk specific to that season's response, found by checking
  // the raw picks rather than assuming memberId is always reliable.
  const ownerByTeamId = new Map(league.teams.map((t) => [t.id, ownerIdFor(t.primaryOwner ?? t.owners?.[0])]));

  // roundId means "this team's own Nth purchase" in an auction, not a
  // synchronized board round (the same trap already found in Sleeper's
  // auction data in Phase 4) — multiple different teams legitimately share
  // roundId 1, so a slot-per-team draftOrder is meaningless here and is
  // left empty. DraftBoard already renders auctions as a flat table that
  // never reads draftOrder, so this doesn't change what's on the page —
  // it just stops the JSON from holding data that looks meaningful but isn't.
  const draftOrder: Record<string, number> = {};
  if (!isAuction) {
    for (const pick of picks.filter((p) => p.roundId === 1)) {
      const ownerId = ownerByTeamId.get(pick.teamId);
      if (ownerId) draftOrder[ownerId] = pick.roundPickNumber;
    }
  }

  return {
    draftId: `espn-${league.id}-${season}`,
    type: isAuction ? "auction" : "snake",
    rounds: Math.max(...picks.map((p) => p.roundId)),
    draftOrder,
    picks: picks.map((p) => {
      const player = playerById.get(p.playerId);
      return {
        round: p.roundId,
        pickNo: p.overallPickNumber,
        draftSlot: p.roundPickNumber,
        rosterId: p.teamId,
        playerName: player?.fullName ?? `Player ${p.playerId}`,
        position: player ? (ESPN_POSITION_BY_ID[player.defaultPositionId] ?? "?") : "?",
        nflTeam: player ? (ESPN_NFL_TEAM_BY_ID[player.proTeamId] ?? "?") : "?",
        amount: p.bidAmount > 0 ? p.bidAmount : null,
      };
    }),
  };
}

async function snapshotEspnSeason(season: number, leagueId: number): Promise<SnapshotSeason> {
  const league = await getEspnLeagueSeason(leagueId, season);
  const teams = buildTeams(league);

  return {
    leagueType: "redraft",
    season: String(season),
    leagueId: `espn-${leagueId}-${season}`,
    status: "complete",
    source: "espn",
    teams,
    winnersBracket: buildBracket(league.schedule, ["WINNERS_BRACKET"], teams),
    losersBracket: buildBracket(
      league.schedule,
      ["WINNERS_CONSOLATION_LADDER", "LOSERS_CONSOLATION_LADDER"],
      teams,
    ),
    draft: await buildDraft(league, season),
    weeklyMatchups: buildWeeklyMatchups(league.schedule),
  };
}

async function main() {
  await mkdir(dirname(OUT_PATH), { recursive: true });

  const espnSeasons: SnapshotSeason[] = [];
  for (const { season, leagueId } of ESPN_SEASONS) {
    const snapshot = await snapshotEspnSeason(season, leagueId);
    espnSeasons.push(snapshot);
    console.log(`${season} (espn ${leagueId}): ${snapshot.teams.length} teams, ${snapshot.weeklyMatchups.length} matchups, ${snapshot.draft?.picks.length ?? 0} draft picks`);
  }
  espnSeasons.sort((a, b) => Number(a.season) - Number(b.season));

  const existing: LeagueSnapshot = JSON.parse(await readFile(OUT_PATH, "utf8"));
  // Drop any previously-written ESPN seasons before re-adding, so re-running
  // this script (e.g. after adding 2017) replaces rather than duplicates.
  const sleeperSeasons = existing.seasons.filter((s) => s.source !== "espn");
  const merged: LeagueSnapshot = { ...existing, seasons: [...espnSeasons, ...sleeperSeasons] };

  await writeFile(OUT_PATH, JSON.stringify(merged, null, 2));
  console.log(`\nMerged ${espnSeasons.length} ESPN season(s) into data/redraft.json (${merged.seasons.length} total).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
