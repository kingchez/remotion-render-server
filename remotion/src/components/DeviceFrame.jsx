import { AbsoluteFill } from "remotion";

// Wraps children in a fake browser window (rounded corners, traffic-light
// dots, URL bar) so a raw screen recording reads as "a presented browser",
// not a raw capture.
export const DeviceFrame = ({ url, children }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#1a1a1a", padding: 40 }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", display: "flex", flexDirection: "column",
      }}>
        <div style={{
          height: 48, background: "#2b2b2b", display: "flex", alignItems: "center",
          padding: "0 16px", gap: 10,
        }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FF5F57" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#FEBC2E" }} />
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#28C840" }} />
          {url ? (
            <div style={{
              marginLeft: 20, background: "#1a1a1a", color: "#aaa", fontSize: 16,
              padding: "6px 20px", borderRadius: 8, fontFamily: "Arial, sans-serif", flex: 1,
              maxWidth: 500,
            }}>
              {url}
            </div>
          ) : null}
        </div>
        <div style={{ flex: 1, position: "relative", background: "white" }}>
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};
