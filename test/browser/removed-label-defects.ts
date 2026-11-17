/** Removed pairs stay explicit; a new or returning defect fails the browser check. */
export const removedLabelDefects: Record<string, string[]> = {
  "coffee dagre 1280": [
    "a line crosses an arrow label: label:offer and line:offer",
  ],
  "coffee dagre 390": [
    "a line crosses an arrow label: label:ticket and line:ticket",
    "a line crosses an arrow label: label:ticket and line:empty",
    "a line crosses an arrow label: label:ready and line:offer",
    "a line crosses an arrow label: label:offer and line:offer",
    "an arrow label covers a box: label:offer and node:guest",
  ],
  "coffee elk 390": [
    "a line crosses an arrow label: label:order and line:order",
    "a line crosses an arrow label: label:ticket and line:ticket",
    "a line crosses an arrow label: label:ready and line:ready",
    "a line crosses an arrow label: label:empty and line:empty",
    "a line crosses an arrow label: label:offer and line:empty",
    "a line crosses an arrow label: label:offer and line:offer",
  ],
  "door dagre 1280": [
    "a line crosses an arrow label: label:close and line:open",
    "a line crosses an arrow label: label:lock and line:lock",
    "a line crosses an arrow label: label:lock and line:unlock",
    "a line crosses an arrow label: label:unlock and line:unlock",
    "a line crosses an arrow label: label:finish and line:close",
  ],
  "door dagre 390": [
    "arrow labels overlap: label:start and label:finish",
    "a line crosses an arrow label: label:start and line:open",
    "a line crosses an arrow label: label:start and line:close",
    "a line crosses an arrow label: label:close and line:open",
    "a line crosses an arrow label: label:close and line:close",
    "a line crosses an arrow label: label:unlock and line:lock",
    "a line crosses an arrow label: label:unlock and line:unlock",
    "an arrow label covers a box: label:start and node:start",
    "an arrow label covers a box: label:start and node:closed",
    "an arrow label covers a box: label:close and node:open",
    "an arrow label covers a box: label:unlock and node:locked",
  ],
  "door elk 1280": [
    "a line crosses an arrow label: label:close and line:close",
    "a line crosses an arrow label: label:lock and line:lock",
    "a line crosses an arrow label: label:unlock and line:unlock",
  ],
};
