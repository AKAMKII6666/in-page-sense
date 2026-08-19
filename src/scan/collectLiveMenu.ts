/**
 * 模块名称：scan/collectLiveMenu
 * 模块说明：与 snapshot 同一套现读扫描：pagetitle、岛展开、焦点层收口。供 snapshot 与 resolve 共用。
 */

import type {
  ICollectedStackingLayer,
  IScanMarkers,
  IScannedContent,
  IScannedIsland,
  IScannedPlayable,
  IScannedRegion,
} from "../internal-types";
import type { ICreateSenseOptions } from "../types";
import { collectMarkers } from "./collectMarkers";
import { expandIslands } from "./expandIslands";
import { readPageTitle } from "./readPageTitle";
import { collectStacking, pickBlockingLayer } from "../tree/collectStacking";
import { isBlockedOutsideRoot } from "../tree/outsideRoot";

export interface ILiveMenuScan {
  /** 本帧现读的 pagetitle；空/缺失为 null（degenerate）。 */
  pageTitle: string | null;
  /** 挡层在扫描根之外时为 true；此时不得把层下 id 当可点。 */
  outsideRoot: boolean;
  /** root 内点位（尚未按焦点层收口）。 */
  markers: IScanMarkers;
  /** 岛槽位展开结果（尚未按焦点层收口）。 */
  expanded: IScannedPlayable[];
  /** stacking 收入；无挡层时仍可能非空。 */
  stacking: ICollectedStackingLayer[];
  /** cover=most 且拦住指针的收口层；无则 null。 */
  blockingLayer: ICollectedStackingLayer | null;
}

function isInside(layer: Element, node: Element): boolean {
  if (layer === node) {
    return true;
  }
  return layer.contains(node);
}

/**
 * 把点位收到某一 stacking 层子树内（Portal 子节点按 DOM contains）。
 */
export function filterMarkersToLayer(markers: IScanMarkers, layer: Element): IScanMarkers {
  const playables = markers.playables.filter(function (item: IScannedPlayable): boolean {
    return isInside(layer, item.element);
  });
  const contents = markers.contents.filter(function (item: IScannedContent): boolean {
    return isInside(layer, item.element);
  });
  const islands = markers.islands.filter(function (item: IScannedIsland): boolean {
    return isInside(layer, item.element);
  });
  const regions = markers.regions.filter(function (item: IScannedRegion): boolean {
    return isInside(layer, item.element);
  });
  const byElement = new Map(markers.byElement);
  return { playables, contents, islands, regions, byElement };
}

/**
 * 把岛展开 playable 收到某一 stacking 层子树内。
 */
export function filterExpandedToLayer(
  expanded: IScannedPlayable[],
  layer: Element,
): IScannedPlayable[] {
  return expanded.filter(function (item: IScannedPlayable): boolean {
    return isInside(layer, item.element);
  });
}

/**
 * 现读一帧菜单扫描。pageTitle 不缓存。outsideRoot 时调用方不得把层下 id 当可点。
 */
export function scanLiveMenu(
  root: Document | ShadowRoot | Element,
  options: ICreateSenseOptions | undefined,
  contentTextChars: number,
): ILiveMenuScan {
  const pageTitle = readPageTitle(root);
  const emptyMarkers: IScanMarkers = {
    playables: [],
    contents: [],
    islands: [],
    regions: [],
    byElement: new Map(),
  };

  if (pageTitle === null) {
    return {
      pageTitle: null,
      outsideRoot: false,
      markers: emptyMarkers,
      expanded: [],
      stacking: [],
      blockingLayer: null,
    };
  }

  if (isBlockedOutsideRoot(root)) {
    return {
      pageTitle,
      outsideRoot: true,
      markers: emptyMarkers,
      expanded: [],
      stacking: [],
      blockingLayer: null,
    };
  }

  const markers = collectMarkers(root, contentTextChars);
  const expanded = expandIslands(markers.islands, options?.islandSlots);
  const stacking = collectStacking(root);
  const blockingLayer = pickBlockingLayer(stacking);

  return {
    pageTitle,
    outsideRoot: false,
    markers,
    expanded,
    stacking,
    blockingLayer,
  };
}

/**
 * 当前自主菜单里的 playable（含岛展开）。与 snapshot().playables 同一套 id。
 * degenerate / OUTSIDE_ROOT / 空挡层 → []。
 */
export function livePlayables(menu: ILiveMenuScan): IScannedPlayable[] {
  if (menu.pageTitle === null || menu.outsideRoot) {
    return [];
  }

  if (menu.blockingLayer) {
    const closedMarkers = filterMarkersToLayer(menu.markers, menu.blockingLayer.element);
    const closedExpanded = filterExpandedToLayer(menu.expanded, menu.blockingLayer.element);
    return [...closedMarkers.playables, ...closedExpanded];
  }

  return [...menu.markers.playables, ...menu.expanded];
}
