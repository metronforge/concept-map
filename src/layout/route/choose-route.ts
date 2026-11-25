/** Inspect the channel proposal first, then fall back to the stretched route. */
export function chooseRoute<T>(
  channel: T | null,
  stretch: () => T,
  inspect: (candidate: T) => readonly string[],
) {
  if (channel !== null) {
    const conflicts = inspect(channel);
    if (!conflicts.length) return { result: channel, conflicts };
  }
  const result = stretch();
  return { result, conflicts: inspect(result) };
}
