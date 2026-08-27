export interface EspnSeasonConfig {
  season: number;
  leagueId: number;
}

/**
 * The redraft league's pre-Sleeper history. There's no single stable id to
 * walk (unlike Sleeper's previous_league_id chain) — ESPN recreated this
 * league under a new numeric id at least twice, so each entry's leagueId
 * was individually confirmed by a real, successful API fetch, not assumed
 * from a pattern. 2017 is a known, currently-unresolved gap: no league id
 * tried for that year has worked, despite it likely being the league's
 * founding season (2017-2026 spans exactly the "10 years running" the site
 * celebrates). Add it here the moment a working id turns up — nothing else
 * needs to change, since the snapshot script just loops over this list.
 */
export const ESPN_SEASONS: EspnSeasonConfig[] = [
  { season: 2018, leagueId: 1292594 },
  { season: 2019, leagueId: 79540103 },
  { season: 2020, leagueId: 79540103 },
  { season: 2021, leagueId: 79540103 },
  { season: 2022, leagueId: 79540103 },
  { season: 2023, leagueId: 79540103 },
];
