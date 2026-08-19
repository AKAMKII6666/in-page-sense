/**
 * 模块名称：scan/readContentText
 * 模块说明：content 文本走 innerText 并截断；禁止把 innerHTML 当对外字段。
 */

import { readInnerText, truncateText } from "../dom";

export function readContentText(element: Element, maxChars: number): string {
  const raw = readInnerText(element);
  const result = truncateText(raw, maxChars);
  return result.text;
}
