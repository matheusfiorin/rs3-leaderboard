// Type-checks only the /skills route files with an in-memory TS program.
// noEmit + incremental disabled, so nothing is written and the project's
// tsbuildinfo cache is never touched.
import ts from "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src/node_modules/typescript/lib/typescript.js";
import { dirname } from "node:path";

const ROOT = "/home/mbaraofiorin/dev/rs3-leaderboard/v2-src";
const cfgPath = `${ROOT}/tsconfig.json`;
const raw = ts.readConfigFile(cfgPath, ts.sys.readFile);
const parsed = ts.parseJsonConfigFileContent(raw.config, ts.sys, dirname(cfgPath));

const options = {
  ...parsed.options,
  noEmit: true,
  incremental: false,
  composite: false,
  tsBuildInfoFile: undefined,
  skipLibCheck: true,
};

const entry = process.argv.slice(2).map((p) => `${ROOT}/${p}`);
const program = ts.createProgram(entry, options);
const wanted = new Set(entry.map((p) => p.replace(/\\/g, "/")));

let count = 0;
for (const d of [...program.getSemanticDiagnostics(), ...program.getSyntacticDiagnostics()]) {
  const file = d.file?.fileName?.replace(/\\/g, "/");
  if (!file || !wanted.has(file)) continue;
  const { line, character } = d.file.getLineAndCharacterOfPosition(d.start ?? 0);
  console.log(
    `${file.replace(ROOT + "/", "")}:${line + 1}:${character + 1} TS${d.code} ` +
      ts.flattenDiagnosticMessageText(d.messageText, " "),
  );
  count++;
}
console.log(count === 0 ? "no type errors in the checked files" : `${count} type error(s)`);
process.exit(count === 0 ? 0 : 1);
