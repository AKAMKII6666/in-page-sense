import { afterEach, describe, expect, it } from "vitest";
import { suspendBackdropFilter } from "../../src/screenshot/suspendBackdropFilter";

afterEach(() => {
  document.head
    .querySelectorAll("style[data-e2e-sense-suspend-backdrop]")
    .forEach((node) => node.remove());
  document.body.innerHTML = "";
});

describe("suspendBackdropFilter", () => {
  it("注入后去掉，restore 后样式节点消失", () => {
    document.body.innerHTML = `<div class="glass" style="backdrop-filter: blur(18px)">x</div>`;
    const restore = suspendBackdropFilter(document);
    const style = document.head.querySelector(
      "style[data-e2e-sense-suspend-backdrop]",
    );
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain("backdrop-filter: none");

    restore();
    expect(
      document.head.querySelector("style[data-e2e-sense-suspend-backdrop]"),
    ).toBeNull();
  });

  it("重复挂起不叠第二份 style", () => {
    const first = suspendBackdropFilter(document);
    const second = suspendBackdropFilter(document);
    expect(
      document.head.querySelectorAll("style[data-e2e-sense-suspend-backdrop]")
        .length,
    ).toBe(1);
    second();
    expect(
      document.head.querySelector("style[data-e2e-sense-suspend-backdrop]"),
    ).not.toBeNull();
    first();
    expect(
      document.head.querySelector("style[data-e2e-sense-suspend-backdrop]"),
    ).toBeNull();
  });
});
