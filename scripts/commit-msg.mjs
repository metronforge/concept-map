import { readFileSync } from "node:fs";

const types = "feat|fix|perf|docs|test|refactor|ci|build|chore|style|revert";
const pattern = new RegExp(
  `^(${types})(\\([a-z0-9./-]+\\))?!?: [^A-Z\\s].{0,70}[^.]$`,
);
const subject = readFileSync(process.argv[2], "utf8").split("\n")[0];

// Git's own messages for fixup/squash and merges from the hosting side.
const generated = /^(fixup!|squash!|amend!|Merge |Revert ")/;

if (!pattern.test(subject) && !generated.test(subject)) {
  process.stderr.write(
    `commit-msg: "${subject}"\n` +
      `expected "type(scope)?: summary" with type one of ${types.replaceAll("|", ", ")};\n` +
      "lower case after the colon, no final period, at most 72 characters. See AGENTS.md.\n",
  );
  process.exit(1);
}
