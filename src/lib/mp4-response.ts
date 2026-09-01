type ByteRange = {
  end: number;
  start: number;
};

const VIDEO_CACHE_CONTROL = "public, s-maxage=86400, stale-while-revalidate=86400";

export function parseMp4ByteRange(value: string, length: number): ByteRange | null {
  if (length <= 0 || value.includes(",")) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;

  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return null;
    return {
      start: Math.max(0, length - suffixLength),
      end: length - 1,
    };
  }

  const start = Number(match[1]);
  const requestedEnd = match[2] ? Number(match[2]) : length - 1;
  if (
    !Number.isSafeInteger(start)
    || !Number.isSafeInteger(requestedEnd)
    || start < 0
    || start >= length
    || requestedEnd < start
  ) return null;

  return {
    start,
    end: Math.min(requestedEnd, length - 1),
  };
}

export function mp4Response(
  video: Uint8Array,
  filename: string,
  rangeHeader: string | null,
) {
  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": VIDEO_CACHE_CONTROL,
    "Content-Disposition": `inline; filename="${filename}"`,
    "Content-Type": "video/mp4",
  });

  if (!rangeHeader) {
    headers.set("Content-Length", String(video.byteLength));
    return new Response(new Uint8Array(video), { headers });
  }

  const range = parseMp4ByteRange(rangeHeader, video.byteLength);
  if (!range) {
    headers.set("Content-Length", "0");
    headers.set("Content-Range", `bytes */${video.byteLength}`);
    return new Response(null, { headers, status: 416 });
  }

  const body = new Uint8Array(video.slice(range.start, range.end + 1));
  headers.set("Content-Length", String(body.byteLength));
  headers.set("Content-Range", `bytes ${range.start}-${range.end}/${video.byteLength}`);
  return new Response(body, { headers, status: 206 });
}
