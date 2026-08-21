import { describe, expect, it } from "vitest";
import {
  formatCurrentViewLabel,
  readCurrentView,
} from "../../src/screenshot/readCurrentView";
import { stubViewport } from "../helpers/dom";

describe("formatCurrentViewLabel", () => {
  it("固定文案格式", () => {
    expect(
      formatCurrentViewLabel({
        scrollTop: 10,
        scrollLeft: 20,
        width: 1200,
        height: 800,
      }),
    ).toBe("scrollTop:10px;scrollLeft:20px;width:1200px;height:800px");
  });
});

describe("readCurrentView", () => {
  it("读 scroll 与 inner 尺寸", () => {
    stubViewport(1200, 800);
    Object.defineProperty(window, "pageXOffset", {
      value: 40,
      configurable: true,
    });
    Object.defineProperty(window, "pageYOffset", {
      value: 50,
      configurable: true,
    });
    const view = readCurrentView(document);
    expect(view).toEqual({
      scrollTop: 50,
      scrollLeft: 40,
      width: 1200,
      height: 800,
    });
  });
});
