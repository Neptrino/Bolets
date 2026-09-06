import { Composition } from "remotion";
import { HomeShowcase, SHOWCASE_DURATION } from "./HomeShowcase";
import { InstagramSinglePromo } from "./InstagramPromoSingle";
import {
  InstagramMapNotGpsCarousel,
  InstagramMapReadCarousel,
  InstagramMapSpeciesCarousel,
  InstagramMapValleysCarousel,
  InstagramMapProfileCarousel,
  InstagramMapReelEvolution,
  InstagramMapReelGuide,
  InstagramMapReelSpecies,
  InstagramMapReelTerritories,
  InstagramMapReelWhere,
  InstagramMapStoryChecklist,
  InstagramMapStoryEvolution,
  InstagramMapStoryTeaser,
  InstagramMapStoryWhere,
  InstagramSingleQuiz,
  InstagramSingleDebate,
  InstagramSingleNames,
  InstagramSingleReality,
  InstagramSingleWeekend,
  InstagramSingleSpecies,
  InstagramSingleSeason,
  InstagramTextReelRespect,
  InstagramTextReelWeekend,
  InstagramTextReelWhere,
  TEXT_REEL_DURATION,
  MAP_REEL_EVOLUTION_DURATION,
  MAP_REEL_GUIDE_DURATION,
  MAP_REEL_SPECIES_DURATION,
  MAP_REEL_TERRITORIES_DURATION,
  MAP_REEL_WHERE_DURATION,
} from "./InstagramMapCampaign";
import {
  INSTAGRAM_PROMO_REEL_DURATION,
  InstagramPrivacyCarousel,
  InstagramPromoReel,
  InstagramWeekendCarousel,
} from "./InstagramPromo";
import {
  DETAILED_MAP_REEL_DURATION,
  InstagramDetailedMapReel,
  InstagramMapEvolutionReel,
  MAP_EVOLUTION_REEL_DURATION,
} from "./InstagramMapReels";

export function VideoRoot() {
  return (
    <>
      <Composition
        id="HomeShowcase"
        component={HomeShowcase}
        durationInFrames={SHOWCASE_DURATION}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="InstagramPromoReel"
        component={InstagramPromoReel}
        durationInFrames={INSTAGRAM_PROMO_REEL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramWeekendCarousel"
        component={InstagramWeekendCarousel}
        durationInFrames={5}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="InstagramPrivacyCarousel"
        component={InstagramPrivacyCarousel}
        durationInFrames={5}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="InstagramDetailedMapReel"
        component={InstagramDetailedMapReel}
        durationInFrames={DETAILED_MAP_REEL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapEvolutionReel"
        component={InstagramMapEvolutionReel}
        durationInFrames={MAP_EVOLUTION_REEL_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapReelWhere"
        component={InstagramMapReelWhere}
        durationInFrames={MAP_REEL_WHERE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapReelEvolution"
        component={InstagramMapReelEvolution}
        durationInFrames={MAP_REEL_EVOLUTION_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapReelSpecies"
        component={InstagramMapReelSpecies}
        durationInFrames={MAP_REEL_SPECIES_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapReelTerritories"
        component={InstagramMapReelTerritories}
        durationInFrames={MAP_REEL_TERRITORIES_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="InstagramMapReelGuide"
        component={InstagramMapReelGuide}
        durationInFrames={MAP_REEL_GUIDE_DURATION}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition id="InstagramTextReelWeekend" component={InstagramTextReelWeekend} durationInFrames={TEXT_REEL_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="InstagramTextReelRespect" component={InstagramTextReelRespect} durationInFrames={TEXT_REEL_DURATION} fps={30} width={1080} height={1920} />
      <Composition id="InstagramTextReelWhere" component={InstagramTextReelWhere} durationInFrames={TEXT_REEL_DURATION} fps={30} width={1080} height={1920} />
      <Composition
        id="InstagramMapReadCarousel"
        component={InstagramMapReadCarousel}
        durationInFrames={5}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition
        id="InstagramMapNotGpsCarousel"
        component={InstagramMapNotGpsCarousel}
        durationInFrames={5}
        fps={30}
        width={1080}
        height={1350}
      />
      <Composition id="InstagramMapSpeciesCarousel" component={InstagramMapSpeciesCarousel} durationInFrames={5} fps={30} width={1080} height={1350} />
      <Composition id="InstagramMapValleysCarousel" component={InstagramMapValleysCarousel} durationInFrames={5} fps={30} width={1080} height={1350} />
      <Composition id="InstagramMapProfileCarousel" component={InstagramMapProfileCarousel} durationInFrames={5} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleQuiz" component={InstagramSingleQuiz} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleDebate" component={InstagramSingleDebate} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleNames" component={InstagramSingleNames} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleReality" component={InstagramSingleReality} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleWeekend" component={InstagramSingleWeekend} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleSpecies" component={InstagramSingleSpecies} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSingleSeason" component={InstagramSingleSeason} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSinglePromo" component={InstagramSinglePromo} durationInFrames={1} fps={30} width={1080} height={1350} />
      <Composition id="InstagramSinglePromoSquare" component={InstagramSinglePromo} durationInFrames={1} fps={30} width={1080} height={1080} defaultProps={{ format: "square" }} />
      <Composition id="InstagramSinglePromoStory" component={InstagramSinglePromo} durationInFrames={1} fps={30} width={1080} height={1920} defaultProps={{ format: "story" }} />
      <Composition id="InstagramMapStoryWhere" component={InstagramMapStoryWhere} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="InstagramMapStoryEvolution" component={InstagramMapStoryEvolution} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="InstagramMapStoryChecklist" component={InstagramMapStoryChecklist} durationInFrames={1} fps={30} width={1080} height={1920} />
      <Composition id="InstagramMapStoryTeaser" component={InstagramMapStoryTeaser} durationInFrames={1} fps={30} width={1080} height={1920} />
    </>
  );
}
