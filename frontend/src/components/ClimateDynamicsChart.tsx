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
    <section className="rounded-2xl bg-white p-4 sm:p-7 border border-black/5 shadow-sm mb-6 sm:mb-8">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3.5">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 tracking-tight">
            Динамика климатических параметров
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Непрерывный поток телеметрии из PostgreSQL ({history.length} замеров в окне мониторинга)
          </p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">


          {/* Interactive Legend */}
          <div className="flex items-center gap-3 text-xs">
            {(viewMode === "ALL" || viewMode === "TEMP") && (
              <div className="flex items-center gap-1.5 font-medium text-blue-600">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                <span>Температура (°C)</span>
              </div>
            )}
            {(viewMode === "ALL" || viewMode === "HUM") && (
              <div className="flex items-center gap-1.5 font-medium text-emerald-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Влажность (%)</span>
              </div>
            )}
          </div>
          {/* Segmented Filter Mode: ALL / TEMP / HUM */}
          <div className="inline-flex items-center bg-gray-100/90 p-1 rounded-xl gap-1">
            <button
              onClick={() => setViewMode("ALL")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${viewMode === "ALL" ? "bg-white text-gray-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
            >
              Все данные
            </button>
            <button
              onClick={() => setViewMode("TEMP")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${viewMode === "TEMP" ? "bg-white text-gray-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
            >
              Температура
            </button>
            <button
              onClick={() => setViewMode("HUM")}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all cursor-pointer ${viewMode === "HUM" ? "bg-white text-gray-900 font-semibold shadow-sm" : "text-gray-500 hover:text-gray-900"
                }`}
            >
              Влажность
            </button>
          </div>
        </div>
      </div>

      {/* SVG Chart with Y-Axes and Tooltip */}
      {chartData.hasData ? (
        <div className="relative w-full overflow-x-auto">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-[260px] cursor-crosshair"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              {/* Apple-style subtle gradients with vibrant sapphire blue and emerald green */}
              <linearGradient id="tempFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0071e3" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0071e3" stopOpacity="0.01" />
              </linearGradient>
              <linearGradient id="humFillGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.20" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.01" />
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
                    fill="#0071e3"
                    opacity="0.9"
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
                    fill="#10b981"
                    opacity="0.9"
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
                stroke="#0071e3"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {(viewMode === "ALL" || viewMode === "HUM") && (
              <path
                d={chartData.humPath}
                fill="none"
                stroke="#10b981"
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
                      r={hoverIndex === i ? "5" : "3.5"}
                      fill="#ffffff"
                      stroke="#0071e3"
                      strokeWidth={hoverIndex === i ? "3" : "2"}
                    />
                  )}
                  {(viewMode === "ALL" || viewMode === "HUM") && h.humidity !== null && (
                    <circle
                      cx={x}
                      cy={chartData.getYHum(h.humidity)}
                      r={hoverIndex === i ? "5" : "3.5"}
                      fill="#ffffff"
                      stroke="#10b981"
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
                left: Math.min(
                  width - 240,
                  Math.max(12, ((chartData.getX(hoverIndex) / width) * 100))
                ) + "%",
              }}
              className="absolute top-3.5 -translate-x-1/2 bg-white/95 backdrop-blur-xl border border-black/10 rounded-xl p-3 shadow-xl text-xs pointer-events-none z-20 min-w-[190px]"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 text-gray-500 text-xs">
                  <Clock size={12} />
                  <span>{formatLocalTime(hoveredItem.recorded_at)}</span>
                </div>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${hoveredItem.fan_active
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                    : "bg-gray-100 text-gray-600 border-gray-200/60"
                    }`}
                >
                  {hoveredItem.fan_active ? "Вентилятор ВКЛ" : "Вентилятор ВЫКЛ"}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between gap-3">
                  <span className="text-blue-600 font-medium flex items-center gap-1">
                    <Thermometer size={13} /> Температура:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {hoveredItem.temperature !== null ? `${hoveredItem.temperature.toFixed(1)} °C` : "--"}
                  </span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-emerald-600 font-medium flex items-center gap-1">
                    <Droplets size={13} /> Влажность:
                  </span>
                  <span className="font-semibold text-gray-900">
                    {hoveredItem.humidity !== null ? `${hoveredItem.humidity.toFixed(1)} %` : "--"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Timeline with Synchronized Local Time */}
          <div
            style={{
              padding: `0 ${padRight}px 0 ${padLeft}px`
            }}
            className="flex flex-col sm:flex-row justify-between items-center gap-1 sm:gap-2 mt-2.5 text-xs text-gray-400"
          >
            <span>
              Начало окна: <strong className="text-gray-700 font-medium">{formatLocalTime(history[0]?.recorded_at)}</strong>
            </span>
            <span className="text-gray-500">
              Шкала: {chartData.minT}°–{chartData.maxT}°C • {chartData.minH}%–{chartData.maxH}%
            </span>
            <span>
              Текущий замер: <strong className="text-gray-700 font-medium">{formatLocalTime(history[history.length - 1]?.recorded_at)}</strong>
            </span>
          </div>
        </div>
      ) : (
        <div className="py-12 px-5 text-center text-sm text-gray-400">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-60" />
          <p>Ожидание накопления замеров телеметрии от прибора...</p>
        </div>
      )}
    </section>
  );
}
