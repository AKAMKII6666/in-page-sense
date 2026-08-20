/**
 * 模块名称：generic/buildGenericFallback
 * 模块说明：退化 / 空挡层附件：配额内 interactables + 浅 a11yText + 可选截图。
 */

import { toScopeElement, truncateText } from "../dom";
import type { ISenseGenericFallback, ISenseScreenshot } from "../types";
import type { IResolvedQuotas } from "../quotas";
import { collectGenericElements } from "./collectGenericElements";

async function captureOrNull(
  captureScreenshot: ((scope: Element) => Promise<ISenseScreenshot>) | undefined,
  scope: Element,
): Promise<ISenseScreenshot | null> {
  if (!captureScreenshot) {
    return null;
  }

  try {
    return await captureScreenshot(scope);
  } catch {
    // 拍失败不得假装已看见图像；a11y 仍给。
    return null;
  }
}

/**
 * 在 scopeRoot 内做配额 generic 扫描。scope 只用于回包字段，不扩大查询。
 */
export async function buildGenericFallback(args: {
  scopeRoot: Document | ShadowRoot | Element;
  scope: "blocking-layer" | "root";
  quotas: IResolvedQuotas;
  captureScreenshot: ((scope: Element) => Promise<ISenseScreenshot>) | undefined;
}): Promise<ISenseGenericFallback> {
  const collected = collectGenericElements({
    scopeRoot: args.scopeRoot,
    quotas: args.quotas,
  });

  const a11yLines: string[] = [];
  for (const item of collected.interactables) {
    let line = `${item.role} "${item.name}"`;
    if (item.disabled) {
      line = `${line} disabled`;
    }
    if (item.value !== undefined) {
      line = `${line} value="${item.value}"`;
    }
    a11yLines.push(line);
  }

  const joined = a11yLines.join("\n");
  const textResult = truncateText(joined, args.quotas.a11yTextChars);

  const screenshot = await captureOrNull(
    args.captureScreenshot,
    toScopeElement(args.scopeRoot),
  );

  return {
    kind: "generic",
    scope: args.scope,
    truncated: collected.truncatedByNodes || textResult.truncated,
    nodeCount: collected.interactables.length,
    maxNodes: args.quotas.maxNodes,
    interactables: collected.interactables,
    a11yText: textResult.text,
    screenshot,
  };
}
