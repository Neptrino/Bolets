import { copyFile, mkdir, rename, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const outputDirectory = resolve("public/media/generated");
const masterPath = resolve("video/render/home-showcase-master.mp4");
const mp4Path = resolve(outputDirectory, "home-showcase.mp4");
const optimizedMp4Path = resolve(outputDirectory, "home-showcase.optimized.mp4");
const webmPath = resolve(outputDirectory, "home-showcase.webm");
const posterPath = resolve(outputDirectory, "home-showcase-poster.webp");
const posterPngPath = resolve(outputDirectory, "home-showcase-poster.png");
const transcriptPath = resolve(outputDirectory, "home-showcase-transcript-ca.txt");

await mkdir(outputDirectory, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} failed with exit code ${result.status ?? "unknown"}`);
  }
}

run("ffmpeg", [
  "-y",
  "-i", masterPath,
  "-an",
  "-c:v", "libx264",
  "-preset", "slow",
  "-crf", "24",
  "-pix_fmt", "yuv420p",
  "-movflags", "+faststart",
  optimizedMp4Path,
]);

await rename(optimizedMp4Path, mp4Path);

run("ffmpeg", [
  "-y",
  "-i", mp4Path,
  "-an",
  "-c:v", "libvpx-vp9",
  "-crf", "32",
  "-b:v", "0",
  "-deadline", "good",
  "-cpu-used", "2",
  "-row-mt", "1",
  "-pix_fmt", "yuv420p",
  webmPath,
]);

run("ffmpeg", [
  "-y",
  "-ss", "00:00:01.800",
  "-i", mp4Path,
  "-frames:v", "1",
  "-vf", "scale=1600:-2",
  posterPngPath,
]);

await sharp(posterPngPath).webp({ quality: 84 }).toFile(posterPath);
await unlink(posterPngPath);

await copyFile(resolve("video/transcript-ca.txt"), transcriptPath);

run("ffprobe", [
  "-v", "error",
  "-show_entries", "format=duration,size:stream=codec_type,codec_name,width,height",
  "-of", "default=noprint_wrappers=1",
  mp4Path,
]);

await unlink(masterPath);
