/**
 * ESPN's fixed numeric schemes for player position and NFL team. These IDs
 * don't change even when a franchise relocates (e.g. the Raiders' id is the
 * same pre- and post-move to Las Vegas) — only the display abbreviation
 * would differ by era, which this map doesn't attempt to track per season.
 * Cosmetic only: used purely for display in the draft board, not for any
 * data-integrity-sensitive computation.
 */
export const ESPN_POSITION_BY_ID: Record<number, string> = {
  1: "QB",
  2: "RB",
  3: "WR",
  4: "TE",
  5: "K",
  16: "DEF",
};

export const ESPN_NFL_TEAM_BY_ID: Record<number, string> = {
  1: "ATL",
  2: "BUF",
  3: "CHI",
  4: "CIN",
  5: "CLE",
  6: "DAL",
  7: "DEN",
  8: "DET",
  9: "GB",
  10: "TEN",
  11: "IND",
  12: "KC",
  13: "LV",
  14: "LAR",
  15: "MIA",
  16: "MIN",
  17: "NE",
  18: "NO",
  19: "NYG",
  20: "NYJ",
  21: "PHI",
  22: "ARI",
  23: "PIT",
  24: "LAC",
  25: "SF",
  26: "SEA",
  27: "TB",
  28: "WSH",
  29: "CAR",
  30: "JAX",
  33: "BAL",
  34: "HOU",
};
