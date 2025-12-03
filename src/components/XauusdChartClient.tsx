import React from "react";
import { ColorType, type IChartApi, type ISeriesApi, type Time, createChart } from "lightweight-charts";

interface PricePoint {
  t: number;
  c: number;
}

interface Props {
  prices: PricePoint[];
  forecast?: PricePoint[];
}

export function XauusdChartClient({ prices, forecast }: Props) {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const chartRef = React.useRef<IChartApi | null>(null);
  const seriesRef = React.useRef<ISeriesApi<"Area"> | null>(null);
  const forecastSeriesRef = React.useRef<ISeriesApi<"Line"> | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: "#ffffff" },
        textColor: "#475569",
      },
      rightPriceScale: {
        borderColor: "#e2e8f0",
      },
      timeScale: {
        borderColor: "#e2e8f0",
        timeVisible: true,
        secondsVisible: false,
      },
      grid: {
        vertLines: { color: "#f1f5f9" },
        horzLines: { color: "#f1f5f9" },
      },
    });

    const series = chart.addAreaSeries({
      lineColor: "#22c55e",
      topColor: "rgba(34,197,94,0.4)",
      bottomColor: "rgba(226,232,240,0.0)",
      lineWidth: 2,
    });

    const forecastSeries = chart.addLineSeries({
      color: "#6366f1",
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;
    forecastSeriesRef.current = forecastSeries;

    const handleResize = () => {
      if (!container) return;
      chart.applyOptions({ width: container.clientWidth, height: container.clientHeight });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      forecastSeriesRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!seriesRef.current || prices.length === 0) return;

    const data = prices.map((p) => ({
      time: (p.t / 1000) as Time,
      value: p.c,
    }));

    seriesRef.current.setData(data);

    if (forecastSeriesRef.current && forecast && forecast.length > 0) {
      const forecastData = forecast.map((p) => ({
        time: (p.t / 1000) as Time,
        value: p.c,
      }));
      forecastSeriesRef.current.setData(forecastData);
    } else if (forecastSeriesRef.current) {
      forecastSeriesRef.current.setData([]);
    }

    chartRef.current?.timeScale().fitContent();
  }, [prices, forecast]);
  return <div ref={containerRef} className="h-full w-full" />;
}
