import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const y = interpolate(s, [0, 1], [40, 0]);
  const sub = spring({ frame: frame - 12, fps, config: { damping: 20 } });
  const outFade = interpolate(frame, [55, 75], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: outFade }}>
      <div style={{ textAlign: "center", transform: `translateY(${y}px)`, opacity: s }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 26,
            letterSpacing: 10,
            color: "#22d3ee",
            textTransform: "uppercase",
            marginBottom: 24,
          }}
        >
          South West Hospital · Kohat
        </div>
        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 140,
            lineHeight: 1,
            background: "linear-gradient(90deg, #ffffff, #22d3ee)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          The Complete Suite
        </div>
        <div
          style={{
            marginTop: 30,
            fontSize: 30,
            color: "rgba(255,255,255,0.7)",
            opacity: sub,
            transform: `translateY(${interpolate(sub, [0, 1], [20, 0])}px)`,
          }}
        >
          10 dashboards · one hospital · zero friction
        </div>
      </div>
    </AbsoluteFill>
  );
};
