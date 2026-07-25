import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { FONTS } from "../MainVideo";
import type { Dash } from "../data";

export const DashScene: React.FC<{ dash: Dash; index: number; total: number }> = ({ dash, index, total }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 140 } });
  const exit = interpolate(frame, [durationInFrames - 15, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const globalOpacity = 1 - exit;
  const globalX = interpolate(exit, [0, 1], [0, -80]);

  return (
    <AbsoluteFill style={{ opacity: globalOpacity, transform: `translateX(${globalX}px)` }}>
      {/* accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: interpolate(enter, [0, 1], [0, 14]),
          background: dash.accent,
          boxShadow: `0 0 60px ${dash.accent}`,
        }}
      />

      {/* index / progress */}
      <div
        style={{
          position: "absolute",
          top: 60,
          right: 80,
          fontFamily: FONTS.body,
          fontSize: 22,
          letterSpacing: 4,
          color: "rgba(255,255,255,0.5)",
        }}
      >
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>

      <div
        style={{
          position: "absolute",
          top: 100,
          right: 80,
          width: 260,
          height: 4,
          background: "rgba(255,255,255,0.1)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((index + 1) / total) * 100}%`,
            height: "100%",
            background: dash.accent,
          }}
        />
      </div>

      {/* main content */}
      <div style={{ padding: "180px 120px 0 200px", maxWidth: 1500 }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: 26,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: dash.accent,
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [20, 0])}px)`,
          }}
        >
          {dash.tag}
        </div>

        <div
          style={{
            fontFamily: FONTS.display,
            fontWeight: 700,
            fontSize: 180,
            lineHeight: 1,
            marginTop: 20,
            opacity: enter,
            transform: `translateY(${interpolate(enter, [0, 1], [40, 0])}px)`,
            background: `linear-gradient(90deg, #ffffff 40%, ${dash.accent})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {dash.name}
        </div>

        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.55)",
            marginTop: 40,
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          Perks
        </div>

        <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 22 }}>
          {dash.perks.map((p, i) => {
            const s = spring({ frame: frame - 15 - i * 8, fps, config: { damping: 18, stiffness: 160 } });
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  opacity: s,
                  transform: `translateX(${interpolate(s, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 999,
                    background: dash.accent,
                    boxShadow: `0 0 20px ${dash.accent}`,
                  }}
                />
                <div style={{ fontFamily: FONTS.display, fontWeight: 500, fontSize: 46, color: "white" }}>{p}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* decorative floating card */}
      <div
        style={{
          position: "absolute",
          right: 120,
          bottom: 120,
          width: 380,
          height: 240,
          borderRadius: 24,
          border: `1px solid ${dash.accent}55`,
          background: `linear-gradient(135deg, ${dash.accent}22, transparent)`,
          padding: 30,
          transform: `translateY(${interpolate(enter, [0, 1], [60, 0])}px) rotate(${interpolate(enter, [0, 1], [-3, 0])}deg)`,
          opacity: enter,
        }}
      >
        <div style={{ fontSize: 18, letterSpacing: 4, color: dash.accent, textTransform: "uppercase" }}>Module</div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 700, fontSize: 44, marginTop: 12 }}>{dash.name}</div>
        <div style={{ marginTop: 20, display: "flex", gap: 8 }}>
          {[0, 1, 2, 3, 4].map((b) => (
            <div
              key={b}
              style={{
                flex: 1,
                height: 8,
                borderRadius: 4,
                background: b <= (index % 5) ? dash.accent : "rgba(255,255,255,0.1)",
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 20, fontSize: 16, color: "rgba(255,255,255,0.5)" }}>
          Live · Multi-role · Audit-ready
        </div>
      </div>
    </AbsoluteFill>
  );
};
