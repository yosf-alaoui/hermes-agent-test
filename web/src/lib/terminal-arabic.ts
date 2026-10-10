import type { Terminal } from "@xterm/xterm";

const ARABIC = /\p{Script=Arabic}/u;

/** Keep xterm's logical buffer intact; let the browser shape the visual run. */
export function shapeArabicRow(row: HTMLElement): void {
  if (row.querySelector(".hermes-arabic-run")) return;
  const cells = Array.from(row.children) as HTMLElement[];
  const first = cells.findIndex((cell) => ARABIC.test(cell.textContent ?? ""));
  if (first < 0) return;
  let last = first;
  for (let i = first + 1; i < cells.length; i += 1) {
    if (ARABIC.test(cells[i].textContent ?? "")) last = i;
  }
  // Keep punctuation, numbers, Latin words and the cursor in the same bidi
  // paragraph. Stop at terminal borders or padding between separate columns.
  while (cells[last + 1]) {
    const next = cells[last + 1];
    const text = next.textContent ?? "";
    if (!next.classList.contains("xterm-cursor") && /[\u2500-\u257f]|\s{2,}/u.test(text)) break;
    last += 1;
  }
  const run = cells.slice(first, last + 1);
  const width = run.reduce((sum, cell) => sum + cell.getBoundingClientRect().width, 0);
  const group = row.ownerDocument.createElement("span");
  group.className = "hermes-arabic-run";
  group.dir = "auto";
  group.style.width = `${width}px`;
  group.style.letterSpacing = "0";
  group.style.whiteSpace = "pre";
  group.style.textAlign = "start";
  group.style.fontFamily = "Arial, Tahoma, sans-serif";
  row.insertBefore(group, run[0]);
  for (const cell of run) {
    // Inline text shares shaping across style/cursor boundaries. The group
    // reserves the original grid width so adjacent terminal columns stay put.
    cell.style.setProperty("display", "inline", "important");
    cell.style.letterSpacing = "0";
    group.appendChild(cell);
  }
}

export function installArabicTerminalShaping(term: Terminal, host: HTMLElement): () => void {
  const listener = term.onRender(({ start, end }) => {
    const rows = host.querySelectorAll<HTMLElement>(".xterm-rows > div");
    for (let i = start; i <= end; i += 1) {
      if (rows[i]) shapeArabicRow(rows[i]);
    }
  });
  return () => listener.dispose();
}
