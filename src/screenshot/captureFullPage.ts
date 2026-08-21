/**
 * 模块名称：captureFullPage
 * 模块说明：modern-screenshot 整页 CSS scale=1；失败抛错由上层收成双 null。
 */

import { domToPng } from "modern-screenshot";
import { ownerDocumentOf, toScopeElement } from "../dom";
import type { ISenseScreenshot } from "../types";

function dataUrlToScreenshot(dataUrl: string): ISenseScreenshot {
  const match = /^data:(image\/(?:png|jpeg));base64,(.+)$/i.exec(dataUrl);
  const mimeRaw = match?.[1];
  const bytesBase64 = match?.[2];
  if (!mimeRaw || !bytesBase64 || bytesBase64.length === 0) {
    throw new Error("unexpected_screenshot_data_url");
  }
  const mime = mimeRaw.toLowerCase() === "image/jpeg" ? "image/jpeg" : "image/png";
  return {
    mime,
    width: 0,
    height: 0,
    bytesBase64,
  };
}

/** 从 Image 读出宽高并填回 screenshot。 */
export function fillScreenshotNaturalSize(
  shot: ISenseScreenshot,
  width: number,
  height: number,
): ISenseScreenshot {
  return {
    ...shot,
    width,
    height,
  };
}

/**
 * 对本 frame documentElement 整页截取。
 * 宽高在 decode 后由调用方填入（或 annotate 时读取）。
 */
export async function captureFullPageCss(
  root: Document | ShadowRoot | Element,
): Promise<ISenseScreenshot> {
  const doc = ownerDocumentOf(root);
  if (!doc?.documentElement) {
    throw new Error("no_document");
  }

  const dataUrl = await domToPng(doc.documentElement, {
    scale: 1,
  });

  if (typeof dataUrl !== "string" || !dataUrl.startsWith("data:")) {
    throw new Error("capture_failed");
  }

  return dataUrlToScreenshot(dataUrl);
}

/** 宿主覆盖：调用注入回调，作用域为 root 对应 Element。 */
export async function captureViaInject(
  root: Document | ShadowRoot | Element,
  captureScreenshot: (scope: Element) => Promise<ISenseScreenshot>,
): Promise<ISenseScreenshot> {
  return await captureScreenshot(toScopeElement(root));
}
