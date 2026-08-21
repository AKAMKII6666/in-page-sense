import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatPlayableAnnotateLabel,
} from "../../src/screenshot/annotatePlayables";
import { createSense } from "in-page-sense";
import * as annotatePlayablesMod from "../../src/screenshot/annotatePlayables";
import * as annotateViewport from "../../src/screenshot/annotateViewport";
import {
  mount,
  PAGE_TITLE_NODE,
  SAVE_BUTTON,
  stubRect,
  stubViewport,
} from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

const TINY_PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

describe("formatPlayableAnnotateLabel", () => {
  it("returns integer index as string", () => {
    expect(
      formatPlayableAnnotateLabel({
        index: 0,
        box: { x: 10, y: 20, w: 30, h: 40 },
      }),
    ).toBe("0");
    expect(
      formatPlayableAnnotateLabel({
        index: 12,
        box: { x: 1, y: 2, w: 3, h: 4 },
      }),
    ).toBe("12");
  });
});

describe("snapshot annotatePlayables 开关", () => {
  it("image:true 默认不调用 annotatePlayables、无 annotateIndex", async () => {
    stubViewport(800, 600);
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2000,
    });
    const root = mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const btn = root.querySelector("[data-e2e-id=save]");
    if (btn) {
      stubRect(btn, { left: 10, top: 20, width: 80, height: 24 });
    }

    const spy = vi
      .spyOn(annotatePlayablesMod, "annotatePlayablesOnScreenshot")
      .mockImplementation(async (base) => base);
    vi.spyOn(annotateViewport, "annotateViewportOnScreenshot").mockImplementation(
      async (base) => base,
    );

    const snap = await createSense({
      root: document,
      captureScreenshot: async () => ({
        mime: "image/png",
        width: 800,
        height: 2000,
        bytesBase64: TINY_PNG_B64,
      }),
    }).snapshot({ image: true });

    expect(spy).not.toHaveBeenCalled();
    if (snap.mode === "autonomous") {
      expect(snap.playables[0]?.annotateIndex).toBeUndefined();
    }
  });

  it("image+annotatePlayables 烧录编号并回填 annotateIndex", async () => {
    stubViewport(800, 600);
    Object.defineProperty(document.documentElement, "scrollWidth", {
      configurable: true,
      get: () => 800,
    });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      configurable: true,
      get: () => 2000,
    });
    const root = mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const btn = root.querySelector("[data-e2e-id=save]");
    if (btn) {
      stubRect(btn, { left: 10, top: 20, width: 80, height: 24 });
    }

    const spy = vi
      .spyOn(annotatePlayablesMod, "annotatePlayablesOnScreenshot")
      .mockImplementation(async (base) => ({
        ...base,
        bytesBase64: "annotated",
      }));
    vi.spyOn(annotateViewport, "annotateViewportOnScreenshot").mockImplementation(
      async (base) => base,
    );

    const snap = await createSense({
      root: document,
      captureScreenshot: async () => ({
        mime: "image/png",
        width: 800,
        height: 2000,
        bytesBase64: TINY_PNG_B64,
      }),
    }).snapshot({ image: true, annotatePlayables: true });

    expect(snap.screenshot).not.toBeNull();
    expect(spy).toHaveBeenCalled();
    const marks = spy.mock.calls[0]?.[1] as {
      index: number;
      box: { x: number; y: number; w: number; h: number };
    }[];
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]?.index).toBe(0);
    expect(formatPlayableAnnotateLabel(marks[0]!)).toBe("0");
    expect(snap.screenshot?.bytesBase64).toBe("annotated");
    if (snap.mode === "autonomous") {
      const save = snap.playables.find((p) => p.id === "save");
      expect(save?.annotateIndex).toBe(0);
      expect(save?.box).toBeTruthy();
    }
  });

  it("双 null 时不调用 annotatePlayables、无 annotateIndex", async () => {
    stubViewport(800, 600);
    const root = mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const btn = root.querySelector("[data-e2e-id=save]");
    if (btn) {
      stubRect(btn, { left: 10, top: 20, width: 80, height: 24 });
    }
    const spy = vi.spyOn(
      annotatePlayablesMod,
      "annotatePlayablesOnScreenshot",
    );

    const snap = await createSense({
      root: document,
      captureScreenshot: async () => {
        throw new Error("boom");
      },
    }).snapshot({ image: true, annotatePlayables: true });

    expect(spy).not.toHaveBeenCalled();
    if (snap.mode === "autonomous") {
      expect(snap.playables[0]?.annotateIndex).toBeUndefined();
    }
  });
});
