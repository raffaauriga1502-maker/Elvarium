import React from 'react';
import { Character } from '../types';

interface RadarChartProps {
  stats: Character['stats'];
  size?: number;
}

const STAT_KEYS: (keyof Character['stats'])[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const STAT_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
const MAX_STAT_VALUE = 20; // Assume a max value for scaling

const RadarChart: React.FC<RadarChartProps> = ({ stats, size = 200 }) => {
  const center = size / 2;
  const radius = size * 0.4;

  const points = STAT_KEYS.map((key, i) => {
    const value = stats[key];
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const statRadius = (value / MAX_STAT_VALUE) * radius;
    const x = center + statRadius * Math.cos(angle);
    const y = center + statRadius * Math.sin(angle);
    return `${x},${y}`;
  }).join(' ');

  const axisPoints = STAT_KEYS.map((_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = center + radius * Math.cos(angle);
    const y = center + radius * Math.sin(angle);
    return { x, y };
  });

  const labelPoints = STAT_KEYS.map((_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const labelRadius = radius * 1.15;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return { x, y };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <defs>
        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* Background Web */}
      {[0.25, 0.5, 0.75, 1].map(scale => (
        <polygon
          key={scale}
          points={axisPoints.map(p => `${center + (p.x - center) * scale},${center + (p.y - center) * scale}`).join(' ')}
          fill="none"
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="1"
        />
      ))}

      {/* Axes */}
      {axisPoints.map((p, i) => (
        <line
          key={i}
          x1={center}
          y1={center}
          x2={p.x}
          y2={p.y}
          stroke="rgba(148, 163, 184, 0.2)"
          strokeWidth="1"
        />
      ))}
      
      {/* Stat Polygon */}
      <polygon
        points={points}
        fill="url(#radarGradient)"
        stroke="#38BDF8"
        strokeWidth="2"
      />

      {/* Labels */}
      {labelPoints.map((p, i) => (
        <text
          key={i}
          x={p.x}
          y={p.y}
          fill="#E2E8F0"
          fontSize="12"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {STAT_LABELS[i]}
        </text>
      ))}
    </svg>
  );
};

export default RadarChart;
