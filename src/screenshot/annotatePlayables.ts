/**
 * 模块名称：annotatePlayables
 * 模块说明：在诊断长图上为每个带 box 的 playable 画红框 + 黑底白字整数编号。
 */

import type { ISenseBox, ISenseScreenshot } from "../types";

const RED = "#ff0000";
const LABEL_BG = "#000000";
const LABEL_FG = "#ffffff";
const STROKE = 2;
const FONT = "12px monospace";
const PAD_X = 4;
const PAD_Y = 2;

export interface IAnnotatePlayableMark {
  /** 与回包 annotateIndex 一致的编号（从 0 起）。 */
  index: number;
  /** 文档坐标，与长图同系。 */
  box: ISenseBox;
}

function loadImage(bytesBase64: string, mime: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_decode_failed"));
    img.src = `data:${mime};base64,${bytesBase64}`;
  });
}

/** label：整数编号字符串。 */
export function formatPlayableAnnotateLabel(mark: IAnnotatePlayableMark): string {
  return String(mark.index);
}

/**
 * 烧录每个 playable 红框与编号 label；返回新 png。
 * 无效框跳过；不假画。
 */
export async function annotatePlayablesOnScreenshot(
  base: ISenseScreenshot,
  marks: readonly IAnnotatePlayableMark[],
): Promise<ISenseScreenshot> {
  const img = await loadImage(base.bytesBase64, base.mime);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;
  if (width <= 0 || height <= 0) {
    throw new Error("invalid_image_size");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("no_2d_context");
  }

  ctx.drawImage(img, 0, 0);
  ctx.font = FONT;
  ctx.textBaseline = "top";

  for (const mark of marks) {
    const box = mark.box;
    if (
      !Number.isFinite(box.x) ||
      !Number.isFinite(box.y) ||
      !Number.isFinite(box.w) ||
      !Number.isFinite(box.h) ||
      box.w <= 0 ||
      box.h <= 0
    ) {
      continue;
    }

    const rx = Math.max(0, Math.min(box.x, width - 1));
    const ry = Math.max(0, Math.min(box.y, height - 1));
    const rw = Math.max(1, Math.min(box.w, width - rx));
    const rh = Math.max(1, Math.min(box.h, height - ry));

    ctx.strokeStyle = RED;
    ctx.lineWidth = STROKE;
    ctx.strokeRect(rx + STROKE / 2, ry + STROKE / 2, rw - STROKE, rh - STROKE);

    const label = formatPlayableAnnotateLabel(mark);
    const metrics = ctx.measureText(label);
    const textW = Math.ceil(metrics.width);
    const textH = 12;
    const boxW = textW + PAD_X * 2;
    const boxH = textH + PAD_Y * 2;

    let lx = rx + STROKE;
    let ly = ry + STROKE;
    if (lx + boxW > width) {
      lx = Math.max(0, width - boxW);
    }
    if (ly + boxH > height) {
      ly = Math.max(0, height - boxH);
    }

    ctx.fillStyle = LABEL_BG;
    ctx.fillRect(lx, ly, boxW, boxH);
    ctx.fillStyle = LABEL_FG;
    ctx.fillText(label, lx + PAD_X, ly + PAD_Y);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const match = /^data:image\/png;base64,(.+)$/i.exec(dataUrl);
  const encoded = match?.[1];
  if (!encoded || encoded.length === 0) {
    throw new Error("annotate_playables_encode_failed");
  }

  return {
    mime: "image/png",
    width,
    height,
    bytesBase64: encoded,
  };
}
