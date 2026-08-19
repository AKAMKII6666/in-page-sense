import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON, stubRect, stubViewport } from "../helpers/dom";

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

const WRAPPER_SAVE = `
<div
  data-e2e-kind="playable"
  data-e2e-id="save"
  data-e2e-event="click"
  data-e2e-title="Save"
  data-e2e-desc="Save the row"
>
  <button type="button" id="inner-save">Save</button>
</div>
`;

describe("resolve(id)", () => {
  it("叶子包装解析到内层 button，而不是 contents 包装", () => {
    mount(`${PAGE_TITLE_NODE}${WRAPPER_SAVE}`);
    const sense = createSense({ root: document });
    const aimed = sense.resolve("save");
    const inner = document.getElementById("inner-save");
    expect(aimed).toBe(inner);
    expect(aimed?.getAttribute("data-e2e-id")).toBeNull();
  });

  it("叶子自身就是控件时返回该节点", () => {
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const aimed = createSense({ root: document }).resolve("save");
    expect(aimed).toBe(document.querySelector("[data-e2e-id='save']"));
  });

  it("岛合成 id 解析到槽位元素", () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button aria-label="Next" id="next-btn">Next</button>
        <button role="button">Previous</button>
      </div>
    `);

    const aimed = createSense({
      root: document,
      islandSlots: ISLAND_SLOTS,
    }).resolve("list-pagination:next");

    expect(aimed).toBe(document.getElementById("next-btn"));
  });

  it("全屏挡层下底下的 save 为 null，层内 id 仍可解析", () => {
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

    const sense = createSense({ root: document });
    expect(sense.resolve("save")).toBeNull();
    expect(sense.resolve("dialog-ok")).toBe(document.querySelector("[data-e2e-id='dialog-ok']"));
  });

  it("空挡层 / generic g0 均为 null", async () => {
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

    const sense = createSense({ root: document });
    const snap = await sense.snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.code).toBe("BLOCKED_NO_PLAYABLE");
    const genericRef = snap.fallback?.interactables[0]?.ref;
    expect(genericRef).toBeTruthy();

    expect(sense.resolve("save")).toBeNull();
    expect(sense.resolve(genericRef ?? "g0")).toBeNull();
  });

  it("degenerate 时叶子 id 为 null", () => {
    mount(SAVE_BUTTON);
    expect(createSense({ root: document }).resolve("save")).toBeNull();
  });

  it("BLOCKED_OUTSIDE_ROOT 时层下 id 为 null", () => {
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

    expect(createSense({ root: app! }).resolve("save")).toBeNull();
  });

  it("空 id / 未知 id 为 null", () => {
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const sense = createSense({ root: document });
    expect(sense.resolve("")).toBeNull();
    expect(sense.resolve("   ")).toBeNull();
    expect(sense.resolve("not-on-page")).toBeNull();
  });

  it("重复 id 取列表第一个（DOM playables 先于岛展开）", () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <button
        data-e2e-kind="playable"
        data-e2e-id="dup"
        data-e2e-event="click"
        data-e2e-title="First"
        data-e2e-desc="First copy"
        id="first-dup"
      >First</button>
      <button
        data-e2e-kind="playable"
        data-e2e-id="dup"
        data-e2e-event="click"
        data-e2e-title="Second"
        data-e2e-desc="Second copy"
        id="second-dup"
      >Second</button>
    `);

    expect(createSense({ root: document }).resolve("dup")).toBe(
      document.getElementById("first-dup"),
    );
  });

  it("snapshot 菜单里的每个 id 都能 resolve 到非 null", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      ${WRAPPER_SAVE}
      <div data-e2e-kind="island" data-e2e-id="list-pagination">
        <button aria-label="Next">Next</button>
      </div>
    `);

    const sense = createSense({
      root: document,
      islandSlots: ISLAND_SLOTS,
    });
    const snap = await sense.snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }

    expect(snap.playables.map((item) => item.id)).toEqual(["save", "list-pagination:next"]);
    for (const item of snap.playables) {
      expect(sense.resolve(item.id)).not.toBeNull();
    }
  });
});
