export interface EspnSeasonConfig {
  season: number;
  leagueId: number;
}

/**
 * The redraft league's pre-Sleeper history. There's no single stable id to
 * walk (unlike Sleeper's previous_league_id chain) — ESPN recreated this
 * league under a new numeric id at least twice, so each entry's leagueId
 * was individually confirmed by a real, successful API fetch, not assumed
 * from a pattern.
 *
 * 2017 is a permanent, accepted gap, not an open TODO: league id 1554438
 * was independently confirmed correct (it's what a real 2017 trade-notice
 * email links to), yet 404s across every season and endpoint format ESPN's
 * API supports, with valid auth. That points to the league record itself
 * having been deleted from ESPN's systems entirely, not a wrong id or a
 * fixable request — recovering it would require ESPN support restoring
 * their own data, not a code change here. Likely the league's founding
 * season (2017-2026 spans exactly the "10 years running" the site
 * celebrates), but every page already handles an 8-season history fine
 * with this gap, so there's nothing broken by its absence.
 */
export const ESPN_SEASONS: EspnSeasonConfig[] = [
  { season: 2018, leagueId: 1292594 },
  { season: 2019, leagueId: 79540103 },
  { season: 2020, leagueId: 79540103 },
  { season: 2021, leagueId: 79540103 },
  { season: 2022, leagueId: 79540103 },
  { season: 2023, leagueId: 79540103 },
];
