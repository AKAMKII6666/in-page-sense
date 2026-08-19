import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON, stubRect, stubViewport } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("空挡层", () => {
  it("BLOCKED_NO_PLAYABLE 时 playables 为空、fallback 非空，generic ref 不在 playables", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      ${SAVE_BUTTON}
      <div id="overlay" style="position:fixed; z-index:40;">
        <button type="button">Close</button>
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

    expect(snap.code).toBe("BLOCKED_NO_PLAYABLE");
    expect(snap.view).toBe("blocking-layer");
    expect(snap.playables).toEqual([]);
    expect(snap.contents).toEqual([]);
    expect(snap.fallback).not.toBeNull();
    expect(snap.fallback?.kind).toBe("generic");
    expect(snap.fallback?.scope).toBe("blocking-layer");
    expect(snap.fallback?.interactables.length).toBeGreaterThan(0);

    const refs = new Set((snap.fallback?.interactables ?? []).map((item) => item.ref));
    for (const playable of snap.playables) {
      expect(refs.has(playable.id)).toBe(false);
    }
  });
});

describe("截图", () => {
  it("未注入 captureScreenshot 时 screenshot 为 null", async () => {
    mount(`<button type="button">X</button>`);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.generic.screenshot).toBeNull();
  });

  it("captureScreenshot 抛错时 screenshot 为 null，a11y 仍给", async () => {
    mount(`<button type="button">Still here</button>`);
    const snap = await createSense({
      root: document,
      captureScreenshot: async () => {
        throw new Error("canvas failed");
      },
    }).snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.generic.screenshot).toBeNull();
    expect(snap.generic.a11yText.length).toBeGreaterThan(0);
  });

  it("注入成功时带上 screenshot", async () => {
    mount(`<button type="button">X</button>`);
    const snap = await createSense({
      root: document,
      captureScreenshot: async () => {
        return {
          mime: "image/png",
          width: 1,
          height: 1,
          bytesBase64: "AA==",
        };
      },
    }).snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.generic.screenshot?.bytesBase64).toBe("AA==");
  });
});

describe("截断配额", () => {
  it("generic maxNodes 触达时 truncated 为 true", async () => {
    mount(`
      <button type="button">A</button>
      <button type="button">B</button>
      <button type="button">C</button>
    `);

    const snap = await createSense({
      root: document,
      quotas: { maxNodes: 2 },
    }).snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.generic.nodeCount).toBe(2);
    expect(snap.generic.maxNodes).toBe(2);
    expect(snap.generic.truncated).toBe(true);
  });

  it("a11yText 超长时截断且 truncated 为 true", async () => {
    mount(`<button type="button">Hello world from the page</button>`);

    const snap = await createSense({
      root: document,
      quotas: { a11yTextChars: 8 },
    }).snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.generic.a11yText).toHaveLength(8);
    expect(snap.generic.truncated).toBe(true);
  });
});
