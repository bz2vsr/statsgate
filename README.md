# STATSGATE
The Statsgate Refactor

## Data notes

Older records from 2024 only listed the two commanders and omitted the
`teamOne` and `teamTwo` player arrays that later data includes. The
application previously treated those missing arrays as empty, counting
each side as a single-player team. For example, a 2024 entry looked like:

```json
"Aztec": {
    "date": "3.20.24",
    "map": "Aztec",
    "commanders": "Jabbapop vs DD",
    "factions": "[I.S.D.F, I.S.D.F]",
    "winning faction": "I.S.D.F",
    "winner": "DD"
}
```

Without team lists, that game was interpreted as a 1v1 with just the two
commanders. The updated code now skips such entries entirely so only games
with explicit team rosters contribute to statistics.

Recent data adds `teamOneStraggler` and `teamTwoStraggler` arrays for
late-joining players. Straggler charts only use games with these fields
and omit matches where no stragglers were recorded.
Faction popularity statistics still include the 2024 games since faction choices were recorded even when rosters were not.
