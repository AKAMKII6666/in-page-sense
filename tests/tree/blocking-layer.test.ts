import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { extractKindIds, mount, PAGE_TITLE_NODE, SAVE_BUTTON, stubRect, stubViewport } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("焦点层收口", () => {
  it("cover=most 时层外 id 不出现在 playables / 树操作节点", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      ${SAVE_BUTTON}
      <div id="overlay" style="position:fixed; z-index:20;">
        <button
          data-e2e-kind="playable"
          data-e2e-id="dialog-ok"
          data-e2e-event="click"
          data-e2e-title="OK"
          data-e2e-desc="Confirm"
        >OK</button>
      </div>
    `);

    const overlay = document.getElementById("overlay");
    expect(overlay).not.toBeNull();
    if (overlay) {
      stubRect(overlay, { left: 0, top: 0, width: 1000, height: 800 });
    }

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }

    expect(snap.view).toBe("blocking-layer");
    expect(snap.blocking).not.toBeNull();
    expect(snap.playables.map((item) => item.id)).toEqual(["dialog-ok"]);
    expect(extractKindIds(snap.asciiTree, "playable")).toEqual(["dialog-ok"]);
    expect(snap.asciiTree).not.toContain("[playable#save]");
    expect(snap.fallback).toBeNull();
  });

  it("cover=partial 不收口，仍出全页列表", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      ${SAVE_BUTTON}
      <aside id="drawer" style="position:fixed; z-index:5;"></aside>
    `);

    const drawer = document.getElementById("drawer");
    expect(drawer).not.toBeNull();
    if (drawer) {
      stubRect(drawer, { left: 700, top: 0, width: 300, height: 400 });
    }

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.view).toBe("page");
    expect(snap.playables.map((item) => item.id)).toContain("save");
    expect(snap.stacking.some((layer) => layer.cover === "partial")).toBe(true);
  });

  it("整页 relative+z-index 壳不收口，仍是 view=page", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      <div id="app" style="position:relative; z-index:1;">
        ${SAVE_BUTTON}
      </div>
    `);

    const app = document.getElementById("app");
    expect(app).not.toBeNull();
    if (app) {
      stubRect(app, { left: 0, top: 0, width: 1000, height: 800 });
    }

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.view).toBe("page");
    expect(snap.blocking).toBeNull();
    expect(snap.playables.map((item) => item.id)).toEqual(["save"]);
    expect(snap.stacking.some((layer) => layer.position === "relative")).toBe(true);
  });

  it("pointer-events:none 的全屏层不收口", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      ${SAVE_BUTTON}
      <div id="veil" style="position:fixed; z-index:40; pointer-events:none;"></div>
    `);

    const veil = document.getElementById("veil");
    expect(veil).not.toBeNull();
    if (veil) {
      stubRect(veil, { left: 0, top: 0, width: 1000, height: 800 });
    }

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.view).toBe("page");
    expect(snap.playables.map((item) => item.id)).toEqual(["save"]);
  });
});
