/** @vitest-environment jsdom */

import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useContributorMapAccess } from "@/components/use-contributor-map-access";

function AccessProbe() {
  const access = useContributorMapAccess();
  return createElement("span", null, access.checked ? (access.active ? "active" : "inactive") : "checking");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("contributor map access refresh", () => {
  it("refreshes immediately when the map window regains focus", async () => {
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
      .IS_REACT_ACT_ENVIRONMENT = true;
    const responses = [
      { authenticated: true, active: false, activeUntil: null, revokedAt: null },
      { authenticated: true, active: true, activeUntil: "2026-12-01T00:00:00.000Z", revokedAt: null },
    ];
    const fetchMock = vi.fn(async () => Response.json(responses.shift()));
    vi.stubGlobal("fetch", fetchMock);
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(createElement(AccessProbe));
    });
    expect(container.textContent).toBe("inactive");
    expect(fetchMock).toHaveBeenCalledOnce();

    await act(async () => {
      window.dispatchEvent(new Event("focus"));
    });
    expect(container.textContent).toBe("active");
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => root.unmount());
    container.remove();
  });
});
