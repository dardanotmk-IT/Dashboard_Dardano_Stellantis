import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSQzTFJRY3T5bm4uFzywlykcF2O6-EL3C8ubDWZPUIZ2QoWousMtJ4RORh3Xh6dnCVDBAkxqQzmp3bt/pub?gid=1261317011&single=true&output=csv";

const BRAND_MAP_STARTS = [
  ["ALFA ROMEO", "Alfa Romeo"],
  ["ABARTH", "Abarth"],
  ["FIAT PROFESSIONAL", "Fiat Professional"],
  ["FIAT", "Fiat"],
  ["JEEP", "Jeep"],
  ["LANCIA", "Lancia"],
  ["MASERATI", "Maserati"],
  ["PEUGEOT", "Peugeot"],
  ["CITROEN", "Citroën"],
  ["CITROËN", "Citroën"],
  ["DS AUTOMOBILES", "DS Automobiles"],
  ["DS ", "DS Automobiles"],
  ["OPEL", "Opel"],
  ["VAUXHALL", "Vauxhall"],
];

const PSA_MODELS = {
  Peugeot: [
    "208",
    "308",
    "508",
    "2008",
    "3008",
    "5008",
    "PARTNER",
    "EXPERT",
    "TRAVELLER",
    "RIFTER",
    "BOXER",
  ],
  Citroën: [
    "C3",
    "C4",
    "C5",
    "BERLINGO",
    "JUMPY",
    "SPACETOURER",
    "JUMPER",
    "AMI",
  ],
  "DS Automobiles": ["DS3", "DS4", "DS7", "DS9"],
  Opel: [
    "CORSA",
    "ASTRA",
    "MOKKA",
    "GRANDLAND",
    "INSIGNIA",
    "COMBO",
    "VIVARO",
    "MOVANO",
    "CROSSLAND",
  ],
};

function detectBrand(row) {
  const mod2 = (row["Modello veicolo 2"] || "").toUpperCase().trim();
  for (const [key, val] of BRAND_MAP_STARTS)
    if (mod2.startsWith(key)) return val;
  for (const [brand, models] of Object.entries(PSA_MODELS))
    if (models.some((m) => mod2.includes(m))) return brand;
  return "Altro";
}

function getSede(div) {
  const d = (div || "").toString().trim().toUpperCase();
  if (d === "O85H" || d === "P85H") return "Milano";
  if (d === "O95H" || d === "P95H") return "Torino";
  return "N/D";
}

function enrich(rows) {
  return rows.map((r) => ({
    ...r,
    _brand: detectBrand(r),
    _sede: getSede(r["Divisione"]),
    _hasTelaio: !!(r["Numero esterno veicolo"] || "").trim(),
  }));
}

