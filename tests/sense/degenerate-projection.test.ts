import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("degenerate projection", () => {
  it("无 pagetitle 页：playables 含 g0 且 resolve 命中 button", async () => {
    mount(`<button type="button" id="single-btn">Single</button>`);
    const sense = createSense({ root: document });
    const snap = await sense.snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }

    expect(snap.playables.map((item) => item.id)).toEqual(["g0"]);
    expect(snap.playables[0]?.event).toBe("click");
    expect(snap.playables[0]?.title).toBe("Single");
    expect(sense.resolve("g0")).toBe(document.getElementById("single-btn"));
  });

  it("有 pagetitle 页：run g0 resolve null", () => {
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const sense = createSense({ root: document });
    expect(sense.resolve("g0")).toBeNull();
  });

  it("disabled interactable：enabled false 且仍可 resolve", async () => {
    mount(`<button type="button" disabled id="off-btn">Off</button>`);
    const sense = createSense({ root: document });
    const snap = await sense.snapshot();

    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }

    expect(snap.playables[0]?.enabled).toBe(false);
    expect(sense.resolve("g0")).toBe(document.getElementById("off-btn"));
  });

  it("textbox 投影为 input event", async () => {
    mount(`<input type="text" aria-label="Name" id="name-field" />`);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.playables[0]?.event).toBe("input");
  });
});
