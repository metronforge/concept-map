import type { ResolvedMap } from "../schema.js";

/** Keep one width's candidate and ignore superseded or destroyed requests. */
export class NarrowLayout {
  private entry?: { width: number; map?: ResolvedMap };
  constructor(
    private readonly load: (widthEm: number) => Promise<ResolvedMap>,
    private readonly signal: AbortSignal,
    private readonly ready: () => void,
    private readonly target: EventTarget,
  ) {}

  get(width: number): ResolvedMap | undefined {
    if (this.signal.aborted) return;
    if (this.entry?.width === width) return this.entry.map;
    const entry = (this.entry = { width });
    void Promise.resolve()
      .then(() => {
        if (!this.signal.aborted && this.entry === entry)
          return this.load(width);
      })
      .then(
        (map) => {
          if (this.signal.aborted || this.entry !== entry) return;
          this.entry.map = map;
          this.ready();
        },
        (detail: unknown) => {
          if (!this.signal.aborted && this.entry === entry)
            this.target.dispatchEvent(
              new CustomEvent("maperror", { detail, bubbles: true }),
            );
        },
      );
    return undefined;
  }
}