export default function App() {
  const [raw, setRaw] = useState([]);
  const [data, setData] = useState([]);
  const [filters, setFilters] = useState({
    mod2: "",
    esterno: "",
    colore: "",
    sede: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [dragging, setDragging] = useState(false);

  const loadFromURL = () => {
    setLoading(true);
    setError("");
    Papa.parse(CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      complete: (res) => {
        const e = enrich(res.data);
        setRaw(e);
        setData(e);
        setLastUpdate(new Date().toLocaleString("it-IT"));
        setLoading(false);
      },
      error: (err) => {
        setError("Errore fetch: " + err.message);
        setLoading(false);
      },
    });
  };

  const parseCSV = (file) => {
    setLoading(true);
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      encoding: "windows-1252",
      complete: (res) => {
        const e = enrich(res.data);
        setRaw(e);
        setData(e);
        setLastUpdate(new Date().toLocaleString("it-IT"));
        setLoading(false);
      },
      error: (err) => {
        setError("Errore: " + err.message);
        setLoading(false);
      },
    });
  };

  useEffect(() => {
    loadFromURL();
  }, []);

  useEffect(() => {
    let d = raw;
    if (filters.mod2)
      d = d.filter((r) =>
        (r["Modello veicolo 2"] || "")
          .toLowerCase()
          .includes(filters.mod2.toLowerCase())
      );
    if (filters.esterno)
      d = d.filter((r) =>
        (r["Numero esterno veicolo"] || "")
          .toLowerCase()
          .includes(filters.esterno.toLowerCase())
      );
    if (filters.colore)
      d = d.filter((r) =>
        (r["Descrizione colore"] || "")
          .toLowerCase()
          .includes(filters.colore.toLowerCase())
      );
    if (filters.sede) d = d.filter((r) => r._sede === filters.sede);
    setData(d);
  }, [filters, raw]);

  const totale = data.length;
  const aTelaio = data.filter((r) => r._hasTelaio).length;
  const inOrdine = totale - aTelaio;

  const sedeStats = {};
  data.forEach((r) => {
    const s = r._sede;
    if (s === "N/D") return;
    if (!sedeStats[s]) sedeStats[s] = { sede: s, Telaio: 0, "In Ordine": 0 };
    r._hasTelaio ? sedeStats[s].Telaio++ : sedeStats[s]["In Ordine"]++;
  });
  const sedeData = Object.values(sedeStats).sort((a, b) =>
    a.sede.localeCompare(b.sede)
  );

  const brandStats = {};
  data.forEach((r) => {
    const b = r._brand;
    if (!brandStats[b]) brandStats[b] = { brand: b, Telaio: 0, "In Ordine": 0 };
    r._hasTelaio ? brandStats[b].Telaio++ : brandStats[b]["In Ordine"]++;
  });
  const brandData = Object.values(brandStats).sort(
    (a, b) => b.Telaio + b["In Ordine"] - (a.Telaio + a["In Ordine"])
  );

  const modStats = {};
  data.forEach((r) => {
    const m = r["Modello veicolo 2"] || "N/D";
    modStats[m] = (modStats[m] || 0) + 1;
  });
  const topModelli = Object.entries(modStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([k, v]) => ({
      name: k.length > 24 ? k.slice(0, 24) + "…" : k,
      qty: v,
    }));

  const pieData = [
    { name: "A Telaio", value: aTelaio },
    { name: "In Ordine", value: inOrdine },
  ];
  const inp = {
    width: "100%",
    background: "#1e293b",
    border: "1px solid #334155",
    borderRadius: 8,
    padding: "7px 11px",
    color: "#e2e8f0",
    fontSize: 13,
    marginTop: 3,
    boxSizing: "border-box",
  };

  return (
    <div
      style={{
        background: "#0f172a",
        minHeight: "100vh",
        color: "#e2e8f0",
        fontFamily: "Inter,sans-serif",
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg,#1e3a5f,#1e293b)",
          padding: "20px 28px",
          borderBottom: "1px solid #1e40af",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: 20,
                fontWeight: 700,
                color: "#60a5fa",
                letterSpacing: 1,
              }}
            >
              🚗 STOCK DASHBOARD — Stellantis & You
            </h1>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#94a3b8" }}>
              Fleet B2B · Torino / Milano
              {lastUpdate && (
                <span style={{ marginLeft: 14, color: "#475569" }}>
                  ⏱ {lastUpdate}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              onClick={loadFromURL}
              disabled={loading}
              style={{
                background: "#2563eb",
                color: "#fff",
                border: "none",
                padding: "9px 18px",
                borderRadius: 8,
                cursor: loading ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 13,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "⏳ Caricamento…" : "🔄 Aggiorna dati"}
            </button>
            <label
              style={{
                background: "#334155",
                color: "#cbd5e1",
                padding: "9px 18px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              📂 CSV manuale
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  if (e.target.files[0]) parseCSV(e.target.files[0]);
                }}
                style={{ display: "none" }}
              />
            </label>
          </div>
        </div>
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            marginTop: 70,
            color: "#60a5fa",
            fontSize: 18,
          }}
        >
          ⏳ Caricamento dati da Google Sheets…
        </div>
      )}
      {error && (
        <div
          style={{
            margin: 28,
            background: "#7f1d1d",
            padding: 14,
            borderRadius: 8,
            color: "#fca5a5",
          }}
        >
          {error}
        </div>
      )}

      {!loading && !error && raw.length === 0 && (
        <div
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files[0];
            if (f) parseCSV(f);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          style={{
            margin: "50px auto",
            maxWidth: 400,
            textAlign: "center",
            border: `2px dashed ${dragging ? "#60a5fa" : "#334155"}`,
            borderRadius: 16,
            padding: "44px 28px",
            color: "#64748b",
          }}
        >
          <div style={{ fontSize: 44 }}>📊</div>
          <p
            style={{
              fontSize: 17,
              marginTop: 14,
              color: "#94a3b8",
              fontWeight: 600,
            }}
          >
            Trascina il CSV qui
          </p>
          <p style={{ fontSize: 12, marginTop: 6 }}>
            oppure usa il pulsante{" "}
            <strong style={{ color: "#60a5fa" }}>CSV manuale</strong> in alto
          </p>
        </div>
      )}

      {!loading && raw.length > 0 && (
        <div style={{ padding: "22px 28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
              gap: 14,
              marginBottom: 22,
            }}
          >
            {[
              { label: "Totale", value: totale, color: "#60a5fa", icon: "🗂️" },
              {
                label: "A Telaio",
                value: aTelaio,
                color: "#34d399",
                icon: "✅",
              },
              {
                label: "In Ordine",
                value: inOrdine,
                color: "#f59e0b",
                icon: "⏳",
              },
              {
                label: "% Telaio",
                value: totale
                  ? Math.round((aTelaio / totale) * 100) + "%"
                  : "—",
                color: "#a78bfa",
                icon: "📈",
              },
              {
                label: "Brand",
                value: Object.keys(brandStats).length,
                color: "#22d3ee",
                icon: "🏷️",
              },
              {
                label: "Sedi",
                value: Object.keys(sedeStats).length,
                color: "#fb923c",
                icon: "📍",
              },
            ].map((k) => (
              <div
                key={k.label}
                style={{
                  background: "#1e293b",
                  borderRadius: 12,
                  padding: "14px 18px",
                  borderLeft: `4px solid ${k.color}`,
                }}
              >
                <div style={{ fontSize: 20 }}>{k.icon}</div>
                <div style={{ fontSize: 26, fontWeight: 700, color: k.color }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                  {k.label}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              padding: "16px 20px",
              marginBottom: 24,
            }}
          >
            <p
              style={{
                margin: "0 0 12px",
                fontSize: 11,
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: 1,
                fontWeight: 600,
              }}
            >
              🔍 Filtri
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                gap: 12,
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Modello Veicolo 2
                </label>
                <input
                  value={filters.mod2}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, mod2: e.target.value }))
                  }
                  placeholder="Cerca modello…"
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  N° Esterno Veicolo
                </label>
                <input
                  value={filters.esterno}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, esterno: e.target.value }))
                  }
                  placeholder="Cerca telaio…"
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Colore
                </label>
                <input
                  value={filters.colore}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, colore: e.target.value }))
                  }
                  placeholder="Cerca colore…"
                  style={inp}
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 10,
                    color: "#64748b",
                    textTransform: "uppercase",
                    letterSpacing: 1,
                  }}
                >
                  Sede
                </label>
                <select
                  value={filters.sede}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, sede: e.target.value }))
                  }
                  style={{ ...inp, cursor: "pointer" }}
                >
                  <option value="">Tutte le sedi</option>
                  <option value="Milano">Milano</option>
                  <option value="Torino">Torino</option>
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "flex-end" }}>
                <button
                  onClick={() =>
                    setFilters({ mod2: "", esterno: "", colore: "", sede: "" })
                  }
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#cbd5e1",
                    padding: "7px 16px",
                    borderRadius: 8,
                    cursor: "pointer",
                    fontSize: 13,
                    width: "100%",
                  }}
                >
                  ✕ Reset filtri
                </button>
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(320px,1fr))",
              gap: 18,
              marginBottom: 24,
            }}
          >
            <div
              style={{ background: "#1e293b", borderRadius: 14, padding: 18 }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                📦 Telaio vs In Ordine
              </h3>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    outerRadius={78}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    <Cell fill="#34d399" />
                    <Cell fill="#f59e0b" />
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{ background: "#1e293b", borderRadius: 14, padding: 18 }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                📍 Per Sede
              </h3>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={sedeData} barSize={30}>
                  <XAxis
                    dataKey="sede"
                    stroke="#64748b"
                    tick={{ fill: "#cbd5e1", fontSize: 12 }}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  <Bar dataKey="Telaio" fill="#34d399" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="In Ordine"
                    fill="#f59e0b"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                background: "#1e293b",
                borderRadius: 14,
                padding: 18,
                gridColumn: "1 / -1",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                🏷️ Stock per Brand
              </h3>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={brandData} barSize={20}>
                  <XAxis
                    dataKey="brand"
                    stroke="#64748b"
                    tick={{ fill: "#cbd5e1", fontSize: 11 }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                    }}
                  />
                  <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
                  <Bar dataKey="Telaio" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar
                    dataKey="In Ordine"
                    fill="#f43f5e"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              style={{
                background: "#1e293b",
                borderRadius: 14,
                padding: 18,
                gridColumn: "1 / -1",
              }}
            >
              <h3
                style={{
                  margin: "0 0 12px",
                  fontSize: 13,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                🚘 Top Modelli
              </h3>
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={topModelli} layout="vertical" barSize={16}>
                  <XAxis
                    type="number"
                    stroke="#64748b"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke="#64748b"
                    tick={{ fill: "#cbd5e1", fontSize: 11 }}
                    width={168}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0f172a",
                      border: "1px solid #334155",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="qty" fill="#22d3ee" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            style={{
              background: "#1e293b",
              borderRadius: 14,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "14px 18px",
                borderBottom: "1px solid #334155",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#94a3b8",
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                📋 Dettaglio Record ({totale})
              </h3>
            </div>
            <div style={{ overflowX: "auto", maxHeight: 360 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                }}
              >
                <thead>
                  <tr style={{ background: "#0f172a" }}>
                    {[
                      "Brand",
                      "Modello Veicolo 2",
                      "N° Esterno Veicolo",
                      "Colore",
                      "Sede",
                      "Stato",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 13px",
                          textAlign: "left",
                          color: "#64748b",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          borderBottom: "1px solid #334155",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 200).map((r, i) => (
                    <tr
                      key={i}
                      style={{
                        borderBottom: "1px solid #1e293b",
                        background: i % 2 === 0 ? "#1e293b" : "#162032",
                      }}
                    >
                      <td
                        style={{
                          padding: "7px 13px",
                          color: "#a78bfa",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r._brand}
                      </td>
                      <td
                        style={{
                          padding: "7px 13px",
                          color: "#e2e8f0",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r["Modello veicolo 2"] || "—"}
                      </td>
                      <td
                        style={{
                          padding: "7px 13px",
                          color: r._hasTelaio ? "#34d399" : "#475569",
                          fontWeight: r._hasTelaio ? 600 : 400,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r["Numero esterno veicolo"] || "—"}
                      </td>
                      <td style={{ padding: "7px 13px", color: "#94a3b8" }}>
                        {r["Descrizione colore"] || "—"}
                      </td>
                      <td style={{ padding: "7px 13px" }}>
                        <span
                          style={{
                            background:
                              r._sede === "Torino" ? "#1e3a5f" : "#1c3329",
                            color: r._sede === "Torino" ? "#60a5fa" : "#34d399",
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {r._sede}
                        </span>
                      </td>
                      <td style={{ padding: "7px 13px" }}>
                        <span
                          style={{
                            background: r._hasTelaio ? "#14532d" : "#451a03",
                            color: r._hasTelaio ? "#4ade80" : "#fbbf24",
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {r._hasTelaio ? "✅ Telaio" : "⏳ Ordine"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length > 200 && (
                <div
                  style={{
                    padding: "10px 18px",
                    color: "#64748b",
                    fontSize: 12,
                  }}
                >
                  Mostrati 200 di {data.length} record. Usa i filtri per
                  restringere.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
