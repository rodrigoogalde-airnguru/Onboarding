"use client";

import { useState, useEffect } from "react";

const API_KEY = "AIzaSyAB-xQ3jyxFXOVckqSaimZHCw3Rlh7uhtY";

const SECTIONS = [
  {
    title: "Introduction to RM",
    expectedMinutes: 25,
    videoIds: ["upcIvDbi108", "BvG4AmcYljo", "y0EMn8hJHZc", "xYzu3JyBqHE"],
  },
  {
    title: "Airline Pricing",
    expectedMinutes: 32,
    videoIds: ["0tZA3QDZbuE", "My5QGP-Erag", "g1At56Dyf5M", "iNCM69DFOyE", "6SFbGYgNQAQ"],
  },
  {
    title: "Airline Fare Products",
    expectedMinutes: 12,
    videoIds: ["5ujMIKrJwF8", "rR1pqRxsRaU"],
  },
  {
    title: "Inventory Control",
    expectedMinutes: 17,
    videoIds: ["i7OgtWAdlsU", "vFA2tMlw1JM"],
  },
  {
    title: "Optimization Models for Revenue Management",
    expectedMinutes: null,
    videoIds: [
      "ZRogsfEKDcg", "bn7TATirLUI", "317-ocAmJGM", "P6YdxMhUslY",
      "rTkhfbEZUhI", "DdNV5w35pS0", "mZY4CU05PLw", "7b8hYHUCwQU",
      "MK_klO-KVmM", "t8afuAgdhJg", "LrmbaC-aEWc", "VGUfDZfN6LM",
    ],
  },
];

const ALL_IDS = SECTIONS.flatMap((s) => s.videoIds);

function parseDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  const h = parseInt(m?.[1] || "0");
  const min = parseInt(m?.[2] || "0");
  const s = parseInt(m?.[3] || "0");
  return h * 3600 + min * 60 + s;
}

function fmtSec(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m ${sec}s`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

type VideoData = { id: string; title: string; seconds: number };

export default function App() {
  const [videoMap, setVideoMap] = useState<Record<string, VideoData>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch_data() {
      try {
        const url = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${ALL_IDS.join(",")}&key=${API_KEY}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.error) throw new Error(data.error.message);
        const map: Record<string, VideoData> = {};
        for (const item of data.items || []) {
          map[item.id] = {
            id: item.id,
            title: item.snippet?.title || item.id,
            seconds: parseDuration(item.contentDetails.duration),
          };
        }
        setVideoMap(map);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    fetch_data();
  }, []);

  const grandTotal = Object.values(videoMap).reduce((a, v) => a + v.seconds, 0);

  if (loading)
    return (
      <div style={{ padding: 24, color: "#aaa", fontFamily: "Segoe UI,sans-serif", background: "#0f0f0f", minHeight: "100vh" }}>
        ⏳ Obteniendo duraciones de YouTube...
      </div>
    );
  if (error)
    return (
      <div style={{ padding: 24, color: "#f66", fontFamily: "Segoe UI,sans-serif", background: "#0f0f0f", minHeight: "100vh" }}>
        ❌ Error: {error}
      </div>
    );

  return (
    <div style={{ fontFamily: "Segoe UI,sans-serif", background: "#0f0f0f", minHeight: "100vh", padding: 24, color: "#e0e0e0", maxWidth: 760, margin: "0 auto" }}>
      <h1 style={{ color: "#ff4444", marginBottom: 4, fontSize: "1.4rem" }}>Revenue Management — Curso</h1>
      <p style={{ color: "#888", fontSize: "0.85rem", marginBottom: 24 }}>
        Tiempo total real: <strong style={{ color: "#ffaa44" }}>{fmtSec(grandTotal)}</strong>
        &nbsp;·&nbsp;{ALL_IDS.length} videos
      </p>

      {SECTIONS.map((section) => {
        const sectionVideos = section.videoIds.map((id) => videoMap[id]).filter(Boolean);
        const sectionTotal = sectionVideos.reduce((a, v) => a + v.seconds, 0);
        const expectedSec = section.expectedMinutes ? section.expectedMinutes * 60 : null;
        const diff = expectedSec !== null ? sectionTotal - expectedSec : null;

        return (
          <div
            key={section.title}
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 12, padding: 20, marginBottom: 16 }}
          >
            {/* Header de sección */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: "1rem", fontWeight: 700, color: "#e0e0e0" }}>{section.title}</div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: 2 }}>{sectionVideos.length} videos</div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {expectedSec !== null && (
                  <div style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#666", marginBottom: 2 }}>ESTIMADO</div>
                    <div style={{ fontSize: "0.85rem", color: "#888" }}>{fmtSec(expectedSec)}</div>
                  </div>
                )}
                <div style={{ background: "#111", border: "1px solid #333", borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                  <div style={{ fontSize: "0.65rem", color: "#666", marginBottom: 2 }}>REAL</div>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#ff4444" }}>{fmtSec(sectionTotal)}</div>
                </div>
                {diff !== null && (
                  <div style={{ background: "#111", border: `1px solid ${diff > 0 ? "#442200" : "#003322"}`, borderRadius: 8, padding: "6px 12px", textAlign: "center" }}>
                    <div style={{ fontSize: "0.65rem", color: "#666", marginBottom: 2 }}>DIFERENCIA</div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 700, color: diff > 0 ? "#ff6633" : "#44cc88" }}>
                      {diff > 0 ? "+" : ""}{fmtSec(Math.abs(diff))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Lista de videos */}
            <div style={{ borderTop: "1px solid #222", paddingTop: 12 }}>
              {sectionVideos.map((v, i) => (
                <div
                  key={v.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: i < sectionVideos.length - 1 ? "1px solid #1e1e1e" : "none",
                    gap: 12,
                  }}
                >
                  <span style={{ color: "#444", fontSize: "0.72rem", minWidth: 20 }}>{i + 1}.</span>
                  <a
                    href={`https://www.youtube.com/watch?v=${v.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ flex: 1, fontSize: "0.8rem", color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none" }}
                  >
                    {v.title}
                  </a>
                  <span style={{ fontWeight: 600, color: "#ffaa44", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                    {fmtSec(v.seconds)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
