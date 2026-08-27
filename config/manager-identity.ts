/**
 * Maps each ESPN member GUID (the redraft league's pre-2024 identity system,
 * back when it lived on ESPN) to the Sleeper owner_id that same real person
 * plays under today. There's no shared ID between the two platforms — this
 * mapping only exists because it was manually confirmed, person by person,
 * against real ESPN member data pulled from the league. Nothing here is
 * guessed: every entry was either an unambiguous handle match (e.g.
 * "ikkim12" on both platforms) or explicitly confirmed.
 *
 * Confirmed 2026-08-27: this covers all 10 people across both platforms
 * with no leftovers on either side — the league had zero manager turnover
 * across the ESPN-to-Sleeper migration.
 *
 * Used when merging ESPN historical seasons into the redraft league's
 * snapshot, so a manager's all-time record/head-to-head/trends span both
 * eras under one identity instead of splitting into two disconnected people.
 */
export const ESPN_MEMBER_TO_SLEEPER_OWNER: Record<string, string> = {
  "{12ACAA3F-1B2C-4E0E-A994-CD4F06C9DD84}": "868173817279877120", // Kharl Mccatty -> kharlm
  "{21CDC52B-6719-4646-8B27-3E0AA44E6D3F}": "1127811306347683840", // Justin Diaz -> justindiazc (Lucho)
  "{28E05803-EB19-427D-90C8-7809A4CCDEF9}": "864678198129098752", // Rosemond Fabien -> RoseGoes
  "{575F8339-AD39-4087-B838-F9674769CA9D}": "1133895963325784064", // Binh Nguyen -> binhnguyent9 (Team Band-Aid)
  "{87F86147-068A-4239-991A-D0F0A3F0EF55}": "1135645259008090112", // Christopher Thomas -> Messi561Mamba
  "{934DB70D-9980-4ADE-8DB7-0D9980DADE98}": "1129453687258169344", // nobie diaz -> brownkiwi11 (Nobie)
  "{AADC3344-60D2-486C-B14A-A8A99EBE49D3}": "1135402914639687680", // Mario Uzoka -> mater508 (49IRs)
  "{B57F0FE5-D590-4D56-BF0F-E5D590BD56E4}": "743220491350892544", // Matt Concelmo -> celmo (The Man in Jahmyrror)
  "{D2D05C3E-FA08-4788-8778-F2AC8863E35E}": "1134614168889393152", // Jesse Chen -> JSPChen94
  "{DBB71E62-E66C-43FF-81A8-CB936EBBAB27}": "1130395374394388480", // inkyu kim -> ikkim12
};
