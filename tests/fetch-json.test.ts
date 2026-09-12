import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJsonWithRetry } from "@/src/lib/fetch-json";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("bounded map requests", () => {
  it("retains the original JSON for cache writes only after parsing succeeds", async () => {
    const json = '{ "cells": [], "truncated": false }';
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(json))
      .mockResolvedValueOnce(new Response("invalid json")));
    const retain = vi.fn();
    await expect(fetchJsonWithRetry("/api/predictions", new AbortController().signal, 1, 1000, retain))
      .resolves.toEqual({ cells: [], truncated: false });
    expect(retain).toHaveBeenCalledExactlyOnceWith(json);
    await expect(fetchJsonWithRetry("/api/predictions", new AbortController().signal, 1, 1000, retain))
      .rejects.toBeInstanceOf(SyntaxError);
    expect(retain).toHaveBeenCalledOnce();
  });
  it("stops a stalled request at the shared deadline", async () => {
    vi.stubGlobal("fetch", vi.fn((
      _input: string | URL | Request,
      init?: RequestInit,
    ) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
        once: true,
      });
    })));

    await expect(
      fetchJsonWithRetry("/api/predictions", new AbortController().signal, 2, 10),
    ).rejects.toMatchObject({ name: "TimeoutError" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a transient server failure inside the deadline", async () => {
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ cells: [] })));

    await expect(
      fetchJsonWithRetry("/api/predictions", new AbortController().signal),
    ).resolves.toEqual({ cells: [] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
