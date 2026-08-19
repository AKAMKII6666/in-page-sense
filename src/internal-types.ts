/**
 * 模块名称：internal-types
 * 模块说明：扫描与编树过程中的库内结构；可保留 Element 引用，不对外导出。
 */

import type { TCover, TPlayableEvent, TStackingPosition } from "./types";

export type TMarkerKind = "playable" | "island" | "content" | "region";

export interface IScannedPlayable {
  id: string;
  event: TPlayableEvent;
  title: string;
  desc: string;
  enabled: boolean;
  element: Element;
}

export interface IScannedContent {
  id: string;
  title: string;
  text: string;
  element: Element;
}

export interface IScannedIsland {
  id: string;
  element: Element;
}

export interface IScannedRegion {
  id: string;
  title: string | null;
  element: Element;
}

export interface IScanMarkers {
  playables: IScannedPlayable[];
  contents: IScannedContent[];
  islands: IScannedIsland[];
  regions: IScannedRegion[];
  byElement: Map<Element, TInternalMarker>;
}

export type TInternalMarker =
  | { kind: "playable"; record: IScannedPlayable }
  | { kind: "content"; record: IScannedContent }
  | { kind: "island"; record: IScannedIsland }
  | { kind: "region"; record: IScannedRegion };

export interface ICollectedStackingLayer {
  element: Element;
  position: TStackingPosition;
  zIndex: number;
  cover: TCover;
  width: number;
  height: number;
  regionId: string | undefined;
  /** 计算 pointer-events 后，该层会拦住指针。 */
  blocksPointer: boolean;
}

export type TTreeKind = "region" | "playable" | "content" | "island" | "row" | "stacking";

export interface ITreeNode {
  kind: TTreeKind;
  id: string | undefined;
  label: string | undefined;
  stackingCover: TCover | undefined;
  children: ITreeNode[];
  element: Element;
}
