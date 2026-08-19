import { afterEach, describe, expect, it } from "vitest";
import { createSense } from "in-page-sense";
import { extractKindIds, mount, PAGE_TITLE_NODE, SAVE_BUTTON, STATUS_CONTENT, stubRect, stubViewport } from "../helpers/dom";

afterEach(() => {
  document.body.innerHTML = "";
});

describe("id 同一套", () => {
  it("树中 playable/content id 都能在数组里找到，反之亦然", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <section data-e2e-kind="region" data-e2e-id="main">
        <div class="polarise-shell">
          <div class="another-shell">
            ${SAVE_BUTTON}
            ${STATUS_CONTENT}
          </div>
        </div>
      </section>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }

    const treePlayables = extractKindIds(snap.asciiTree, "playable");
    const treeContents = extractKindIds(snap.asciiTree, "content");
    expect(treePlayables.sort()).toEqual(snap.playables.map((item) => item.id).sort());
    expect(treeContents.sort()).toEqual(snap.contents.map((item) => item.id).sort());
    expect(snap.asciiTree).toContain("[region#main]");
    expect(snap.asciiTree).not.toContain("polarise-shell");
  });

  it("推断 [row] 无 id、不进 playables", async () => {
    mount(`
      ${PAGE_TITLE_NODE}
      <table>
        <tr>
          <td>
            <button
              data-e2e-kind="playable"
              data-e2e-id="row-edit"
              data-e2e-event="click"
              data-e2e-title="Edit"
              data-e2e-desc="Edit row"
            >Edit</button>
          </td>
        </tr>
      </table>
    `);

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.asciiTree).toContain("[row]");
    expect(snap.asciiTree).toContain("[playable#row-edit]");
    expect(snap.playables.map((item) => item.id)).toEqual(["row-edit"]);
  });

  it("点位自身是 absolute 时树上仍有 playable id", async () => {
    stubViewport(1000, 800);
    mount(`
      ${PAGE_TITLE_NODE}
      <button
        id="fab"
        style="position:absolute; z-index:2;"
        data-e2e-kind="playable"
        data-e2e-id="fab"
        data-e2e-event="click"
        data-e2e-title="Fab"
        data-e2e-desc="Floating action"
      >+</button>
    `);

    const fab = document.getElementById("fab");
    expect(fab).not.toBeNull();
    if (fab) {
      stubRect(fab, { left: 900, top: 700, width: 48, height: 48 });
    }

    const snap = await createSense({ root: document }).snapshot();
    expect(snap.mode).toBe("autonomous");
    if (snap.mode !== "autonomous") {
      return;
    }
    expect(snap.playables.map((item) => item.id)).toEqual(["fab"]);
    expect(extractKindIds(snap.asciiTree, "playable")).toEqual(["fab"]);
    expect(snap.asciiTree).toContain("[playable#fab]");
  });
});
