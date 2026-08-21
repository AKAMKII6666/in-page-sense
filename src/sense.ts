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
import {
  captureDiagnostic,
  readDocumentBox,
} from "./screenshot/captureDiagnostic";
import {
  annotatePlayablesOnScreenshot,
  type IAnnotatePlayableMark,
} from "./screenshot/annotatePlayables";
import { buildAsciiTree } from "./tree/buildAsciiTree";
import type {
  ICreateSenseOptions,
  ISense,
  ISenseAutonomousSnapshot,
  ISensePlayableItem,
  ISenseScreenshot,
  ISenseSnapshotOptions,
  ISenseStackingLayer,
  TSenseSnapshot,
} from "./types";

function resolveRoot(options: ICreateSenseOptions | undefined): Document | ShadowRoot | Element {
  if (options?.root) {
    return options.root;
  }
  return document;
}

function toPlayableItem(
  record: IScannedPlayable,
  withBox: boolean,
): ISensePlayableItem {
  const item: ISensePlayableItem = {
    id: record.id,
    event: record.event,
    title: record.title,
    desc: record.desc,
    enabled: record.enabled,
  };
  if (withBox) {
    const box = readDocumentBox(record.element);
    if (box) {
      item.box = box;
    }
  }
  return item;
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

function attachBoxesToProjected(
  playables: ISensePlayableItem[],
  root: Document | ShadowRoot | Element,
  quotas: ReturnType<typeof resolveQuotas>,
): ISensePlayableItem[] {
  const collected = collectGenericElements({ scopeRoot: root, quotas });
  return playables.map((item) => {
    const el = elementForGenericRef(collected, item.id);
    if (!el) {
      return item;
    }
    const box = readDocumentBox(resolveAimElement(el) ?? el);
    if (!box) {
      return item;
    }
    return { ...item, box };
  });
}

function syncGenericScreenshot(
  snap: TSenseSnapshot,
  screenshot: ISenseScreenshot | null,
): void {
  if (snap.mode === "degenerate") {
    snap.generic.screenshot = screenshot;
    return;
  }
  if (snap.fallback) {
    snap.fallback.screenshot = screenshot;
  }
}

async function attachDiagnosticImage(
  snap: TSenseSnapshot,
  root: Document | ShadowRoot | Element,
  createOptions: ICreateSenseOptions | undefined,
  quotas: ReturnType<typeof resolveQuotas>,
  annotatePlayables: boolean,
): Promise<TSenseSnapshot> {
  const diagnostic = await captureDiagnostic({
    root,
    captureScreenshot: createOptions?.captureScreenshot,
  });

  snap.screenshot = diagnostic.screenshot;
  snap.currentView = diagnostic.currentView;
  syncGenericScreenshot(snap, diagnostic.screenshot);

  if (diagnostic.screenshot && diagnostic.currentView) {
    if (snap.mode === "degenerate") {
      snap.playables = attachBoxesToProjected(snap.playables, root, quotas);
    }
    // autonomous playables already got boxes at build time when withBox=true

    if (annotatePlayables) {
      const marks: IAnnotatePlayableMark[] = [];
      for (const item of snap.playables) {
        if (item.box) {
          marks.push({
            id: item.id,
            title: item.title,
            box: item.box,
          });
        }
      }
      if (marks.length > 0) {
        try {
          const burned = await annotatePlayablesOnScreenshot(
            diagnostic.screenshot,
            marks,
          );
          snap.screenshot = burned;
          syncGenericScreenshot(snap, burned);
        } catch {
          // 点位标注失败不抹掉已成功的视口诊断图
        }
      }
    }
  }

  return snap;
}

/**
 * 创建感知实例。options 在每次 snapshot / resolve 时读取；pageTitle 不在这里缓存。
 */
export function createSense(options?: ICreateSenseOptions): ISense {
  const quotas = resolveQuotas(options);

  async function snapshot(
    snapshotOptions?: ISenseSnapshotOptions,
  ): Promise<TSenseSnapshot> {
    const wantImage = snapshotOptions?.image === true;
    const root = resolveRoot(options);
    const capturedAt = Date.now();
    const viewport = readViewport(root);
    const menu = scanLiveMenu(root, options, quotas.contentTextChars);

    let snap: TSenseSnapshot;

    if (menu.pageTitle === null) {
      const generic = await buildGenericFallback({
        scopeRoot: root,
        scope: "root",
        quotas,
      });

      snap = {
        mode: "degenerate",
        pageTitle: null,
        capturedAt,
        viewport,
        playables: projectGenericToPlayables(generic.interactables),
        generic,
      };
    } else if (menu.outsideRoot) {
      snap = {
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
    } else {
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

        snap = {
          mode: "autonomous",
          pageTitle: menu.pageTitle,
          capturedAt,
          viewport,
          view: "page",
          code: null,
          playables: playables.map((record) => toPlayableItem(record, wantImage)),
          contents: menu.markers.contents.map(toContentItem),
          asciiTree,
          stacking: menu.stacking.map(toPublicStacking),
          blocking: null,
          fallback: null,
        };
      } else {
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
          });

          snap = {
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
        } else {
          snap = {
            mode: "autonomous",
            pageTitle: menu.pageTitle,
            capturedAt,
            viewport,
            view: "blocking-layer",
            code: null,
            playables: closedPlayables.map((record) =>
              toPlayableItem(record, wantImage),
            ),
            contents: closedMarkers.contents.map(toContentItem),
            asciiTree,
            stacking: menu.stacking.map(toPublicStacking),
            blocking,
            fallback: null,
          };
        }
      }
    }

    if (!wantImage) {
      return snap;
    }

    return attachDiagnosticImage(
      snap,
      root,
      options,
      quotas,
      snapshotOptions?.annotatePlayables === true,
    );
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
