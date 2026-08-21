/**
 * 模块名称：captureDiagnostic
 * 模块说明：image:true 管线 — 读 currentView → 底图 → 尺寸校验 → 标注 → DTO。
 */

import { ownerWindowOf } from "../dom";
import type { ISenseBox, ISenseCurrentView, ISenseScreenshot } from "../types";
import { annotateViewportOnScreenshot } from "./annotateViewport";
import {
  captureFullPageCss,
  captureViaInject,
  fillScreenshotNaturalSize,
} from "./captureFullPage";
import { readCurrentView, readDocumentCssSize } from "./readCurrentView";

/** base64 字符硬上限，超限双 null。约 9MB 量级。 */
export const MAX_SCREENSHOT_BASE64_CHARS = 12_000_000;

export interface IDiagnosticCaptureResult {
  screenshot: ISenseScreenshot | null;
  currentView: ISenseCurrentView | null;
}

function sizesMatch(
  shot: { width: number; height: number },
  expected: { width: number; height: number },
): boolean {
  // 允许 1px 舍入差（滚动条 / 亚像素）。
  return (
    Math.abs(shot.width - expected.width) <= 1 &&
    Math.abs(shot.height - expected.height) <= 1
  );
}

async function decodeNaturalSize(shot: ISenseScreenshot): Promise<ISenseScreenshot> {
  if (shot.width > 0 && shot.height > 0) {
    return shot;
  }
  return await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(
        fillScreenshotNaturalSize(
          shot,
          img.naturalWidth || img.width,
          img.naturalHeight || img.height,
        ),
      );
    };
    img.onerror = () => reject(new Error("image_decode_failed"));
    img.src = `data:${shot.mime};base64,${shot.bytesBase64}`;
  });
}

/**
 * 产出诊断图 + currentView；任一步失败 → 双 null。
 */
export async function captureDiagnostic(args: {
  root: Document | ShadowRoot | Element;
  captureScreenshot?: (scope: Element) => Promise<ISenseScreenshot>;
}): Promise<IDiagnosticCaptureResult> {
  const dualNull: IDiagnosticCaptureResult = {
    screenshot: null,
    currentView: null,
  };

  try {
    const currentView = readCurrentView(args.root);
    if (!currentView) {
      return dualNull;
    }

    const expectedSize = readDocumentCssSize(args.root);
    if (!expectedSize || expectedSize.width <= 0 || expectedSize.height <= 0) {
      return dualNull;
    }

    let base: ISenseScreenshot;
    const usedInject = Boolean(args.captureScreenshot);
    if (args.captureScreenshot) {
      base = await captureViaInject(args.root, args.captureScreenshot);
    } else {
      base = await captureFullPageCss(args.root);
    }

    base = await decodeNaturalSize(base);

    if (usedInject && !sizesMatch(base, expectedSize)) {
      // 注入底图与文档测量不符 → fail-closed，避免错位红框。
      return dualNull;
    }

    if (base.width <= 0 || base.height <= 0) {
      return dualNull;
    }

    const annotated = await annotateViewportOnScreenshot(base, currentView);
    if (annotated.bytesBase64.length > MAX_SCREENSHOT_BASE64_CHARS) {
      return dualNull;
    }

    return { screenshot: annotated, currentView };
  } catch {
    return dualNull;
  }
}

/** 元素文档坐标 box（与长图同系）。 */
export function readDocumentBox(element: Element): ISenseBox | undefined {
  const win = ownerWindowOf(element);
  if (!win) {
    return undefined;
  }
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 && rect.height <= 0) {
    return undefined;
  }
  return {
    x: rect.left + win.scrollX,
    y: rect.top + win.scrollY,
    w: rect.width,
    h: rect.height,
  };
}
