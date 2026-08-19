import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("playable 扫描", () => {
  it("缺 desc 的节点不进菜单、不抛错", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <button
        data-e2e-kind="playable"
        data-e2e-id="broken"
        data-e2e-event="click"
        data-e2e-title="Broken"
      >Broken</button>
      <button
        data-e2e-kind="playable"
        data-e2e-id="ok"
        data-e2e-event="click"
        data-e2e-title="Ok"
        data-e2e-desc="Fine"
      >Ok</button>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables.map((item) => item.id)).toEqual(["ok"]);
  });

  it("未写 kind 但有 data-e2e-event 视为 playable", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <button
        data-e2e-id="implicit"
        data-e2e-event="click"
        data-e2e-title="Implicit"
        data-e2e-desc="No kind"
      >Go</button>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables[0]?.id).toBe("implicit");
  });

  it("enabled 读内层 button 的 disabled，不读 contents 包装", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div
        data-e2e-kind="playable"
        data-e2e-id="wrapped"
        data-e2e-event="click"
        data-e2e-title="Wrapped"
        data-e2e-desc="Inner disabled"
      >
        <button disabled>Save</button>
      </div>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables[0]?.enabled).toBe(false);
  });

  it("aria-disabled 与 loading 视为不可操作", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <button
        data-e2e-kind="playable"
        data-e2e-id="busy"
        data-e2e-event="click"
        data-e2e-title="Busy"
        data-e2e-desc="Loading"
        aria-busy="true"
      >Busy</button>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables[0]?.enabled).toBe(false);
  });
});
