/** Refit on container, drawing and font changes until the player is destroyed. */
export function observeDrawing(
  svg: SVGSVGElement,
  signal: AbortSignal,
  fit: () => void,
): void {
  const resize = new ResizeObserver(fit);
  resize.observe(svg);
  resize.observe(svg.parentElement!);
  signal.addEventListener("abort", () => resize.disconnect(), { once: true });
  void svg.ownerDocument.fonts.ready.then(fit);
  svg.ownerDocument.fonts.addEventListener("loadingdone", fit, { signal });
}
