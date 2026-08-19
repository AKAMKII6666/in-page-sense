/**
 * 模块名称：quotas
 * 模块说明：V1 默认配额与选项合并。超出则截断，不得为「完整」拉爆调用方上下文。
 */

import type { ICreateSenseOptions } from "./types";

export interface IResolvedQuotas {
  maxNodes: number;
  contentTextChars: number;
  a11yTextChars: number;
}

/** generic interactables 默认上限。 */
export const DEFAULT_MAX_NODES = 80;

/** content innerText 默认上限。 */
export const DEFAULT_CONTENT_TEXT_CHARS = 200;

/** generic a11yText 默认上限。 */
export const DEFAULT_A11Y_TEXT_CHARS = 4000;

/**
 * 合并调用方覆盖与库默认配额。
 */
export function resolveQuotas(options: ICreateSenseOptions | undefined): IResolvedQuotas {
  const overrides = options?.quotas;
  return {
    maxNodes: overrides?.maxNodes ?? DEFAULT_MAX_NODES,
    contentTextChars: overrides?.contentTextChars ?? DEFAULT_CONTENT_TEXT_CHARS,
    a11yTextChars: overrides?.a11yTextChars ?? DEFAULT_A11Y_TEXT_CHARS,
  };
}
