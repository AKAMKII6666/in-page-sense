import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { extractKindIds, mount, PAGE_TITLE_NODE } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

const ISLAND_SLOTS = {
  "list-pagination": {
    slots: {
      next: { by: "aria-label" as const, name: "Next" },
      prev: { by: "role-name" as const, role: "button", name: "Previous" },
    },
  },
};

describe("岛展开", () => {
  it("合成 id 写入 playables 与树，且同一套", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button aria-label="Next">Next</button>
        <button role="button">Previous</button>
      </div>
    `);

    const snap = await createSense({
      root: document,
      islandSlots: ISLAND_SLOTS,
    }).snapshot();

    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }

    const ids = snap.playables.map((item) => item.id).sort();
    expect(ids).toEqual(["list-pagination:next", "list-pagination:prev"]);
    expect(extractKindIds(snap.asciiTree, "playable").sort()).toEqual(ids);
    expect(snap.asciiTree).toContain("[island#list-pagination]");
  });

  it("无 islandSlots 时岛只在树上出现，不展开合成 playable", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button aria-label="Next">Next</button>
      </div>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables).toEqual([]);
    expect(snap.asciiTree).toContain("[island#list-pagination]");
    expect(snap.asciiTree).not.toContain("[playable#list-pagination:next]");
  });

  it("找不到的槽位不进列表", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button aria-label="Next">Next</button>
      </div>
    `);

    const snap = await createSense({
      root: document,
      islandSlots: ISLAND_SLOTS,
    }).snapshot();

    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables.map((item) => item.id)).toEqual(["list-pagination:next"]);
  });

  it("排除 id 以 Measurer 结尾的测量节点", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button id="TabsMeasurer" aria-label="Next">measure</button>
        <button aria-label="Next">real</button>
      </div>
    `);

    const snap = await createSense({
      root: document,
      islandSlots: {
        "list-pagination": {
          slots: {
            next: { by: "aria-label", name: "Next" },
          },
        },
      },
    }).snapshot();

    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables).toHaveLength(1);
    expect(snap.playables[0]?.title).toBe("next");
  });
});
