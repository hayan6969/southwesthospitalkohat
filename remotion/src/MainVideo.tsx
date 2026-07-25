import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { DASHBOARDS } from "./data";
import { DashScene } from "./scenes/DashScene";
import { Intro } from "./scenes/Intro";
import { Outro } from "./scenes/Outro";

const { fontFamily: display } = loadDisplay("normal", { weights: ["500", "700"], subsets: ["latin"] });
const { fontFamily: body } = loadBody("normal", { weights: ["400", "600"], subsets: ["latin"] });

export const FONTS = { display, body };

export const INTRO_FRAMES = 75;
export const SCENE_FRAMES = 75; // 2.5s per dashboard
export const OUTRO_FRAMES = 90;
export const TOTAL_FRAMES = INTRO_FRAMES + SCENE_FRAMES * DASHBOARDS.length + OUTRO_FRAMES;

const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const hue = interpolate(frame, [0, durationInFrames], [210, 260]);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 800px at 30% 20%, hsl(${hue} 60% 18%), #05070d 70%)`,
      }}
    />
  );
};

const Grid: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundImage:
        "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
      backgroundSize: "80px 80px",
      maskImage: "radial-gradient(circle at 50% 50%, black 40%, transparent 80%)",
    }}
  />
);

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#05070d", color: "white", fontFamily: FONTS.body }}>
      <Background />
      <Grid />

      <Sequence from={0} durationInFrames={INTRO_FRAMES}>
        <Intro />
      </Sequence>

      {DASHBOARDS.map((d, i) => (
        <Sequence
          key={d.name}
          from={INTRO_FRAMES + i * SCENE_FRAMES}
          durationInFrames={SCENE_FRAMES}
        >
          <DashScene dash={d} index={i} total={DASHBOARDS.length} />
        </Sequence>
      ))}

      <Sequence from={INTRO_FRAMES + DASHBOARDS.length * SCENE_FRAMES} durationInFrames={OUTRO_FRAMES}>
        <Outro />
      </Sequence>
    </AbsoluteFill>
  );
};
