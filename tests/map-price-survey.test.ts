/** @vitest-environment jsdom */
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const queue = vi.hoisted(() => vi.fn());
const route = vi.hoisted(() => ({ pathname: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => route.pathname }));
vi.mock("@/src/lib/umami-goals", async (original) => ({
  ...await original<typeof import("@/src/lib/umami-goals")>(),
  queueUmamiEvent: queue,
}));

let survey: typeof import("@/src/lib/map-price-survey");
let container: HTMLDivElement;
let root: Root;
let intersect: IntersectionObserverCallback;
const disconnect = vi.fn();
let savedAnswer: string | null;
const fetchReceipt = vi.fn();

beforeEach(async () => {
  vi.resetModules();
  route.pathname = "/";
  queue.mockClear();
  disconnect.mockClear();
  sessionStorage.clear();
  localStorage.clear();
  vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "test-website");
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  Object.defineProperty(navigator, "doNotTrack", { value: "0", configurable: true });
  vi.stubGlobal("IntersectionObserver", class {
    constructor(callback: IntersectionObserverCallback) { intersect = callback; }
    observe() {}
    unobserve() {}
    disconnect = disconnect;
  });
  savedAnswer = null;
  fetchReceipt.mockReset().mockImplementation(async (_url, options) => {
    if (options.method === "POST") savedAnswer ??= JSON.parse(options.body).answer;
    return Response.json({ answer: savedAnswer });
  });
  vi.stubGlobal("fetch", fetchReceipt);
  survey = await import("@/src/lib/map-price-survey");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("annual map price survey", () => {
  it("waits for a database receipt and permits retry after failure", async () => {
    fetchReceipt.mockImplementation(async (_url, options) => {
      if (options.method === "POST") return Response.json({ error: "Try again" }, { status: 503 });
      return Response.json({ answer: null });
    });
    await expect(survey.answerMapPriceSurvey("499")).rejects.toThrow("Try again");
    expect(survey.getMapPriceSurveyState()).toBe("opened");
    expect(survey.isMapPriceSurveyBannerHidden()).toBe(false);
    fetchReceipt.mockImplementation(async () => Response.json({ answer: "499" }));
    await survey.answerMapPriceSurvey("499");
    expect(survey.getMapPriceSurveyState()).toBe("499");
  });

  it("shares an in-flight submission and recovers a lost receipt without a second POST", async () => {
    const first = survey.answerMapPriceSurvey("299");
    const second = survey.answerMapPriceSurvey("999");
    expect(first).toBe(second);
    await Promise.all([first, second]);
    expect(savedAnswer).toBe("299");
    expect(fetchReceipt.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
    sessionStorage.clear();
    await survey.loadMapPriceSurvey();
    expect(survey.getMapPriceSurveyState()).toBe("299");
  });

  it("ignores old analytics-only answers and does not manufacture a receipt from local storage", async () => {
    sessionStorage.setItem("bolets:map-price-v7", "499");
    localStorage.setItem(`${survey.MAP_PRICE_SURVEY_KEY}:receipt`, "999");
    await survey.loadMapPriceSurvey();
    expect(survey.getMapPriceSurveyState()).toBe("");
    expect(survey.isMapPriceSurveyBannerHidden()).toBe(false);
  });
  it("keeps direct survey arrivals separate from banner exposure", async () => {
    await survey.answerMapPriceSurvey("299");
    expect(queue.mock.calls.map(([event]) => event)).toEqual([
      "map-price-v8-opened",
    ]);
    expect(survey.isMapPriceSurveyBannerHidden()).toBe(true);
  });

  it("shows the public banner and retains dismissal without recording an answer", async () => {
    const { MapPriceSurveyBanner } = await import("@/components/map-price-survey-banner");
    await act(async () => root.render(createElement(MapPriceSurveyBanner)));
    expect(container.querySelector("a")?.getAttribute("href")).toBe("/enquesta-mapa");
    expect(queue).not.toHaveBeenCalled();
    await act(async () => intersect([
      { isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry,
    ], {} as IntersectionObserver));
    expect(queue).toHaveBeenCalledExactlyOnceWith("map-price-v8-shown");
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("aside")).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--map-price-banner-height")).toBe("");
    expect(survey.getMapPriceSurveyState()).toBe("");
    await act(async () => root.render(null));
    route.pathname = "/map";
    await act(async () => root.render(createElement(MapPriceSurveyBanner)));
    expect(container.querySelector("aside")).toBeNull();
    expect(queue).toHaveBeenCalledOnce();
  });

  it.each(["/admin", "/compte/bosc", "/acces", "/troballes/nova", "/moderacio", "/enquesta-mapa"])("omits the banner on %s", async (pathname) => {
    route.pathname = pathname;
    const { MapPriceSurveyBanner } = await import("@/components/map-price-survey-banner");
    await act(async () => root.render(createElement(MapPriceSurveyBanner)));
    expect(container.querySelector("aside")).toBeNull();
    expect(queue).not.toHaveBeenCalled();
  });
  it.each(["299", "499", "999", "contribute", "no"] as const)("records %s once after ordered exposure and opening", async (answer) => {
    survey.clickMapPriceSurveyBanner();
    await survey.answerMapPriceSurvey(answer);
    await survey.answerMapPriceSurvey("no");
    survey.openMapPriceSurvey();
    survey.showMapPriceSurvey();
    expect(queue.mock.calls.map(([event]) => event)).toEqual([
      "map-price-v8-shown", "map-price-v8-clicked", "map-price-v8-opened",
    ]);
    expect(sessionStorage.getItem(survey.MAP_PRICE_SURVEY_KEY)).toBe(answer);
    expect(queue.mock.calls.every((args) => args.length === 1)).toBe(true);
  });

  it("restores an answer after a reload without recording another response", async () => {
    await survey.answerMapPriceSurvey("299");
    sessionStorage.clear();
    vi.resetModules();
    survey = await import("@/src/lib/map-price-survey");
    await survey.answerMapPriceSurvey("no");
    expect(survey.getMapPriceSurveyState()).toBe("299");
    expect(fetchReceipt.mock.calls.filter(([, options]) => options.method === "POST")).toHaveLength(1);
  });

  it("deduplicates in memory when browser storage is blocked", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    await expect(survey.answerMapPriceSurvey("299")).resolves.toBeUndefined();
    await survey.answerMapPriceSurvey("no");
    expect(survey.getMapPriceSurveyState()).toBe("299");
    expect(queue).not.toHaveBeenCalled();
  });

  it.each(["dnt", "disabled", "unconfigured"])("does not enqueue survey analytics when %s", async (mode) => {
    if (mode === "dnt") Object.defineProperty(navigator, "doNotTrack", { value: "1", configurable: true });
    if (mode === "disabled") localStorage.setItem("umami.disabled", "1");
    if (mode === "unconfigured") vi.stubEnv("NEXT_PUBLIC_UMAMI_WEBSITE_ID", "");
    await survey.answerMapPriceSurvey("499");
    expect(queue).not.toHaveBeenCalled();
    expect(survey.getMapPriceSurveyState()).toBe("499");
  });

  it("measures visible questions without inventing banner views and keeps responses accessible", async () => {
    const { MapPriceSurvey } = await import("@/components/map-price-survey");
    await act(async () => root.render(createElement(MapPriceSurvey)));
    expect(queue).not.toHaveBeenCalled();
    await act(async () => intersect([
      { isIntersecting: false, intersectionRatio: 0 } as IntersectionObserverEntry,
    ], {} as IntersectionObserver));
    expect(queue).not.toHaveBeenCalled();
    await act(async () => intersect([
      { isIntersecting: true, intersectionRatio: 1 } as IntersectionObserverEntry,
    ], {} as IntersectionObserver));
    expect(queue).toHaveBeenCalledExactlyOnceWith("map-price-v8-opened");
    expect(container.textContent).toContain("4,99 € / any");
    expect(container.textContent).toContain("Sense compte ni cobrament");
    await act(async () => container.querySelector("button")!.click());
    expect(container.querySelector("[role=status]")?.textContent).toContain("Has triat: 2,99 € / any");
    expect([...container.querySelectorAll("button")].every((button) => button.disabled)).toBe(true);
    await act(async () => root.render(null));
    await act(async () => root.render(createElement(MapPriceSurvey)));
    expect(container.querySelector("button[aria-pressed=true]")?.textContent).toBe("2,99 € / any");
    expect(queue).toHaveBeenCalledTimes(1);
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
