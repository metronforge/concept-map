import { describe, expect, it, vi } from "vitest";
import type { ResolvedMap } from "../../src/schema.js";
import { NarrowLayout } from "../../src/dom/narrowLayout.js";

const map = { id: "candidate" } as ResolvedMap;
const settled = () => new Promise((resolve) => setTimeout(resolve, 0));
function setup(load = vi.fn(async (_width: number) => map)) {
  const abort = new AbortController();
  const ready = vi.fn();
  const failed = vi.fn();
  const target = new EventTarget();
  target.addEventListener("maperror", failed);
  return {
    load,
    abort,
    ready,
    failed,
    cache: new NarrowLayout(load, abort.signal, ready, target),
  };
}

describe("narrow layout requests", () => {
  it("shares pending work and reuses the last width's candidate", async () => {
    const { cache, load, ready } = setup();
    expect(cache.get(20)).toBeUndefined();
    expect(cache.get(20)).toBeUndefined();
    await settled();
    expect(load).toHaveBeenCalledExactlyOnceWith(20);
    expect(cache.get(20)).toBe(map);
    expect(ready).toHaveBeenCalledTimes(1);
    cache.get(19);
    await settled();
    expect(load.mock.calls).toEqual([[20], [19]]);
    expect(cache.get(19)).toBe(map);
  });

  it("ignores out-of-order results after the width changes", async () => {
    const resolve = new Map<number, (map: ResolvedMap) => void>();
    const { cache, ready } = setup(
      vi.fn(
        (width: number) =>
          new Promise<ResolvedMap>((done) => resolve.set(width, done)),
      ),
    );
    cache.get(20);
    await settled();
    cache.get(19);
    await settled();
    const newer = { ...map, id: "newer" };
    resolve.get(19)!(newer);
    await settled();
    resolve.get(20)!(map);
    await settled();
    expect(cache.get(19)).toBe(newer);
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it("does not start a superseded request queued in the same turn", async () => {
    const { cache, load } = setup();
    cache.get(20);
    cache.get(19);
    await settled();
    expect(load).toHaveBeenCalledExactlyOnceWith(19);
  });

  for (const sync of [false, true])
    it(`reports failure once without retrying on each fit, synchronous=${sync}`, async () => {
      const error = new Error("engine unavailable");
      const load = vi.fn((_width: number) => {
        if (sync) throw error;
        return Promise.reject(error);
      });
      const { cache, failed, ready } = setup(load);
      cache.get(20);
      await settled();
      expect(failed).toHaveBeenCalledTimes(1);
      expect(failed.mock.calls[0][0].detail).toBe(error);
      expect(failed.mock.calls[0][0].bubbles).toBe(true);
      expect(cache.get(20)).toBeUndefined();
      await settled();
      expect(load).toHaveBeenCalledTimes(1);
      expect(ready).not.toHaveBeenCalled();
      cache.get(19);
      await settled();
      expect(load).toHaveBeenCalledTimes(2);
    });

  for (const reject of [false, true])
    it(`ignores settlement after destruction, rejected=${reject}`, async () => {
      let finish!: (value: ResolvedMap) => void;
      const { cache, abort, ready, failed } = setup(
        vi.fn(
          (_width: number) =>
            new Promise<ResolvedMap>((resolve, fail) => {
              finish = reject ? fail : resolve;
            }),
        ),
      );
      cache.get(20);
      await settled();
      abort.abort();
      finish(map);
      await settled();
      expect(cache.get(20)).toBeUndefined();
      expect(ready).not.toHaveBeenCalled();
      expect(failed).not.toHaveBeenCalled();
    });

  it("does not start queued work after destruction", async () => {
    const { cache, load, abort } = setup();
    cache.get(20);
    abort.abort();
    await settled();
    expect(load).not.toHaveBeenCalled();
  });
});
