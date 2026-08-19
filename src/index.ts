/**
 * 模块名称：index
 * 模块说明：唯一公开 barrel。只导出 createSense 与快照 / resolve 合同类型。
 */

export { createSense } from "./sense";

export type {
  ICreateSenseOptions,
  IIslandSlotGroup,
  IIslandSlotLocator,
  IIslandSlotTable,
  ISense,
  ISenseAutonomousSnapshot,
  ISenseBlockingInfo,
  ISenseContentItem,
  ISenseDegenerateSnapshot,
  ISenseGenericFallback,
  ISenseGenericInteractable,
  ISensePlayableItem,
  ISenseQuotaOverrides,
  ISenseScreenshot,
  ISenseSnapshotMeta,
  ISenseStackingLayer,
  ISenseViewport,
  TCover,
  TPlayableEvent,
  TSenseAutonomousCode,
  TSenseSnapshot,
  TStackingPosition,
} from "./types";
