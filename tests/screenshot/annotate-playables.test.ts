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
  it("uses title when present; else id; rounds box", () => {
    expect(
      formatPlayableAnnotateLabel({
        id: "btn-a",
        title: "Save",
        box: { x: 10.4, y: 20.6, w: 30.2, h: 40.8 },
      }),
    ).toBe("Save x=10,y=21 30×41");
    expect(
      formatPlayableAnnotateLabel({
        id: "btn-a",
        title: "  ",
        box: { x: 1, y: 2, w: 3, h: 4 },
      }),
    ).toBe("btn-a x=1,y=2 3×4");
  });
});

describe("snapshot annotatePlayables 开关", () => {
  it("image:true 默认不调用 annotatePlayables", async () => {
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

    await createSense({
      root: document,
      captureScreenshot: async () => ({
        mime: "image/png",
        width: 800,
        height: 2000,
        bytesBase64: TINY_PNG_B64,
      }),
    }).snapshot({ image: true });

    expect(spy).not.toHaveBeenCalled();
  });

  it("image+annotatePlayables 成功图时调用 annotatePlayables", async () => {
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
      id: string;
      title: string;
      box: { x: number; y: number; w: number; h: number };
    }[];
    expect(marks.length).toBeGreaterThan(0);
    expect(marks[0]?.id).toBe("save");
    expect(marks[0]?.title).toBe("Save");
    expect(marks[0]?.box.w).toBeGreaterThan(0);
    expect(formatPlayableAnnotateLabel(marks[0]!)).toContain("Save");
    expect(snap.screenshot?.bytesBase64).toBe("annotated");
  });

  it("双 null 时不调用 annotatePlayables", async () => {
    stubViewport(800, 600);
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const spy = vi.spyOn(
      annotatePlayablesMod,
      "annotatePlayablesOnScreenshot",
    );

    await createSense({
      root: document,
      captureScreenshot: async () => {
        throw new Error("boom");
      },
    }).snapshot({ image: true, annotatePlayables: true });

    expect(spy).not.toHaveBeenCalled();
  });
});
