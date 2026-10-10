// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { shapeArabicRow } from "./terminal-arabic";

function row(parts: string[]): HTMLElement {
  const element = document.createElement("div");
  for (const text of parts) {
    const cell = document.createElement("span");
    cell.textContent = text;
    cell.getBoundingClientRect = () => ({ width: text.length * 8 }) as DOMRect;
    element.appendChild(cell);
  }
  return element;
}

describe("Arabic terminal display", () => {
  it("shapes split Arabic cells in one browser run without changing the text or adjacent columns", () => {
    const line = row(["❯ ", "م", "ن", " ", "أ", "ن", "ت", "؟", " │"]);
    const original = line.textContent;
    shapeArabicRow(line);
    const group = line.querySelector<HTMLElement>(".hermes-arabic-run")!;
    expect(group.textContent).toBe("من أنت؟");
    expect(group.dir).toBe("auto");
    expect(group.style.width).toBe("56px");
    expect(line.textContent).toBe(original);
    expect(line.firstElementChild?.textContent).toBe("❯ ");
    expect(line.lastElementChild?.textContent).toBe(" │");
    shapeArabicRow(line);
    expect(line.querySelectorAll(".hermes-arabic-run")).toHaveLength(1);
  });

  it("keeps mixed text and the editing cursor inside the shaping run, leaving Latin-only rows untouched", () => {
    const line = row(["❯ ", "مرحبا ", "Hermes 4B", " بالعربية", " "]);
    line.lastElementChild!.classList.add("xterm-cursor");
    shapeArabicRow(line);
    expect(line.querySelector(".hermes-arabic-run .xterm-cursor")).not.toBeNull();
    expect(line.textContent).toBe("❯ مرحبا Hermes 4B بالعربية ");
    const english = row(["❯ ", "Hello Hermes"]);
    shapeArabicRow(english);
    expect(english.children).toHaveLength(2);
  });
});
