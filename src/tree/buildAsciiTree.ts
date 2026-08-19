/**
 * 模块名称：tree/buildAsciiTree
 * 模块说明：浅字符树：只保留合同节点与推断 [row]，匿名壳连续塌掉。树按 DOM/stacking 编，不按业务父组件假挂。
 */

import { toTreeWalkRoot } from "../dom";
import type {
  ICollectedStackingLayer,
  IScanMarkers,
  IScannedPlayable,
  ITreeNode,
} from "../internal-types";

function isRowElement(element: Element): boolean {
  if (element.tagName === "TR") {
    return true;
  }
  if (element.getAttribute("role") === "row") {
    return true;
  }
  return false;
}

function stackingByElement(
  layers: ICollectedStackingLayer[],
): Map<Element, ICollectedStackingLayer> {
  const map = new Map<Element, ICollectedStackingLayer>();
  for (const layer of layers) {
    map.set(layer.element, layer);
  }
  return map;
}

function expandedByElement(expanded: IScannedPlayable[]): Map<Element, IScannedPlayable> {
  const map = new Map<Element, IScannedPlayable>();
  for (const item of expanded) {
    map.set(item.element, item);
  }
  return map;
}

function collectChildNodes(
  parent: ParentNode,
  markers: IScanMarkers,
  stackingMap: Map<Element, ICollectedStackingLayer>,
  expandedMap: Map<Element, IScannedPlayable>,
): ITreeNode[] {
  const nodes: ITreeNode[] = [];
  for (const child of parent.children) {
    const fromChild = nodesFromElement(child, markers, stackingMap, expandedMap);
    for (const node of fromChild) {
      nodes.push(node);
    }
  }
  return nodes;
}

function nodesFromElement(
  element: Element,
  markers: IScanMarkers,
  stackingMap: Map<Element, ICollectedStackingLayer>,
  expandedMap: Map<Element, IScannedPlayable>,
): ITreeNode[] {
  const stacking = stackingMap.get(element);
  const marker = markers.byElement.get(element);
  const expanded = expandedMap.get(element);
  const children = collectChildNodes(element, markers, stackingMap, expandedMap);

  // 同一节点既是 stacking 又是点位时，树上必须留下 playable/content/region/island id
  // （id 同一套）；该层仍在 stacking[] 里，不必用 stacking 节点把点位盖掉。
  if (marker) {
    return [
      {
        kind: marker.kind,
        id: marker.record.id,
        label: marker.record.id,
        stackingCover: undefined,
        children,
        element,
      },
    ];
  }

  if (expanded) {
    return [
      {
        kind: "playable",
        id: expanded.id,
        label: expanded.title,
        stackingCover: undefined,
        children,
        element,
      },
    ];
  }

  if (stacking) {
    return [
      {
        kind: "stacking",
        id: stacking.regionId,
        label: stacking.regionId ?? stacking.position,
        stackingCover: stacking.cover,
        children,
        element,
      },
    ];
  }

  if (isRowElement(element)) {
    if (children.length === 0) {
      return [];
    }
    return [
      {
        kind: "row",
        id: undefined,
        label: undefined,
        stackingCover: undefined,
        children,
        element,
      },
    ];
  }

  // 匿名无合同节点塌掉，子孙提升，避免 Polarise 壳出现在浅树上。
  return children;
}

/**
 * partial 抽屉置顶：仍出全页列表，只把 partial stacking 节点排到森林前面认路。
 */
function orderForest(nodes: ITreeNode[]): ITreeNode[] {
  const partial: ITreeNode[] = [];
  const rest: ITreeNode[] = [];

  for (const node of nodes) {
    if (node.kind === "stacking" && node.stackingCover === "partial") {
      partial.push(node);
    } else {
      rest.push(node);
    }
  }

  return [...partial, ...rest];
}

function formatNode(node: ITreeNode, indent: string): string[] {
  const lines: string[] = [];
  lines.push(`${indent}${formatLine(node)}`);
  const childIndent = `${indent}  `;
  for (const child of node.children) {
    const childLines = formatNode(child, childIndent);
    for (const line of childLines) {
      lines.push(line);
    }
  }
  return lines;
}

function formatLine(node: ITreeNode): string {
  if (node.kind === "row") {
    return "[row]";
  }

  if (node.kind === "stacking") {
    const cover = node.stackingCover ?? "corner";
    if (node.id) {
      return `[stacking#${node.id} cover=${cover}]`;
    }
    return `[stacking cover=${cover}]`;
  }

  if (node.id) {
    return `[${node.kind}#${node.id}]`;
  }

  return `[${node.kind}]`;
}

export interface IBuildAsciiTreeArgs {
  root: Document | ShadowRoot | Element;
  markers: IScanMarkers;
  stacking: ICollectedStackingLayer[];
  expandedPlayables: IScannedPlayable[];
  /** 焦点层收口时只编该层子树。 */
  closeTo: Element | null;
}

/**
 * 产出浅 ascii 树。id 格式 `[playable#id]` / `[content#id]`，供契约测与 Agent 认路。
 */
export function buildAsciiTree(args: IBuildAsciiTreeArgs): string {
  const stackingMap = stackingByElement(args.stacking);
  const expandedMap = expandedByElement(args.expandedPlayables);

  const walkRoot: ParentNode = args.closeTo ?? toTreeWalkRoot(args.root);
  const forest = collectChildNodes(walkRoot, args.markers, stackingMap, expandedMap);

  // closeTo 自身若是 stacking / region，应作为树根出现，而不是只露出子孙。
  let roots = forest;
  if (args.closeTo) {
    const selfNodes = nodesFromElement(
      args.closeTo,
      args.markers,
      stackingMap,
      expandedMap,
    );
    if (selfNodes.length > 0) {
      roots = selfNodes;
    }
  } else {
    roots = orderForest(forest);
  }

  if (roots.length === 0) {
    return "";
  }

  const lines: string[] = [];
  for (const node of roots) {
    const nodeLines = formatNode(node, "");
    for (const line of nodeLines) {
      lines.push(line);
    }
  }
  return lines.join("\n");
}
