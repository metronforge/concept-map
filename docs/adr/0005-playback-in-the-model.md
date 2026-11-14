# ADR 0005: playback state belongs to the model

Status: open — decide in stage C with measurements

## Context

"Whole map" playback has state (which hop plays, the log so far, whether it
finished). Today it lives in private fields of `MapPlayer`, and one handler
writes player state without `reduce` (debt D2, D3).

## Options

1. Keep playback in the facade; only route `pagehide` through `reduce`.
2. Extend the aggregate: `PlayerState` gains a playback phase
   (`idle | playing(hop) | done`), hop events become actions, and `reduce`
   returns the new state plus effects as data (`start flow`, `stop flow`).
   The facade executes effects.

## To decide

Option 2 makes I2 hold for the whole player and lets the model-based test
cover playback, at the cost of a larger model. Stage C writes the option 2
model with its properties on a branch and compares: lines in the facade,
mutation score, browser tests that become unit tests. D2 is fixed in stage B
either way.
