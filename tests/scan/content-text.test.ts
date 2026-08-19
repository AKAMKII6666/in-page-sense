import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { mount, PAGE_TITLE_NODE } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("content 文本", () => {
  it("超长 innerText 被截断到配额", async () => {
    const longText = "a".repeat(250);
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="content" data-e2e-id="blob" data-e2e-title="Blob">${longText}</div>
    `);

    const snap = await createSense({
      root: document,
      quotas: { contentTextChars: 200 },
    }).snapshot();

    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.contents[0]?.text).toHaveLength(200);
  });
});

describe("禁止 innerHTML", () => {
  it("对外 text 来自 innerText，不含标签", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <div data-e2e-kind="content" data-e2e-id="html" data-e2e-title="Html"><b>Hello</b> world</div>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.contents[0]?.text).toBe("Hello world");
    expect(snap.contents[0]?.text.includes("<b>")).toBe(false);
  });

  it("content 路径不把 innerHTML 当作对外字段", async () => {
    const reads: string[] = [];
    const descriptor = Object.getOwnPropertyDescriptor(Element.prototype, "innerHTML");
    expect(descriptor?.get).toBeTypeOf("function");

    const originalGet = descriptor?.get;
    Object.defineProperty(Element.prototype, "innerHTML", {
      configurable: true,
      get() {
        reads.push("innerHTML");
        return originalGet?.call(this) ?? "";
      },
      set(value: string) {
        descriptor?.set?.call(this, value);
      },
    });

    try {
      mount(`
        ${PAGE_TITLE_NODE}
        <div data-e2e-kind="content" data-e2e-id="probe" data-e2e-title="Probe">Plain</div>
      `);
      const snap = await createSense({ root: document }).snapshot();
      expect(snap.mode).toBe("autonomous");
      expect(reads).toEqual([]);
    } finally {
      if (descriptor) {
        Object.defineProperty(Element.prototype, "innerHTML", descriptor);
      }
    }
  });
});
