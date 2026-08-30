// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("@/components/ui/query-select", async () => {
  const { createElement: element } = await import("react");
  type MockProps = {
    items: Array<{ value: string; label: string }>;
    onValueChange: (item: { value: string; label: string }) => void;
    disabled?: boolean;
    "aria-label"?: string;
  };
  return {
    SearchSelect: (props: MockProps) => element("button", {
      type: "button",
      disabled: props.disabled || props.items.length === 0,
      onClick: () => props.onValueChange(props.items[0]!),
    }, props["aria-label"]),
  };
});

import { PreferenceManager } from "@/components/my-forest/preference-manager";

const speciesOptions = [{ value: "boletus-edulis", label: "Cep", detail: "Boletus edulis" }];
const territoryOptions = [{ value: "ripolles", label: "Ripollès", detail: "comarca" }];

describe("El meu bosc preference manager", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    refresh.mockReset();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  async function renderManager() {
    await act(async () => root.render(createElement(PreferenceManager, {
      initial: { speciesIds: [], territorySlugs: [] },
      speciesOptions,
      territoryOptions,
    })));
  }

  it("persists a picked species immediately and confirms the save", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      speciesIds: ["boletus-edulis"],
      territorySlugs: [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    await renderManager();

    const picker = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Afegeix una espècie")!;
    await act(async () => {
      picker.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(JSON.parse(String(fetchMock.mock.calls[0]![1]?.body))).toEqual({
      speciesIds: ["boletus-edulis"],
      territorySlugs: [],
    });
    expect(container.textContent).toContain("Canvis desats.");
    expect(container.textContent).toContain("Boletus edulis");
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("rolls back an optimistic chip and explains a failed save", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(
      { error: "La sessió ha caducat." },
      { status: 401 },
    )));
    await renderManager();

    const picker = [...container.querySelectorAll("button")]
      .find((button) => button.textContent === "Afegeix una espècie")!;
    await act(async () => {
      picker.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(container.textContent).toContain("La sessió ha caducat.");
    expect(container.textContent).not.toContain("Boletus edulis");
    expect(refresh).not.toHaveBeenCalled();
  });
});
