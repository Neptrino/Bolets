export const WEEKEND_REEL_SLIDE_SECONDS = [4.4, 5.4, 4.8, 4.4, 3.4] as const;
export const WEEKEND_REEL_TRANSITION_SECONDS = 0.6;

// Directional changes introduce a new section; dissolves connect its evidence.
export const WEEKEND_REEL_TRANSITIONS = ["smoothleft", "fade", "smoothup", "fade"] as const;
const FPS = 30;

function slideDurations(slideCount: number) {
  if (!Number.isInteger(slideCount) || slideCount < 1 || slideCount > WEEKEND_REEL_SLIDE_SECONDS.length) {
    throw new Error(`The weekend Reel supports 1-${WEEKEND_REEL_SLIDE_SECONDS.length} slides`);
  }
  return WEEKEND_REEL_SLIDE_SECONDS.slice(0, slideCount);
}

function secondsArgument(seconds: number) {
  return seconds.toFixed(3).replace(/\.?0+$/, "");
}

export function weekendReelDurationSeconds(slideCount: number) {
  return slideDurations(slideCount).reduce((total, duration) => total + duration, 0)
    - Math.max(0, slideCount - 1) * WEEKEND_REEL_TRANSITION_SECONDS;
}

export function weekendReelFfmpegArgs(slidePaths: string[], outputPath: string) {
  if (slidePaths.length < 2) throw new Error("The weekend Reel requires at least two slides");
  const durations = slideDurations(slidePaths.length);
  const inputArgs = slidePaths.flatMap((path) => ["-i", path]);
  const filters: string[] = [];
  slidePaths.forEach((_, index) => {
    const frames = Math.round(durations[index] * FPS);
    // Generate each shot from one decoded still. A 1.8% push/pull stays inside
    // the card's safe margins. Data-heavy comparison/context shots stay still.
    const progress = `min(on/${frames - 1},1)`;
    const ease = `(${progress}*${progress}*(3-2*${progress}))`;
    const zoom = index === 0 ? `1+0.018*${ease}` : index === 2 ? `1.018-0.018*${ease}` : "1";
    // Supersample moving shots to avoid pixel-stepping in fine map labels.
    const size = index === 0 || index === 2 ? "2160:3840" : "1080:1920";
    filters.push(`[${index}:v]scale=${size}:flags=lanczos,setsar=1,zoompan=z='${zoom}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=${frames}:s=1080x1920:fps=${FPS},settb=AVTB,format=yuv420p,setpts=PTS-STARTPTS[v${index}]`);
  });
  let previous = "v0";
  let offset = durations[0] - WEEKEND_REEL_TRANSITION_SECONDS;
  for (let index = 1; index < slidePaths.length; index += 1) {
    const output = `xfade${index}`;
    filters.push(
      `[${previous}][v${index}]xfade=transition=${WEEKEND_REEL_TRANSITIONS[index - 1]}:duration=${WEEKEND_REEL_TRANSITION_SECONDS}:offset=${secondsArgument(offset)}[${output}]`,
    );
    previous = output;
    offset += durations[index] - WEEKEND_REEL_TRANSITION_SECONDS;
  }

  // Return to the exact opening still for a clean Instagram loop. This blend
  // uses the closing shot's last 600 ms, without adding a duplicate hold.
  const duration = weekendReelDurationSeconds(slidePaths.length);
  filters.push(`[0:v]scale=1080:1920:flags=lanczos,setsar=1,zoompan=z=1:d=${Math.round(WEEKEND_REEL_TRANSITION_SECONDS * FPS)}:s=1080x1920:fps=${FPS},settb=AVTB,format=yuv420p,setpts=PTS-STARTPTS[opening]`);
  filters.push(`[${previous}][opening]xfade=transition=fade:duration=${WEEKEND_REEL_TRANSITION_SECONDS}:offset=${secondsArgument(duration - WEEKEND_REEL_TRANSITION_SECONDS - 1 / FPS)}[looped]`);

  return [
    "-hide_banner",
    "-loglevel", "error",
    "-filter_complex_threads", "2",
    ...inputArgs,
    "-filter_complex", filters.join(";"),
    "-map", "[looped]",
    "-an",
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "20",
    "-threads", "2",
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart",
    "-t", secondsArgument(weekendReelDurationSeconds(slidePaths.length)),
    "-y", outputPath,
  ];
}
