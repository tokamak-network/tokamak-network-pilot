import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "Tokamak Forest — AI-Powered Knowledge Hub for Tokamak Network";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#060606",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Emerald radial glow top */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "900px",
            height: "500px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.04) 40%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Bottom glow */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "700px",
            height: "300px",
            borderRadius: "50%",
            background:
              "radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
            padding: "60px 80px",
            position: "relative",
          }}
        >
          {/* Logo / Icon */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "32px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "56px",
                height: "56px",
                borderRadius: "14px",
                background: "#10B981",
              }}
            >
              {/* Tree icon */}
              <svg
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M16 4L10 13h3.5L9 19h4l-3 9h12l-3-9h4l-4.5-6H22L16 4z"
                  fill="#ffffff"
                />
              </svg>
            </div>
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              marginBottom: "24px",
            }}
          >
            <span
              style={{
                fontSize: "52px",
                fontWeight: 700,
                color: "#ffffff",
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                textAlign: "center",
              }}
            >
              Navigate the knowledge
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <span
                style={{
                  fontSize: "52px",
                  fontWeight: 700,
                  color: "#ffffff",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                }}
              >
                forest of
              </span>
              <span
                style={{
                  fontSize: "52px",
                  fontWeight: 700,
                  color: "#10B981",
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                }}
              >
                Tokamak Network
              </span>
            </div>
          </div>

          {/* Description */}
          <span
            style={{
              fontSize: "20px",
              color: "rgba(255,255,255,0.45)",
              textAlign: "center",
              maxWidth: "700px",
              lineHeight: 1.6,
            }}
          >
            AI-powered answers with real citations from every repo, doc, and
            resource across the ecosystem.
          </span>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 80px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10B981",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: "15px",
                fontWeight: 600,
                color: "rgba(255,255,255,0.5)",
                letterSpacing: "0.02em",
              }}
            >
              Tokamak Forest
            </span>
          </div>
          <span
            style={{
              fontSize: "15px",
              color: "rgba(255,255,255,0.3)",
            }}
          >
            tokamakforest.com
          </span>
        </div>
      </div>
    ),
    { ...size },
  );
}
