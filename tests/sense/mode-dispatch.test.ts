import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE, SAVE_BUTTON, STATUS_CONTENT } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("pagetitle 分流", () => {
  it("有非空 pagetitle 时走 autonomous", async () => {
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.pageTitle).toBe("ready-list");
    expect(snap.view).toBe("page");
    expect(snap.code).toBeNull();
    expect(snap.playables.map((item) => item.id)).toEqual(["save"]);
  });

  it("无 pagetitle 时走 degenerate，且没有 playables", async () => {
    mount(SAVE_BUTTON);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("degenerate");
    if (snap.mode !== "degenerate") {
      return;
    }
    expect(snap.pageTitle).toBeNull();
    expect(snap.generic.scope).toBe("root");
    expect("playables" in snap).toBe(false);
  });

  it("pagetitle 为空字符串时走 degenerate", async () => {
    mount(`<div hidden data-e2e-pagetitle="  "></div>${SAVE_BUTTON}`);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("degenerate");
  });

  it("第一个 pagetitle 为空时不采用后面的非空值", async () => {
    mount(`
      <div hidden data-e2e-pagetitle=""></div>
      <div hidden data-e2e-pagetitle="ready-list"></div>
      ${SAVE_BUTTON}
    `);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("degenerate");
  });

  it("有 pagetitle 但零点位仍是 autonomous，不是 degenerate", async () => {
    mount(PAGE_TITLE_NODE);
    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables).toEqual([]);
    expect(snap.contents).toEqual([]);
  });
});

describe("pageTitle 现读", () => {
  it("两次 snapshot 之间改隐藏节点，第二次跟新值", async () => {
    mount(`${PAGE_TITLE_NODE}${STATUS_CONTENT}`);
    const sense = createSense({ root: document });

    const first = await sense.snapshot();
    expect(first.mode).toBe("autonomous");
    if (first.mode === "autonomous") {
      expect(first.pageTitle).toBe("ready-list");
    }

    const node = document.querySelector("[data-e2e-pagetitle]");
    expect(node).not.toBeNull();
    node?.setAttribute("data-e2e-pagetitle", "dashboard-v2");

    const second = await sense.snapshot();
    expect(second.mode).toBe("autonomous");
    if (second.mode === "autonomous") {
      expect(second.pageTitle).toBe("dashboard-v2");
    }
  });

  it("第二次去掉 pagetitle 则退化为 degenerate", async () => {
    mount(`${PAGE_TITLE_NODE}${SAVE_BUTTON}`);
    const sense = createSense({ root: document });
    const first = await sense.snapshot();
    expect(first.mode).toBe("autonomous");

    document.querySelector("[data-e2e-pagetitle]")?.remove();
    const second = await sense.snapshot();
    expect(second.mode).toBe("degenerate");
  });
});
