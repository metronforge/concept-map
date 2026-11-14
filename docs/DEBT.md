# Stage A debt and invariant evidence

Baseline: metronforge-site-dev `81af868`. No behavior fixes in this extraction.
Exception policy: ADR 0009. Stage B items require stage A merged; open ADRs 0005
and 0006 remain open. The listed debts are not waived invariants.

| Debt | Existing exception                                                                           | Guard / future removal                                                     |
| ---- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| D1   | Playwright layer enum, spread and inline --pw colours                                        | Schema/API/goldens freeze v2; ADR 0006 open                                |
| D2   | pagehide writes current directly, retaining all mode                                         | I2 executable counterexample; B routes through reduce                      |
| D3   | flowId/log/playback and startFlow decisions in facade                                        | Exact complexity ceiling; ADR 0005 open                                    |
| D4   | Geometry uses SVGGraphicsElement; ports colocated; geometry is a factory                     | Core DOM-free check excludes shell; split in B                             |
| D5   | Numeric positions and unbranded string IDs                                                   | API report freezes current shapes; B decision                              |
| D6   | One mixed entry point                                                                        | exports guard allows only current entry/CSS/schema; B creates 0.2.0        |
| D7   | Resolved schema only validates structure; semantic refs are checked by book authored adapter | I3/I6 counterexamples; do not claim safe arbitrary schema input            |
| D8   | Resolved rich text is trusted HTML, not plain text                                           | I7 counterexample; README states trust boundary                            |
| D9   | Literal SSR/browser DOM differs: marker identity and measured label fitting                  | I8 counterexample; semantic state comparisons and visual parity            |
| D10  | Renderers derive initial state and resolve positions                                         | Existing API and golden outputs; no layer refactor on A                    |
| D11  | Core values mutable by convention, nested arrays can alias input                             | Types/API unchanged; no freezing/cloning on A                              |
| D12  | Facade constructs concrete SvgDom/PanelDom, beyond injected Animator/Geometry                | Current API freeze; no speculative ports on A                              |
| D13  | Legacy functions/files exceed budgets                                                        | Exact measured exceptions in complexity-exceptions.json; no growth allowed |

## Invariants

Each statement is bounded by its test domain. Counterexample tests pass by
reproducing the existing violation; they do not prove the aspirational invariant.

| ID  | Stage-A verdict                                                                                                                                   | Evidence                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| I1  | Does not hold for all number actions; covered for finite integer actions                                                                          | Named property, old model command tests; NaN/fractional counterexample                                        |
| I2  | Does not hold on pagehide                                                                                                                         | Named browser property; fake-port model test remains B                                                        |
| I3  | Added deterministic/reference checks for 23 adapter-validated maps; not all schema-accepted inputs                                                | Named property and dangling-show exception                                                                    |
| I4  | Added monotonicity for all five revealed dictionaries, within one scenario                                                                        | Named property over book maps; existing generated-map checks                                                  |
| I5  | Does not hold; unrevealed current is accepted (book W2 warning)                                                                                   | Named counterexample                                                                                          |
| I6  | References covered on book maps; malformed refs accepted; edge is optional on a hop                                                               | Named property/counterexamples; browser reduced-motion tests show immediate result/no animations              |
| I7  | Does not hold for trusted rich-text leaves                                                                                                        | Named counterexample; existing Unicode/attribute escaping properties cover plain labels                       |
| I8  | Literal markup equality does not hold                                                                                                             | Named browser marker-ID counterexample; initial semantic state tests, frozen renderer hashes                  |
| I9  | Added browser property for abort signals, observer disconnect, inert controls and no owned token animations; existing animator cancellation tests | Not a proof of garbage collection; fonts.ready callback is retained until resolution but guarded by destroyed |

Rich HTML leaves include step text/fix, definition text, concept short text,
whole-map text and deeper why. Only use a trusted adapter to construct them.
Missing hop edge throws; missing step becomes -1; missing node throws. No
cross-reference validation is added at extraction time.
