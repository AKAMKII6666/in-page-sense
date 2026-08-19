/**
 * 模块名称：tests/helpers/dom
 * 模块说明：jsdom 夹具与几何 stub。cover 单测必须 stub 盒子，因为 jsdom 没有真实布局。
 */

export function mount(html: string): HTMLElement {
  document.body.innerHTML = html;
  return document.body;
}

export function stubViewport(width: number, height: number): void {
  Object.defineProperty(window, "innerWidth", { value: width, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: height, configurable: true });
}

export function stubRect(
  element: Element,
  rect: { left: number; top: number; width: number; height: number },
): void {
  const right = rect.left + rect.width;
  const bottom = rect.top + rect.height;
  element.getBoundingClientRect = function getBoundingClientRect(): DOMRect {
    return {
      x: rect.left,
      y: rect.top,
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
      right,
      bottom,
      toJSON() {
        return {};
      },
    } as DOMRect;
  };
}

export function extractKindIds(asciiTree: string, kind: "playable" | "content"): string[] {
  const ids: string[] = [];
  const pattern = new RegExp(`\\[${kind}#([^\\]]+)\\]`, "g");
  let match = pattern.exec(asciiTree);
  while (match) {
    const id = match[1];
    if (id) {
      ids.push(id);
    }
    match = pattern.exec(asciiTree);
  }
  return ids;
}

export const PAGE_TITLE_NODE = `<div hidden data-e2e-pagetitle="ready-list"></div>`;

export const SAVE_BUTTON = `
<button
  data-e2e-kind="playable"
  data-e2e-id="save"
  data-e2e-event="click"
  data-e2e-title="Save"
  data-e2e-desc="Save the row"
>Save</button>
`;

export const STATUS_CONTENT = `
<span data-e2e-kind="content" data-e2e-id="status" data-e2e-title="Status">Idle</span>
`;
