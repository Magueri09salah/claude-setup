#!/usr/bin/env node
// Counts every fenced block in STORE-LISTING.md and flags the ones over their
// store limit. Store consoles count UNICODE CODE POINTS, not UTF-8 bytes, so
// [...s].length is the right measure here -- s.length would over-count nothing
// in Arabic but would over-count emoji, and .length on bytes is simply wrong.

const fs = require("fs");
const path = require("path");

const FILE = path.join(__dirname, "..", "STORE-LISTING.md");

// Block number -> [label, limit]. Blocks are numbered in document order.
const LIMITS = {
  1: ["Name (Apple + Play)", 30],
  2: ["Name alternate", 30],
  3: ["Name alternate", 30],
  4: ["Subtitle (Apple)", 30],
  5: ["Subtitle alternate", 30],
  6: ["Subtitle alternate", 30],
  7: ["Promotional text (Apple)", 170],
  8: ["Keywords (Apple)", 100],
  9: ["Description (Apple)", 4000],
  10: ["Release notes (Apple)", 4000],
  11: ["App name (Play)", 30],
  12: ["Short description (Play)", 80],
  13: ["Play search paragraph", null],
};

const src = fs.readFileSync(FILE, "utf8");

// Fenced blocks with no language tag are the copy-paste fields. The bash block
// at the end of the file is tagged, so it is skipped.
const blocks = [...src.matchAll(/^```\r?\n([\s\S]*?)^```/gm)].map((m) =>
  m[1].replace(/\r/g, "").trim(),
);

let failed = 0;

blocks.forEach((text, i) => {
  const n = i + 1;
  const [label, limit] = LIMITS[n] || [`block ${n}`, null];
  const used = [...text].length;
  if (limit === null) {
    console.log(`  ${String(n).padStart(2)}  ${used.toString().padStart(4)}        ${label}`);
    return;
  }
  const over = used > limit;
  if (over) failed++;
  console.log(
    `${over ? "!!" : "ok"}  ${String(n).padStart(2)}  ` +
      `${used.toString().padStart(4)} / ${String(limit).padEnd(4)}  ${label}`,
  );
});

// Play pastes the description and the search paragraph into one field.
const playFull = blocks[8] && blocks[12] ? [...blocks[8]].length + 2 + [...blocks[12]].length : 0;
if (playFull) {
  const over = playFull > 4000;
  if (over) failed++;
  console.log(
    `${over ? "!!" : "ok"}   -  ${playFull.toString().padStart(4)} / 4000  Full description (Play) = 9 + 13`,
  );
}

console.log(
  failed ? `\n${failed} field(s) OVER the limit.` : "\nAll fields within limits.",
);
process.exit(failed ? 1 : 0);
