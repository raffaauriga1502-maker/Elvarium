import React from 'react';
import { Character } from '../types';
import { useI18n } from '../contexts/I18nContext';

interface RadarChartProps {
  stats: Character['stats'];
  size?: number;
}

const STAT_KEYS: (keyof Character['stats'])[] = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'];
const MAX_STAT_VALUE = 20; // Assume a max value for scaling

const RadarChart: React.FC<RadarChartProps> = ({ stats, size = 300 }) => {
  const { t } = useI18n();
  const center = size / 2;
  const radius = size * 0.35; // Slightly reduced to fit labels better

  const STAT_LABELS = STAT_KEYS.map(key => t(`characterCard.statsShort.${key}`));

  const points = STAT_KEYS.map((key, i) => {
    const value = stats[key];
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const statRadius = (Math.min(value, MAX_STAT_VALUE) / MAX_STAT_VALUE) * radius;
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
    const labelRadius = radius * 1.25;
    const x = center + labelRadius * Math.cos(angle);
    const y = center + labelRadius * Math.sin(angle);
    return { x, y };
  });

  return (
    <div className="w-full max-w-[350px] mx-auto aspect-square">
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full overflow-visible">
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
            fontSize="14"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
            className="drop-shadow-md"
          >
            {STAT_LABELS[i]}
          </text>
        ))}
      </svg>
    </div>
  );
};

export default RadarChart;