"use client";

import React, { useState, useMemo, useRef } from "react";
import { RefreshCw, Thermometer, Droplets, Wind, Clock } from "lucide-react";

export interface HistoryPoint {
  recorded_at: string;
  temperature: number | null;
  humidity: number | null;
  fan_active: boolean;
}

interface ClimateDynamicsChartProps {
  history: HistoryPoint[];
}

function parseUtcDate(dateStr: string): Date {
  if (!dateStr) return new Date();
  const hasTimezone = dateStr.endsWith("Z") || dateStr.includes("+") || /-\d{2}:\d{2}$/.test(dateStr);
  const normalized = hasTimezone ? dateStr : `${dateStr}Z`;
  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? new Date(dateStr) : parsed;
}

function formatLocalTime(dateStr: string): string {
  try {
    const d = parseUtcDate(dateStr);
    return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function ClimateDynamicsChart({ history }: ClimateDynamicsChartProps) {
  const [viewMode, setViewMode] = useState<"ALL" | "TEMP" | "HUM">("ALL");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const width = 840;
  const height = 260;
  const padLeft = 52;
  const padRight = 52;
  const padTop = 24;
  const padBottom = 40;

  const chartData = useMemo(() => {
    if (!history || history.length < 2) {
      return {
        hasData: false,
        tempPath: "",
        humPath: "",
        tempArea: "",
        humArea: "",
        minT: 18,
        maxT: 28,
        minH: 30,
        maxH: 70,
        getX: () => 0,
        getYTemp: () => 0,
        getYHum: () => 0,
        gridLevels: []
      };
    }

    const temps = history.map((h) => h.temperature).filter((t): t is number => t !== null);
    const hums = history.map((h) => h.humidity).filter((h): h is number => h !== null);

    const minT = temps.length > 0 ? Math.floor(Math.min(...temps) - 0.8) : 18;
    const maxT = temps.length > 0 ? Math.ceil(Math.max(...temps) + 0.8) : 28;
    const minH = hums.length > 0 ? Math.floor(Math.min(...hums) - 1.5) : 30;
    const maxH = hums.length > 0 ? Math.ceil(Math.max(...hums) + 1.5) : 70;

    const diffT = maxT === minT ? 1 : maxT - minT;
    const diffH = maxH === minH ? 1 : maxH - minH;

    const plotWidth = width - padLeft - padRight;
    const plotHeight = height - padTop - padBottom;

    const getX = (index: number) => padLeft + (index / (history.length - 1)) * plotWidth;
    const getYTemp = (val: number | null) => {
      const v = val ?? minT;
      return height - padBottom - ((v - minT) / diffT) * plotHeight;
    };
    const getYHum = (val: number | null) => {
      const v = val ?? minH;
      return height - padBottom - ((v - minH) / diffH) * plotHeight;
    };

    // Construct curve paths
    const tempPoints = history.map((h, i) => ({ x: getX(i), y: getYTemp(h.temperature) }));
    const humPoints = history.map((h, i) => ({ x: getX(i), y: getYHum(h.humidity) }));

    const tempPath = tempPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
    const humPath = humPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

    // Construct Area paths for subtle gradient fill
    const baselineY = height - padBottom;
    const tempArea = `${tempPath} L ${tempPoints[tempPoints.length - 1].x.toFixed(1)} ${baselineY} L ${tempPoints[0].x.toFixed(1)} ${baselineY} Z`;
    const humArea = `${humPath} L ${humPoints[humPoints.length - 1].x.toFixed(1)} ${baselineY} L ${humPoints[0].x.toFixed(1)} ${baselineY} Z`;

    // 4 Horizontal grid levels with calibrated real values
    const gridLevels = [0, 0.33, 0.66, 1].map((ratio) => {
      const y = padTop + ratio * plotHeight;
      const tVal = (maxT - ratio * diffT).toFixed(1);
      const hVal = Math.round(maxH - ratio * diffH);
      return { y, tVal, hVal };
    });

    return {
      hasData: true,
      tempPath,
      humPath,
      tempArea,
      humArea,
      minT,
      maxT,
      minH,
      maxH,
      getX,
      getYTemp,
      getYHum,
      gridLevels
    };
  }, [history, width, height, padLeft, padRight, padTop, padBottom]);

  // Handle Mouse Hover / Crosshair
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || !history || history.length < 2) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    const plotWidth = width - padLeft - padRight;
    const clampedX = Math.max(padLeft, Math.min(width - padRight, mouseX));
    const normalizedRatio = (clampedX - padLeft) / plotWidth;
    const rawIndex = Math.round(normalizedRatio * (history.length - 1));
    const index = Math.max(0, Math.min(history.length - 1, rawIndex));
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const hoveredItem = hoverIndex !== null && history[hoverIndex] ? history[hoverIndex] : null;

  return (
    <section className="apple-card" style={{ padding: "26px 30px", marginBottom: 28 }}>
      {/* Header & Controls */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 14
        }}
      >
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, color: "var(--text-primary)", letterSpacing: "-0.015em" }}>
            Динамика климатических параметров
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginTop: 2 }}>
            Непрерывный поток телеметрии из PostgreSQL ({history.length} замеров в окне мониторинга)
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          {/* Segmented Filter Mode: ALL / TEMP / HUM */}
          <div className="segmented-control" style={{ padding: 3 }}>
            <button
              onClick={() => setViewMode("ALL")}
              className={`segmented-control-btn ${viewMode === "ALL" ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "4px 10px" }}
            >
              Все данные
            </button>
            <button
              onClick={() => setViewMode("TEMP")}
              className={`segmented-control-btn ${viewMode === "TEMP" ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "4px 10px", color: viewMode === "TEMP" ? "var(--accent-blue)" : undefined }}
            >
              Температура
            </button>
            <button
              onClick={() => setViewMode("HUM")}
              className={`segmented-control-btn ${viewMode === "HUM" ? "active" : ""}`}
              style={{ fontSize: "0.75rem", padding: "4px 10px", color: viewMode === "HUM" ? "var(--accent-teal)" : undefined }}
            >
              Влажность
            </button>
          </div>

          {/* Interactive Legend */}
          <div style={{ display: "flex", gap: 14, fontSize: "0.8125rem" }}>
            {(viewMode === "ALL" || viewMode === "TEMP") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent-blue)" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Температура (°C)</span>
              </div>
            )}
            {(viewMode === "ALL" || viewMode === "HUM") && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent-teal)" }} />
                <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Влажность (%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SVG Chart with Y-Axes and Tooltip */}
      {chartData.hasData ? (
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            style={{ width: "100%", height: 260, cursor: "crosshair" }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Apple-style subtle gradients */}
              <linearGradient id="tempFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="humFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent-teal)" stopOpacity="0.18" />
                <stop offset="100%" stopColor="var(--accent-teal)" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid Lines & Y-Axis Labels */}
            {chartData.gridLevels.map((lvl, idx) => (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={lvl.y}
                  x2={width - padRight}
                  y2={lvl.y}
                  stroke="rgba(0, 0, 0, 0.05)"
                  strokeDasharray="4 4"
                />
                {/* Left Y Axis Label (Temperature °C) */}
                {(viewMode === "ALL" || viewMode === "TEMP") && (
                  <text
                    x={padLeft - 10}
                    y={lvl.y + 4}
                    textAnchor="end"
                    fontSize="11"
                    fontWeight="500"
                    fill="var(--accent-blue)"
                    opacity="0.85"
                  >
                    {lvl.tVal}°
                  </text>
                )}
                {/* Right Y Axis Label (Humidity %) */}
                {(viewMode === "ALL" || viewMode === "HUM") && (
                  <text
                    x={width - padRight + 10}
                    y={lvl.y + 4}
                    textAnchor="start"
                    fontSize="11"
                    fontWeight="500"
                    fill="var(--accent-teal)"
                    opacity="0.85"
                  >
                    {lvl.hVal}%
                  </text>
                )}
              </g>
            ))}

            {/* Area Fills */}
            {(viewMode === "ALL" || viewMode === "TEMP") && (
              <path d={chartData.tempArea} fill="url(#tempFillGrad)" />
            )}
            {(viewMode === "ALL" || viewMode === "HUM") && (
              <path d={chartData.humArea} fill="url(#humFillGrad)" />
            )}

            {/* Lines */}
            {(viewMode === "ALL" || viewMode === "TEMP") && (
              <path
                d={chartData.tempPath}
                fill="none"
                stroke="var(--accent-blue)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {(viewMode === "ALL" || viewMode === "HUM") && (
              <path
                d={chartData.humPath}
                fill="none"
                stroke="var(--accent-teal)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Regular Dots */}
            {history.map((h, i) => {
              const x = chartData.getX(i);
              return (
                <g key={i}>
                  {(viewMode === "ALL" || viewMode === "TEMP") && h.temperature !== null && (
                    <circle
                      cx={x}
                      cy={chartData.getYTemp(h.temperature)}
                      r={hoverIndex === i ? "5" : "3"}
                      fill="#ffffff"
                      stroke="var(--accent-blue)"
                      strokeWidth={hoverIndex === i ? "3" : "2"}
                    />
                  )}
                  {(viewMode === "ALL" || viewMode === "HUM") && h.humidity !== null && (
                    <circle
                      cx={x}
                      cy={chartData.getYHum(h.humidity)}
                      r={hoverIndex === i ? "5" : "3"}
                      fill="#ffffff"
                      stroke="var(--accent-teal)"
                      strokeWidth={hoverIndex === i ? "3" : "2"}
                    />
                  )}
                </g>
              );
            })}

            {/* Hover Vertical Crosshair Guideline */}
            {hoverIndex !== null && (
              <line
                x1={chartData.getX(hoverIndex)}
                y1={padTop}
                x2={chartData.getX(hoverIndex)}
                y2={height - padBottom}
                stroke="rgba(0, 113, 227, 0.35)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
            )}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredItem && hoverIndex !== null && (
            <div
              style={{
                position: "absolute",
                top: 14,
                left: Math.min(
                  width - 240,
                  Math.max(12, ((chartData.getX(hoverIndex) / width) * 100))
                ) + "%",
                transform: "translateX(-50%)",
                background: "rgba(255, 255, 255, 0.94)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(0, 0, 0, 0.08)",
                borderRadius: "10px",
                padding: "10px 14px",
                boxShadow: "0 8px 24px rgba(0, 0, 0, 0.12)",
                fontSize: "0.8125rem",
                pointerEvents: "none",
                zIndex: 10,
                minWidth: 190
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid rgba(0,0,0,0.06)",
                  paddingBottom: 6,
                  marginBottom: 8
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                  <Clock size={12} />
                  <span>{formatLocalTime(hoveredItem.recorded_at)}</span>
                </div>
                <span
                  style={{
                    fontSize: "0.7rem",
                    padding: "2px 6px",
                    borderRadius: "4px",
                    background: hoveredItem.fan_active ? "var(--accent-green-light)" : "rgba(142, 142, 147, 0.12)",
                    color: hoveredItem.fan_active ? "#1e7e34" : "#636366",
                    fontWeight: 600
                  }}
                >
                  {hoveredItem.fan_active ? "Вентилятор ВКЛ" : "Вентилятор ВЫКЛ"}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--accent-blue)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <Thermometer size={13} /> Температура:
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {hoveredItem.temperature !== null ? `${hoveredItem.temperature.toFixed(1)} °C` : "--"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <span style={{ color: "var(--accent-teal)", fontWeight: 500, display: "flex", alignItems: "center", gap: 4 }}>
                    <Droplets size={13} /> Влажность:
                  </span>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                    {hoveredItem.humidity !== null ? `${hoveredItem.humidity.toFixed(1)} %` : "--"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Timeline with Synchronized Local Time */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              fontSize: "0.75rem",
              color: "var(--text-muted)",
              padding: `0 ${padRight}px 0 ${padLeft}px`
            }}
          >
            <span>
              Начало окна: <strong>{formatLocalTime(history[0]?.recorded_at)}</strong>
            </span>
            <span style={{ color: "var(--text-secondary)" }}>
              Шкала: {chartData.minT}°–{chartData.maxT}°C • {chartData.minH}%–{chartData.maxH}%
            </span>
            <span>
              Текущий замер: <strong>{formatLocalTime(history[history.length - 1]?.recorded_at)}</strong>
            </span>
          </div>
        </div>
      ) : (
        <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          <RefreshCw size={24} className="spin-active" style={{ margin: "0 auto 12px auto", opacity: 0.6 }} />
          <p>Ожидание накопления замеров телеметрии от прибора...</p>
        </div>
      )}
    </section>
  );
}
