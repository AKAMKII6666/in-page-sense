import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON, stubRect, stubViewport } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("BLOCKED_OUTSIDE_ROOT", () => {
  it("root 为子树且外部全屏挡层存在时，不把层下 id 当可点菜单", async () => {
    stubViewport(1000, 800);
    mount(`
      <div id="app">
        ${PAGE_TITLE_NODE}
        ${SAVE_BUTTON}
      </div>
      <div id="chrome" style="position:fixed; z-index:50;"></div>
    `);

    const chrome = document.getElementById("chrome");
    const app = document.getElementById("app");
    expect(chrome).not.toBeNull();
    expect(app).not.toBeNull();
    if (chrome) {
      stubRect(chrome, { left: 0, top: 0, width: 1000, height: 800 });
    }

    const snap = await createSense({ root: app! }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.code).toBe("BLOCKED_OUTSIDE_ROOT");
    expect(snap.playables).toEqual([]);
  });
});
