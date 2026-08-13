import { getTeamByRosterId } from "@/lib/data/standings";
import { ordinal } from "@/lib/format";
import type { BracketMatchResolved, SnapshotSeason, SnapshotTeam } from "@/lib/sleeper/snapshot-types";

/**
 * Labels come from the season's already-computed `finish` values rather than
 * a hardcoded "Championship" / "3rd Place" per round number. That matters
 * for the losers/consolation bracket specifically — its raw `p` field is
 * relative to that bracket (its own "p:1" might really decide 5th/6th
 * overall), and re-deriving that offset here would risk getting it wrong a
 * second time. Reading it back off `finish` reuses the one place that's
 * already been verified correct.
 */
function placementLabel(match: BracketMatchResolved, season: SnapshotSeason, roundPrefix: string): string {
  if (match.placement == null) return `${roundPrefix} · Round ${match.round}`;
  const winnerFinish = getTeamByRosterId(season, match.winnerRosterId)?.finish;
  if (winnerFinish === 1) return "Championship";
  if (winnerFinish != null) return `${ordinal(winnerFinish)} Place Game`;
  return `${roundPrefix} · Round ${match.round}`;
}

function TeamRow({ team, isWinner }: { team: SnapshotTeam | undefined; isWinner: boolean }) {
  return (
    <div
      className={`flex items-center justify-between px-3 py-2 text-sm ${
        isWinner ? "font-semibold text-gold-400" : "text-fg-muted"
      }`}
    >
      <span className="truncate">{team?.teamName ?? "TBD"}</span>
      {isWinner ? (
        <span aria-hidden className="text-xs">
          ▸
        </span>
      ) : null}
    </div>
  );
}

function MatchCard({ match, season }: { match: BracketMatchResolved; season: SnapshotSeason }) {
  const team1 = getTeamByRosterId(season, match.team1RosterId);
  const team2 = getTeamByRosterId(season, match.team2RosterId);

  return (
    <div className="w-48 overflow-hidden rounded-lg bg-navy-800 ring-1 ring-navy-600">
      <TeamRow team={team1} isWinner={match.winnerRosterId != null && match.winnerRosterId === match.team1RosterId} />
      <div className="h-px bg-navy-600" />
      <TeamRow team={team2} isWinner={match.winnerRosterId != null && match.winnerRosterId === match.team2RosterId} />
    </div>
  );
}

export function Bracket({
  matches,
  season,
  label,
}: {
  matches: BracketMatchResolved[];
  season: SnapshotSeason;
  label: string;
}) {
  if (matches.length === 0) return null;

  const rounds = Array.from(new Set(matches.map((m) => m.round))).sort((a, b) => a - b);

  return (
    <div className="overflow-x-auto">
      <div className="flex w-max gap-8 pb-2">
        {rounds.map((round) => (
          <div key={round} className="flex flex-col justify-center gap-6">
            {matches
              .filter((m) => m.round === round)
              .map((match) => (
                <div key={match.matchId} className="space-y-1.5">
                  <p className="text-xs font-medium tracking-wide text-fg-subtle uppercase">
                    {placementLabel(match, season, label)}
                  </p>
                  <MatchCard match={match} season={season} />
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
