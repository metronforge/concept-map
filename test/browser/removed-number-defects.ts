/** Defects removed by shared number placement, asserted against the old reports. */
export function removedNumberDefects(
  name: string,
  engine: string,
  width: number,
) {
  let pairs: string[] = [];
  if (name === "gcd")
    pairs = [
      "step:loop and repeat:0:turn-1",
      "step:loop and repeat:0:turn-2",
      "step:loop and repeat:0:turn-3",
      "repeat:0:turn-1 and repeat:0:turn-2",
      "repeat:0:turn-1 and repeat:0:turn-3",
      "repeat:0:turn-2 and repeat:0:turn-3",
    ];
  if (name === "door") {
    if (width === 1280 && engine === "elk")
      pairs = ["step:open and step:unlock"];
    if (width === 390) {
      pairs = ["step:open and step:close"];
      if (engine === "elk") pairs.push("step:lock and step:unlock");
    }
  }
  return pairs.map((pair) => `step numbers overlap: ${pair}`);
}
