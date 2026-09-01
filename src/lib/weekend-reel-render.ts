export const WEEKEND_REEL_SLIDE_SECONDS = [2.4, 3.4, 3.8, 3.6, 2.6, 2.4] as const;
export const WEEKEND_REEL_TRANSITION_SECONDS = 0.35;

function slideDurations(slideCount: number) {
  if (slideCount < 1 || slideCount > WEEKEND_REEL_SLIDE_SECONDS.length) {
    throw new Error(`The weekend Reel supports 1-${WEEKEND_REEL_SLIDE_SECONDS.length} slides`);
  }
  return WEEKEND_REEL_SLIDE_SECONDS.slice(0, slideCount);
}

function secondsArgument(seconds: number) {
  return seconds.toFixed(2).replace(/\.?0+$/, "");
}

export function weekendReelDurationSeconds(slideCount: number) {
  return slideDurations(slideCount).reduce((total, duration) => total + duration, 0)
    - Math.max(0, slideCount - 1) * WEEKEND_REEL_TRANSITION_SECONDS;
}

export function weekendReelFfmpegArgs(slidePaths: string[], outputPath: string) {
  if (slidePaths.length < 2) throw new Error("The weekend Reel requires at least two slides");
  const durations = slideDurations(slidePaths.length);
  const inputArgs = slidePaths.flatMap((path, index) => [
    "-loop", "1",
    "-t", secondsArgument(durations[index]),
    "-i", path,
  ]);
  const filters = slidePaths.map(
    (_, index) => `[${index}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30,settb=AVTB,format=yuv420p,setpts=PTS-STARTPTS[v${index}]`,
  );
  let previous = "v0";
  let offset = durations[0] - WEEKEND_REEL_TRANSITION_SECONDS;
  for (let index = 1; index < slidePaths.length; index += 1) {
    const output = `xfade${index}`;
    filters.push(
      `[${previous}][v${index}]xfade=transition=fade:duration=${WEEKEND_REEL_TRANSITION_SECONDS}:offset=${secondsArgument(offset)}[${output}]`,
    );
    previous = output;
    offset += durations[index] - WEEKEND_REEL_TRANSITION_SECONDS;
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
    "-t", secondsArgument(weekendReelDurationSeconds(slidePaths.length)),
    "-y", outputPath,
  ];
}
