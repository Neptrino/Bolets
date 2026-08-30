import { Composition } from "remotion";
import { HomeShowcase, SHOWCASE_DURATION } from "./HomeShowcase";

export function VideoRoot() {
  return (
    <Composition
      id="HomeShowcase"
      component={HomeShowcase}
      durationInFrames={SHOWCASE_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  );
}
