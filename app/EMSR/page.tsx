"use client";

import { useState, useMemo } from "react";

// Peter Acklam's rational approximation for the probit (inverse normal CDF) function
function probit(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-3.969683028665376e1, 2.20946098424520e2, -2.75928510446969e2, 1.38357751867269e2, -3.06647980661472e1, 2.50662827745924];
  const b = [-5.44760987982241e1, 1.61585836858041e2, -1.55698979859887e2, 6.68013118877197e1, -1.32806815528857e1];
  const c = [-7.78489400243029e-3, -3.22396458041136e-1, -2.40075827716184, -2.54973253934373, 4.37466414144650, 2.93816398269878];
  const d = [7.78469570904146e-3, 3.22467129070040e-1, 2.44513413714300, 3.75440866190742];
  const pLow = 0.02425;
  let q: number;
  if (pLow <= p && p <= 1 - pLow) {
    q = p - 0.5;
    const r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

// θ_i,j: protection of class i against lower class j
// Derived from: F_j = F_i · P[X_i > θ]  →  θ = μ_i + σ_i · Φ⁻¹(1 − F_j/F_i)
function calcTheta(mu: number, sigma: number, fareHigh: number, fareLow: number): number | null {
  if (fareHigh <= fareLow || fareHigh <= 0 || fareLow <= 0 || mu <= 0 || sigma <= 0) return null;
  const ratio = fareLow / fareHigh;
  const theta = mu + sigma * probit(1 - ratio);
  return isFinite(theta) ? theta : null;
}

interface FareClass {
  fare: number;
  mu: number;
  sigma: number;
}

const DEFAULTS: FareClass[] = [
  { fare: 500, mu: 16.5, sigma: 5.6 },
  { fare: 420, mu: 44.2, sigma: 15.0 },
  { fare: 290, mu: 35.1, sigma: 11.2 },
  { fare: 125, mu: 0,    sigma: 0   },
];

const inputStyle: React.CSSProperties = {
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 6,
  color: "#fff",
  padding: "4px 8px",
  width: 68,
  textAlign: "center",
  fontSize: "0.86rem",
  outline: "none",
};

export default function EMSRPage() {
  const [classes, setClasses] = useState<FareClass[]>(DEFAULTS);
  const n = classes.length;

  // matrix[i][j] = θ protection of class i against class j (only valid when i < j and fare[i] > fare[j])
  const matrix = useMemo<(number | null)[][]>(() => {
    const m: (number | null)[][] = Array.from({ length: n }, () => Array(n).fill(null));
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        m[i][j] = calcTheta(classes[i].mu, classes[i].sigma, classes[i].fare, classes[j].fare);
      }
    }
    return m;
  }, [classes, n]);

  // emsrA[j] = Σ matrix[i][j] for i < j  (total EMSRa protection against class j)
  const emsrA = useMemo<(number | null)[]>(() =>
    Array.from({ length: n }, (_, j) => {
      if (j === 0) return null;
      const vals = Array.from({ length: j }, (_, i) => matrix[i][j]);
      if (vals.some(v => v === null)) return null;
      return (vals as number[]).reduce((a, b) => a + b, 0);
    }), [matrix, n]);

  const faresValid = classes.every((c, i) => i === 0 || c.fare < classes[i - 1].fare);

  const update = (idx: number, field: keyof FareClass, raw: string) => {
    const val = parseFloat(raw);
    if (isNaN(val) || val < 0) return;
    setClasses(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  const randomize = () => {
    const topFare = 400 + Math.floor(Math.random() * 9) * 50;
    const fares: number[] = [topFare];
    for (let i = 1; i < n; i++) {
      const drop = 50 + Math.floor(Math.random() * 16) * 10;
      fares.push(Math.max(50, fares[i - 1] - drop));
    }
    setClasses(fares.map((fare, i) => ({
      fare,
      mu:    i < n - 1 ? Math.round((15 + Math.random() * 45) * 10) / 10 : 0,
      sigma: i < n - 1 ? Math.round((4  + Math.random() * 14) * 10) / 10 : 0,
    })));
  };

  const addClass = () => {
    setClasses(prev => {
      const last  = prev[prev.length - 1];
      const prev2 = prev[prev.length - 2];
      const newFare = Math.round(((prev2.fare + last.fare) / 2) / 5) * 5;
      return [...prev.slice(0, -1), { fare: newFare, mu: 25, sigma: 8 }, last];
    });
  };

  const removeClass = () => {
    if (n > 2) setClasses(prev => [...prev.slice(0, -2), prev[prev.length - 1]]);
  };

  return (
    <div style={{ fontFamily: "Segoe UI, sans-serif", background: "#0f0f0f", minHeight: "100vh", padding: 24, color: "#e0e0e0" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* Header */}
        <h1 style={{ color: "#ff4444", fontSize: "1.4rem", fontWeight: 700, marginBottom: 4 }}>
          EMSR — Expected Marginal Seat Revenue
        </h1>
        <p style={{ color: "#666", fontSize: "0.82rem", marginBottom: 20 }}>
          Simulador de niveles de protección individuales (EMSRa) · Derivación de Littlewood&apos;s Rule
        </p>

        {/* Formula */}
        <div style={{ background: "#131313", border: "1px solid #2a2a2a", borderLeft: "3px solid #ff4444", borderRadius: 8, padding: "12px 16px", marginBottom: 16 }}>
          <div style={{ color: "#555", fontSize: "0.72rem", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>Fórmula central</div>
          <code style={{ color: "#ffcc44", fontSize: "0.88rem" }}>
            F<sub>lower</sub> = F<sub>j</sub> · P[X<sub>j</sub> &gt; θ<sub>j</sub>]
            {"  →  "}
            θ<sub>j</sub> = μ<sub>j</sub> + σ<sub>j</sub> · Φ⁻¹(1 − F<sub>lower</sub> / F<sub>j</sub>)
          </code>
        </div>

        {/* Fare order warning */}
        {!faresValid && (
          <div style={{ background: "#2a1000", border: "1px solid #882200", borderRadius: 8, padding: "8px 14px", marginBottom: 16, color: "#ff6633", fontSize: "0.82rem" }}>
            ⚠ Las tarifas deben ser estrictamente decrecientes (de mayor a menor). Algunos cálculos quedarán en blanco.
          </div>
        )}

        {/* Controls */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <button onClick={randomize} style={{ background: "#c0392b", border: "none", borderRadius: 8, color: "#fff", padding: "8px 18px", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem" }}>
            Randomize
          </button>
          <button onClick={addClass} style={{ background: "#1e1e1e", border: "1px solid #444", borderRadius: 8, color: "#ccc", padding: "8px 14px", cursor: "pointer", fontSize: "0.85rem" }}>
            + Clase
          </button>
          <button onClick={removeClass} disabled={n <= 2} style={{ background: "#1e1e1e", border: "1px solid #444", borderRadius: 8, color: n <= 2 ? "#444" : "#ccc", padding: "8px 14px", cursor: n <= 2 ? "default" : "pointer", fontSize: "0.85rem" }}>
            − Clase
          </button>
          <span style={{ color: "#444", fontSize: "0.78rem" }}>{n} clases · {n - 1} columnas de protección</span>
        </div>

        {/* Main table */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.86rem" }}>
              <thead>
                <tr>
                  <th style={{ background: "#111", color: "#777", fontWeight: 600, padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #2a2a2a" }}>Clase j</th>
                  <th style={{ background: "#111", color: "#777", fontWeight: 600, padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #2a2a2a" }}>Fare ($)</th>
                  <th style={{ background: "#111", color: "#777", fontWeight: 600, padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #2a2a2a" }}>μ (Media)</th>
                  <th style={{ background: "#111", color: "#777", fontWeight: 600, padding: "12px 16px", textAlign: "center", borderBottom: "2px solid #2a2a2a" }}>σ (Desv.)</th>
                  {Array.from({ length: n - 1 }, (_, k) => (
                    <th key={k} style={{ background: "#0d1520", color: "#5588cc", fontWeight: 600, padding: "10px 14px", textAlign: "center", borderBottom: "2px solid #2a2a2a", borderLeft: "1px solid #1a2030", minWidth: 110, whiteSpace: "nowrap" }}>
                      Protection vs {k + 2}
                      <div style={{ fontSize: "0.68rem", color: "#334", fontWeight: 400, marginTop: 2 }}>
                        F = ${classes[k + 1].fare}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map((cls, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1e1e1e", background: i % 2 === 0 ? "transparent" : "#171717" }}>
                    {/* Class number */}
                    <td style={{ padding: "10px 16px", textAlign: "center", fontWeight: 700, color: "#ff6644", fontSize: "1rem" }}>
                      {i + 1}
                    </td>

                    {/* Fare input */}
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                        <span style={{ color: "#555" }}>$</span>
                        <input type="number" min={1} value={cls.fare} onChange={e => update(i, "fare", e.target.value)} style={inputStyle} />
                      </div>
                    </td>

                    {/* Mu input */}
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {i < n - 1
                        ? <input type="number" step="0.1" min={0} value={cls.mu} onChange={e => update(i, "mu", e.target.value)} style={inputStyle} />
                        : <span style={{ color: "#333" }}>—</span>}
                    </td>

                    {/* Sigma input */}
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      {i < n - 1
                        ? <input type="number" step="0.1" min={0} value={cls.sigma} onChange={e => update(i, "sigma", e.target.value)} style={inputStyle} />
                        : <span style={{ color: "#333" }}>—</span>}
                    </td>

                    {/* Protection cells: column k = "vs class k+1" */}
                    {Array.from({ length: n - 1 }, (_, k) => {
                      const j = k + 1; // lower class index
                      const theta = matrix[i][j];
                      const active = i < j; // only applicable for rows above the lower class
                      return (
                        <td key={k} style={{ padding: "8px 14px", textAlign: "center", background: active ? "#0a140a" : "transparent", borderLeft: "1px solid #1e1e1e" }}>
                          {active ? (
                            theta !== null ? (
                              <div>
                                <div style={{ color: "#44dd88", fontWeight: 700, fontSize: "0.95rem" }}>
                                  {theta.toFixed(2)}
                                </div>
                                <div style={{ fontSize: "0.64rem", color: "#2a5a2a", marginTop: 1 }}>
                                  P = {(classes[j].fare / classes[i].fare).toFixed(3)}
                                </div>
                              </div>
                            ) : <span style={{ color: "#553333", fontSize: "0.75rem" }}>inválido</span>
                          ) : (
                            <span style={{ color: "#1e1e1e" }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>

              {/* EMSRa totals footer */}
              <tfoot>
                <tr style={{ background: "#111", borderTop: "2px solid #2a2a2a" }}>
                  <td colSpan={4} style={{ padding: "10px 16px", textAlign: "right", color: "#ff4444", fontWeight: 700, fontSize: "0.82rem" }}>
                    Σ EMSRa total →
                  </td>
                  {Array.from({ length: n - 1 }, (_, k) => {
                    const j = k + 1;
                    const total = emsrA[j];
                    return (
                      <td key={k} style={{ padding: "10px 14px", textAlign: "center", borderLeft: "1px solid #1e1e1e", background: "#1a1000" }}>
                        {total !== null ? (
                          <span style={{ color: "#ffaa44", fontWeight: 700, fontSize: "1.05rem" }}>
                            {total.toFixed(1)}
                          </span>
                        ) : <span style={{ color: "#553333", fontSize: "0.8rem" }}>—</span>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Summary cards */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          {Array.from({ length: n - 1 }, (_, k) => {
            const j = k + 1;
            const total = emsrA[j];
            const terms = Array.from({ length: j }, (_, i) => matrix[i][j]);
            return (
              <div key={k} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "10px 14px", flex: "1 1 160px", minWidth: 140 }}>
                <div style={{ fontSize: "0.7rem", color: "#555", marginBottom: 4 }}>
                  Protección vs Clase {j + 1} (${classes[j].fare})
                </div>
                <div style={{ color: "#ffaa44", fontSize: "1.15rem", fontWeight: 700 }}>
                  {total !== null ? total.toFixed(1) : "—"}
                </div>
                <div style={{ fontSize: "0.67rem", color: "#444", marginTop: 4 }}>
                  = {terms.map(v => v !== null ? v.toFixed(1) : "?").join(" + ")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Step-by-step breakdown */}
        <div style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16 }}>
          <div style={{ color: "#555", fontSize: "0.72rem", fontWeight: 600, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Cálculo paso a paso
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {Array.from({ length: n - 1 }, (_, i) =>
              Array.from({ length: n - 1 - i }, (_, jj) => {
                const j = i + 1 + jj;
                const theta = matrix[i][j];
                if (theta === null) return null;
                const ratio = classes[j].fare / classes[i].fare;
                const z = probit(1 - ratio);
                return (
                  <div key={`${i}-${j}`} style={{ background: "#111", borderRadius: 6, padding: "8px 12px", fontSize: "0.77rem", fontFamily: "monospace", color: "#888", lineHeight: 1.7 }}>
                    <span style={{ color: "#ff7755" }}>θ[{i+1},{j+1}]</span>
                    {" = "}
                    <span style={{ color: "#aaa" }}>{classes[i].mu}</span>
                    {" + "}
                    <span style={{ color: "#aaa" }}>{classes[i].sigma}</span>
                    {" × Φ⁻¹(1 − "}
                    <span style={{ color: "#88aaff" }}>{classes[j].fare}</span>
                    {"/"}
                    <span style={{ color: "#88aaff" }}>{classes[i].fare}</span>
                    {")  =  "}
                    <span style={{ color: "#aaa" }}>{classes[i].mu}</span>
                    {" + "}
                    <span style={{ color: "#aaa" }}>{classes[i].sigma}</span>
                    {" × Φ⁻¹("}
                    <span style={{ color: "#cc99ff" }}>{(1 - ratio).toFixed(4)}</span>
                    {")  =  "}
                    <span style={{ color: "#aaa" }}>{classes[i].mu}</span>
                    {" + "}
                    <span style={{ color: "#aaa" }}>{classes[i].sigma}</span>
                    {" × ("}
                    <span style={{ color: "#cc99ff" }}>{z.toFixed(4)}</span>
                    {")  =  "}
                    <span style={{ color: "#44dd88", fontWeight: 700 }}>{theta.toFixed(2)}</span>
                  </div>
                );
              }).filter(Boolean)
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
