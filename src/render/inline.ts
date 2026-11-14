export const escapeHtml = (text: string): string =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
/** Make legacy literal marks explicit when authoring inline text. */
export const escapeMarks = (text: string): string =>
  text.replace(/[\\*`]/g, "\\$&");
function closing(input: string, start: number, mark: string): number {
  for (let i = start; i < input.length; i++) {
    if (input[i] === "\\" && /[*`\\]/.test(input[i + 1] ?? "")) {
      i++;
      continue;
    }
    if (input[i] === "`") {
      const end = input.indexOf("`", i + 1);
      if (end >= 0) {
        i = end;
        continue;
      }
    }
    if (mark === "*" && input.startsWith("**", i)) {
      const end = closing(input, i + 2, "**");
      if (end >= 0) {
        i = end + 1;
        continue;
      }
      i++;
      continue;
    }
    if (input.startsWith(mark, i)) return i;
  }
  return -1;
}
/** Authored strings are text. Only paired inline marks introduce markup. */
export function renderInline(input: string): string {
  let html = "";
  for (let i = 0; i < input.length;) {
    const ch = input[i];
    if (ch === "\\" && /[*`\\]/.test(input[i + 1] ?? "")) {
      html += escapeHtml(input[i + 1]);
      i += 2;
      continue;
    }
    if (ch === "`") {
      const end = input.indexOf("`", i + 1);
      if (end >= 0) {
        html += `<code>${escapeHtml(input.slice(i + 1, end))}</code>`;
        i = end + 1;
        continue;
      }
    }
    if (ch === "*") {
      const mark = input.startsWith("**", i) ? "**" : "*",
        end = closing(input, i + mark.length, mark);
      if (end >= 0) {
        const tag = mark === "**" ? "strong" : "em";
        html += `<${tag}>${renderInline(input.slice(i + mark.length, end))}</${tag}>`;
        i = end + mark.length;
        continue;
      }
      html += mark;
      i += mark.length;
      continue;
    }
    html += escapeHtml(ch);
    i++;
  }
  return html;
}
