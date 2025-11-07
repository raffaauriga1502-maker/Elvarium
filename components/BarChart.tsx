import React from 'react';
import { Character } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface BarChartProps {
  stats: Character['stats'];
  width?: number;
  height?: number;
}

const STAT_KEYS: (keyof Character['stats'])[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const MAX_STAT_VALUE = 20;

const BarChart: React.FC<BarChartProps> = ({ stats, width = 300, height = 200 }) => {
  const { t } = useI18n();
  const STAT_LABELS = STAT_KEYS.map(key => t(`characterCard.statsShort.${key}`));
  const barCount = STAT_KEYS.length;
  const padding = { top: 20, right: 20, bottom: 30, left: 30 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const barPadding = 0.4;
  const barWidth = chartWidth / barCount * (1 - barPadding);

  return (
    <svg width={width} height={height} className="mx-auto">
       <defs>
        <linearGradient id="barGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#38BDF8" />
          <stop offset="100%" stopColor="#1E40AF" />
        </linearGradient>
      </defs>
      <g transform={`translate(${padding.left}, ${padding.top})`}>
        {/* Y-Axis */}
        <line x1="0" y1="0" x2="0" y2={chartHeight} stroke="#94A3B8" strokeWidth="1" />
        {[0, 5, 10, 15, 20].map(val => {
           const y = chartHeight - (val / MAX_STAT_VALUE) * chartHeight;
           return (
            <g key={val}>
                <line x1="-5" y1={y} x2="0" y2={y} stroke="#94A3B8" strokeWidth="1" />
                <text x="-10" y={y + 4} fill="#94A3B8" fontSize="10" textAnchor="end">{val}</text>
                <line x1="0" y1={y} x2={chartWidth} y2={y} stroke="#475569" strokeWidth="0.5" strokeDasharray="2 2" />
            </g>
           )
        })}
        
        {/* X-Axis */}
        <line x1="0" y1={chartHeight} x2={chartWidth} y2={chartHeight} stroke="#94A3B8" strokeWidth="1" />

        {/* Bars and Labels */}
        {STAT_KEYS.map((key, i) => {
          const value = stats[key];
          const barHeight = (value / MAX_STAT_VALUE) * chartHeight;
          const x = (chartWidth / barCount) * i + (chartWidth / barCount * barPadding / 2);
          const y = chartHeight - barHeight;

          return (
            <g key={key}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="url(#barGradient)"
              />
              <text
                x={x + barWidth / 2}
                y={chartHeight + 15}
                fill="#E2E8F0"
                fontSize="12"
                fontWeight="bold"
                textAnchor="middle"
              >
                {STAT_LABELS[i]}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

export default BarChart;