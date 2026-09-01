export const WEEKEND_REEL_FRAME_SECONDS = 1.8;
export const WEEKEND_REEL_TRANSITION_SECONDS = 0.3;

export function weekendReelDurationSeconds(slideCount: number) {
  return slideCount * WEEKEND_REEL_FRAME_SECONDS
    - Math.max(0, slideCount - 1) * WEEKEND_REEL_TRANSITION_SECONDS;
}

export function weekendReelFfmpegArgs(slidePaths: string[], outputPath: string) {
  if (slidePaths.length < 2) throw new Error("The weekend Reel requires at least two slides");
  const inputArgs = slidePaths.flatMap((path) => [
    "-loop", "1",
    "-t", String(WEEKEND_REEL_FRAME_SECONDS),
    "-i", path,
  ]);
  const filters = slidePaths.map(
    (_, index) => `[${index}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,settb=AVTB,format=yuv420p,setpts=PTS-STARTPTS[v${index}]`,
  );
  let previous = "v0";
  for (let index = 1; index < slidePaths.length; index += 1) {
    const output = `xfade${index}`;
    const offset = index * (WEEKEND_REEL_FRAME_SECONDS - WEEKEND_REEL_TRANSITION_SECONDS);
    filters.push(
      `[${previous}][v${index}]xfade=transition=fade:duration=${WEEKEND_REEL_TRANSITION_SECONDS}:offset=${offset.toFixed(1)}[${output}]`,
    );
    previous = output;
  }

  return [
    "-hide_banner",
    "-loglevel", "error",
    ...inputArgs,
    "-filter_complex", filters.join(";"),
    "-map", `[${previous}]`,
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-t", weekendReelDurationSeconds(slidePaths.length).toFixed(1),
    "-y", outputPath,
  ];
}
