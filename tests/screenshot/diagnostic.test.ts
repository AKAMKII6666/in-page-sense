import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSense } from "in-page-sense";
import * as annotate from "../../src/screenshot/annotateViewport";
import { captureDiagnostic } from "../../src/screenshot/captureDiagnostic";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON, stubViewport } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

/** 1x1 PNG */
const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("snapshot image 按需", () => {
  it("默认 snapshot 无 screenshot / currentView", async () => {
    stubViewport(800, 600);
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.screenshot).toBeUndefined();
    expect(snap.currentView).toBeUndefined();
    if (snap.mode === "autonomous") {
      expect(snap.playables[0]?.box).toBeUndefined();
    }
  });

  it("image:true 且注入尺寸不符 → 双 null", async () => {
    stubViewport(800, 600);
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2000,
    });
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);

    const snap = await createSense({
      root: document,
      captureScreenshot: async () => ({
        mime: "image/png",
        width: 1,
        height: 1,
        bytesBase64: TINY_PNG_B64,
      }),
    }).snapshot({ image: true });

    expect(snap.screenshot).toBeNull();
    expect(snap.currentView).toBeNull();
  });

  it("image:true 注入抛错 → 双 null，菜单仍在", async () => {
    stubViewport(800, 600);
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);

    const snap = await createSense({
      root: document,
      captureScreenshot: async () => {
        throw new Error("boom");
      },
    }).snapshot({ image: true });

    expect(snap.mode).toBe("autonomous");
    expect(snap.screenshot).toBeNull();
    expect(snap.currentView).toBeNull();
    if (snap.mode === "autonomous") {
      expect(snap.playables.length).toBeGreaterThan(0);
    }
  });
});

describe("captureDiagnostic 成功路径（spy 标注）", () => {
  beforeEach(() => {
    vi.spyOn(annotate, "annotateViewportOnScreenshot").mockImplementation(
      async (base) => base,
    );
  });

  it("尺寸匹配时带上 screenshot 与 currentView", async () => {
    stubViewport(100, 50);
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      get: () => 1,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 1,
    });
    Object.defineProperty(window, "pageXOffset", {
      value: 2,
      configurable: true,
    });
    Object.defineProperty(window, "pageYOffset", {
      value: 3,
      configurable: true,
    });

    const result = await captureDiagnostic({
      root: document,
      captureScreenshot: async () => ({
        mime: "image/png",
        width: 1,
        height: 1,
        bytesBase64: TINY_PNG_B64,
      }),
    });

    expect(result.currentView).toEqual({
      scrollTop: 3,
      scrollLeft: 2,
      width: 100,
      height: 50,
    });
    expect(result.screenshot?.bytesBase64).toBe(TINY_PNG_B64);
    expect(result.screenshot?.width).toBe(1);
    expect(result.screenshot?.height).toBe(1);
  });
});
