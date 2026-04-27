#!/usr/bin/env node

import fs from "node:fs";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const targetPath = args.find((arg) => !arg.startsWith("--")) ?? "docs/PLAYGROUND_ROADMAP.md";

const tableHeader =
  "| Raw intake id | Status | Short name | Priority | Type | Owner lane | Notes / dependencies |\n" +
  "| --- | --- | --- | --- | --- | --- | --- |\n";

const priorityRank = new Map([
  ["🔴 Next", 0],
  ["🟠 High", 1],
  ["🔵 Low", 2],
  ["⚪ Optional", 3],
]);

const text = fs.readFileSync(targetPath, "utf8");
const headerStart = text.indexOf(tableHeader);

if (headerStart === -1) {
  throw new Error(`Could not find roadmap summary table in ${targetPath}`);
}

const rowsStart = headerStart + tableHeader.length;
const rowsEnd = text.indexOf("\n\n", rowsStart);

if (rowsEnd === -1) {
  throw new Error(`Could not find end of roadmap summary table in ${targetPath}`);
}

const rowsText = text.slice(rowsStart, rowsEnd);
const rows = rowsText
  .split("\n")
  .filter((row) => row.trim().startsWith("|"));

const sortedRows = [...rows].sort(compareRows);
const nextText = `${text.slice(0, rowsStart)}${sortedRows.join("\n")}${text.slice(rowsEnd)}`;

if (nextText === text) {
  process.exit(0);
}

if (checkOnly) {
  console.error(`${targetPath} summary table is not sorted`);
  process.exit(1);
}

fs.writeFileSync(targetPath, nextText);

function compareRows(left, right) {
  const leftPriority = rankPriority(cell(left, 4));
  const rightPriority = rankPriority(cell(right, 4));

  if (leftPriority !== rightPriority) {
    return leftPriority - rightPriority;
  }

  const leftId = parseRoadmapId(cell(left, 1));
  const rightId = parseRoadmapId(cell(right, 1));

  if (leftId.number !== rightId.number) {
    return leftId.number - rightId.number;
  }

  return leftId.suffix.localeCompare(rightId.suffix);
}

function cell(row, oneBasedIndex) {
  return row.split("|")[oneBasedIndex]?.trim() ?? "";
}

function rankPriority(priorityCell) {
  for (const [marker, rank] of priorityRank) {
    if (priorityCell.includes(marker)) {
      return rank;
    }
  }

  return Number.MAX_SAFE_INTEGER;
}

function parseRoadmapId(idCell) {
  const match = /RI-(\d+)([A-Z]*)/.exec(idCell);

  if (!match) {
    return { number: Number.MAX_SAFE_INTEGER, suffix: idCell };
  }

  return {
    number: Number.parseInt(match[1], 10),
    suffix: match[2] ?? "",
  };
}
