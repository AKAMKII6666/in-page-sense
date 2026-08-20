/**
 * 模块名称：sense
 * 模块说明：门面：现读 pagetitle 分流，再扫点位 / stacking / generic。不写 DOM、不派发事件。
 */

import { readViewport } from "./dom";
import { buildGenericFallback } from "./generic/buildGenericFallback";
import {
  collectGenericElements,
  elementForGenericRef,
} from "./generic/collectGenericElements";
import { projectGenericToPlayables } from "./generic/projectPlayables";
import type { ICollectedStackingLayer, IScannedContent, IScannedPlayable } from "./internal-types";
import { resolveQuotas } from "./quotas";
import { resolveAimElement } from "./scan/aimControl";
import {
  filterExpandedToLayer,
  filterMarkersToLayer,
  livePlayables,
  scanLiveMenu,
} from "./scan/collectLiveMenu";
import { buildAsciiTree } from "./tree/buildAsciiTree";
import type {
  ICreateSenseOptions,
  ISense,
  ISenseAutonomousSnapshot,
  ISensePlayableItem,
  ISenseStackingLayer,
  TSenseSnapshot,
} from "./types";

function resolveRoot(options: ICreateSenseOptions | undefined): Document | ShadowRoot | Element {
  if (options?.root) {
    return options.root;
  }
  return document;
}

function toPlayableItem(record: IScannedPlayable): ISensePlayableItem {
  return {
    id: record.id,
    event: record.event,
    title: record.title,
    desc: record.desc,
    enabled: record.enabled,
  };
}

function toContentItem(record: IScannedContent): ISenseAutonomousSnapshot["contents"][number] {
  return {
    id: record.id,
    title: record.title,
    text: record.text,
  };
}

function toPublicStacking(layer: ICollectedStackingLayer): ISenseStackingLayer {
  const publicLayer: ISenseStackingLayer = {
    position: layer.position,
    zIndex: layer.zIndex,
    cover: layer.cover,
    width: layer.width,
    height: layer.height,
  };
  if (layer.regionId) {
    publicLayer.regionId = layer.regionId;
  }
  return publicLayer;
}

/**
 * 创建感知实例。options 在每次 snapshot / resolve 时读取；pageTitle 不在这里缓存。
 */
export function createSense(options?: ICreateSenseOptions): ISense {
  const quotas = resolveQuotas(options);

  async function snapshot(): Promise<TSenseSnapshot> {
    const root = resolveRoot(options);
    const capturedAt = Date.now();
    const viewport = readViewport(root);
    const menu = scanLiveMenu(root, options, quotas.contentTextChars);

    if (menu.pageTitle === null) {
      const generic = await buildGenericFallback({
        scopeRoot: root,
        scope: "root",
        quotas,
        captureScreenshot: options?.captureScreenshot,
      });

      return {
        mode: "degenerate",
        pageTitle: null,
        capturedAt,
        viewport,
        playables: projectGenericToPlayables(generic.interactables),
        generic,
      };
    }

    if (menu.outsideRoot) {
      // 挡层在扫描根之外：本 root 菜单点不到，禁止把层下 id 当可点菜单。
      return {
        mode: "autonomous",
        pageTitle: menu.pageTitle,
        capturedAt,
        viewport,
        view: "page",
        code: "BLOCKED_OUTSIDE_ROOT",
        playables: [],
        contents: [],
        asciiTree: "",
        stacking: [],
        blocking: null,
        fallback: null,
      };
    }

    const blockingLayer = menu.blockingLayer;

    if (!blockingLayer) {
      const playables = livePlayables(menu);
      const asciiTree = buildAsciiTree({
        root,
        markers: menu.markers,
        stacking: menu.stacking,
        expandedPlayables: menu.expanded,
        closeTo: null,
      });

      return {
        mode: "autonomous",
        pageTitle: menu.pageTitle,
        capturedAt,
        viewport,
        view: "page",
        code: null,
        playables: playables.map(toPlayableItem),
        contents: menu.markers.contents.map(toContentItem),
        asciiTree,
        stacking: menu.stacking.map(toPublicStacking),
        blocking: null,
        fallback: null,
      };
    }

    const closedMarkers = filterMarkersToLayer(menu.markers, blockingLayer.element);
    const closedExpanded = filterExpandedToLayer(menu.expanded, blockingLayer.element);
    const closedPlayables = livePlayables(menu);

    const asciiTree = buildAsciiTree({
      root,
      markers: closedMarkers,
      stacking: menu.stacking,
      expandedPlayables: closedExpanded,
      closeTo: blockingLayer.element,
    });

    const blocking = {
      cover: "most" as const,
      position: blockingLayer.position,
      zIndex: blockingLayer.zIndex,
      playableCount: closedPlayables.length,
    };

    if (closedPlayables.length === 0) {
      const fallback = await buildGenericFallback({
        scopeRoot: blockingLayer.element,
        scope: "blocking-layer",
        quotas,
        captureScreenshot: options?.captureScreenshot,
      });

      return {
        mode: "autonomous",
        pageTitle: menu.pageTitle,
        capturedAt,
        viewport,
        view: "blocking-layer",
        code: "BLOCKED_NO_PLAYABLE",
        playables: [],
        contents: [],
        asciiTree,
        stacking: menu.stacking.map(toPublicStacking),
        blocking,
        fallback,
      };
    }

    return {
      mode: "autonomous",
      pageTitle: menu.pageTitle,
      capturedAt,
      viewport,
      view: "blocking-layer",
      code: null,
      playables: closedPlayables.map(toPlayableItem),
      contents: closedMarkers.contents.map(toContentItem),
      asciiTree,
      stacking: menu.stacking.map(toPublicStacking),
      blocking,
      fallback: null,
    };
  }

  function resolve(id: string): Element | null {
    const trimmed = id.trim();
    if (!trimmed) {
      return null;
    }

    const root = resolveRoot(options);
    const menu = scanLiveMenu(root, options, quotas.contentTextChars);

    if (menu.pageTitle === null) {
      if (!/^g\d+$/.test(trimmed)) {
        return null;
      }
      const collected = collectGenericElements({ scopeRoot: root, quotas });
      const element = elementForGenericRef(collected, trimmed);
      if (!element) {
        return null;
      }
      return resolveAimElement(element);
    }

    const playables = livePlayables(menu);

    for (const record of playables) {
      if (record.id === trimmed) {
        return resolveAimElement(record.element);
      }
    }

    return null;
  }

  return { snapshot, resolve };
}
