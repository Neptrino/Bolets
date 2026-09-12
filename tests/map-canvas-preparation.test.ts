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
