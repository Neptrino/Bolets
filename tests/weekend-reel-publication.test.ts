import { describe, expect, it, vi } from "vitest";
import { prepareWeekendReel } from "@/src/lib/weekend-reel-publication";

const mp4 = new Uint8Array([0, 0, 0, 12, 102, 116, 121, 112, 105, 115, 111, 109]);

describe("weekend Reel public download", () => {
  it("waits for the complete video body before allowing publication", async () => {
    let finish!: () => void;
    const body = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(mp4);
      finish = () => controller.close();
    } });
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { "Content-Type": "video/mp4" } }));
    let ready = false;
    const pending = prepareWeekendReel("https://bolets.app/reel", fetchImpl).then(() => { ready = true; });
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(ready).toBe(false);
    finish();
    await pending;
    expect(ready).toBe(true);
  });

  it.each([
    () => new Response("Render failed", { status: 503 }),
    () => new Response("<html>Login</html>", { headers: { "Content-Type": "text/html" } }),
    () => new Response("broken", { headers: { "Content-Type": "video/mp4" } }),
    () => new Response(mp4, { headers: { "Content-Type": "video/mp4", "Content-Length": "1000" } }),
  ])("rejects unavailable, invalid or truncated downloads without retry", async response => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response());
    await expect(prepareWeekendReel("https://bolets.app/reel", fetchImpl)).rejects.toMatchObject({ code: "instagram_reel_unavailable" });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
