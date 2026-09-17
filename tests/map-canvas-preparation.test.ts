import { afterEach, expect, it, vi } from "vitest";
import { prepareCanvas } from "@/components/region-map/support";

afterEach(() => vi.unstubAllGlobals());

it("avoids allocating an empty loading canvas but clears previous species paint", () => {
  vi.stubGlobal("window", { devicePixelRatio: 2 });
  const context = { setTransform: vi.fn(), clearRect: vi.fn() };
  const getContext = vi.fn(() => context);
  const canvas = { width: 300, height: 150, clientWidth: 412, clientHeight: 823, getContext } as unknown as HTMLCanvasElement;
  expect(prepareCanvas(canvas, true)).toBeNull();
  expect(getContext).not.toHaveBeenCalled();
  expect(prepareCanvas(canvas)).toBe(context);
  expect(canvas.width).toBe(824);
  expect(canvas.height).toBe(1646);
  context.clearRect.mockClear();
  expect(prepareCanvas(canvas, true)).toBe(context);
  expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 412, 823);
});

it("caps the backing store at 2× so 3× phones fill and upload half the pixels per paint", () => {
  vi.stubGlobal("window", { devicePixelRatio: 3 });
  const context = { setTransform: vi.fn(), clearRect: vi.fn() };
  const canvas = { width: 0, height: 0, clientWidth: 412, clientHeight: 823, getContext: () => context } as unknown as HTMLCanvasElement;
  expect(prepareCanvas(canvas)).toBe(context);
  expect(canvas.width).toBe(824);
  expect(canvas.height).toBe(1646);
  expect(context.setTransform).toHaveBeenCalledExactlyOnceWith(2, 0, 0, 2, 0, 0);
  expect(context.clearRect).toHaveBeenCalledExactlyOnceWith(0, 0, 412, 823);
});
