import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";

const stats = [
  { v: "10", l: "Dashboards" },
  { v: "60%", l: "Faster billing" },
  { v: "100%", l: "PKR native" },
  { v: "24/7", l: "Audit ready" },
];

export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 }}>
      <div
        style={{
          fontFamily: FONTS.display,
          fontWeight: 700,
          fontSize: 110,
          textAlign: "center",
          opacity: s,
          transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
          background: "linear-gradient(90deg, #22d3ee, #34d399)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        One Platform. Every Department.
      </div>

      <div style={{ display: "flex", gap: 60 }}>
        {stats.map((st, i) => {
          const ss = spring({ frame: frame - 10 - i * 6, fps, config: { damping: 18 } });
          return (
            <div
              key={st.l}
              style={{
                textAlign: "center",
                opacity: ss,
                transform: `translateY(${interpolate(ss, [0, 1], [30, 0])}px)`,
              }}
            >
              <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 100, color: "#22d3ee" }}>{st.v}</div>
              <div style={{ fontSize: 22, letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
                {st.l}
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 20, fontSize: 24, color: "rgba(255,255,255,0.5)", letterSpacing: 4, textTransform: "uppercase" }}>
        southwesthospitalkohat.com
      </div>
    </AbsoluteFill>
  );
};
