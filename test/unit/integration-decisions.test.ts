import { describe, expect, it } from "vitest";
import { layoutLevel } from "../../src/schema/level.js";
import { selectMapInput } from "../../src/model/input.js";
import { canHydrate } from "../../src/render/hydration.js";

describe("map layout level", () => {
  it("selects the validation level without accepting malformed geometry", () => {
    for (const value of [null, undefined, false, 0, "map", [], {}])
      expect(layoutLevel(value)).toBe("source");
    for (const value of [
      { viewBox: [10, 20] },
      { viewBox: null },
      { viewBox: undefined },
      Object.create({ viewBox: [] }),
    ])
      expect(layoutLevel(value)).toBe("resolved");
  });
});

describe("element input priority", () => {
  const inputs = {
    assigned: { id: "property" },
    src: "map.json",
    direct: '{"id":"direct"}',
    inline: { id: "retained" },
    server: '{"id":"server"}',
  };
  it("selects property, src, direct JSON, retained inline, then server data", () => {
    expect(selectMapInput(inputs)).toEqual({
      kind: "value",
      value: inputs.assigned,
    });
    expect(selectMapInput({ ...inputs, assigned: undefined })).toEqual({
      kind: "url",
      url: "map.json",
    });
    expect(
      selectMapInput({ ...inputs, assigned: undefined, src: null }),
    ).toEqual({ kind: "json", text: inputs.direct });
    expect(
      selectMapInput({
        ...inputs,
        assigned: undefined,
        src: null,
        direct: undefined,
      }),
    ).toEqual({ kind: "value", value: inputs.inline });
    expect(selectMapInput({ server: inputs.server })).toEqual({
      kind: "json",
      text: inputs.server,
    });
    expect(selectMapInput({})).toBeUndefined();
  });
  it("keeps invalid preferred input instead of falling back", () => {
    expect(selectMapInput({ ...inputs, assigned: null })).toEqual({
      kind: "value",
      value: null,
    });
    expect(selectMapInput({ src: "", direct: "{}" })).toEqual({
      kind: "url",
      url: "",
    });
    for (const direct of ["", "{bad", "null"])
      expect(selectMapInput({ direct, server: "{}" })).toEqual({
        kind: "json",
        text: direct,
      });
    expect(selectMapInput({ inline: null, server: "{}" })).toEqual({
      kind: "value",
      value: null,
    });
  });
  it("does not parse discarded JSON or change input values", () => {
    const assigned = Object.freeze({ id: "selected" });
    expect(
      selectMapInput(
        Object.freeze({ assigned, direct: "invalid", server: "invalid" }),
      ),
    ).toEqual({ kind: "value", value: assigned });
  });
});

describe("figure hydration decision", () => {
  const map = {
    id: "map",
    nodes: { a: { label: "<A>", box: [0, 0, 10, 20] } },
  };
  it("reuses equal data independent of object key order and JSON escapes", () => {
    expect(
      canHydrate(
        '{"nodes":{"a":{"box":[0,0,10,20],"label":"\\u003cA>"}},"id":"map"}',
        map,
      ),
    ).toBe(true);
  });
  it("renders for missing, corrupt, or stale server data", () => {
    for (const text of [
      undefined,
      "",
      "broken",
      "null",
      "{}",
      JSON.stringify({ ...map, id: "other" }),
    ])
      expect(canHydrate(text, map)).toBe(false);
    expect(
      canHydrate(JSON.stringify(map), {
        ...map,
        nodes: { a: { ...map.nodes.a, box: [0, 0, 20, 10] } },
      }),
    ).toBe(false);
  });
  it("keeps array order significant and never mutates the current map", () => {
    const value = Object.freeze({ items: Object.freeze(["a", "b"]) });
    expect(canHydrate('{"items":["b","a"]}', value)).toBe(false);
    expect(canHydrate('{"items":["a","b"]}', value)).toBe(true);
    expect(value.items).toEqual(["a", "b"]);
  });
});
