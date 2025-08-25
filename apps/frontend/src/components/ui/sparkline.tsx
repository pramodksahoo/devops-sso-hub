import React from 'react';
import { ResponsiveContainer, AreaChart, Area, LineChart, Line } from 'recharts';

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string; // tailwind color or hex
  variant?: 'area' | 'line';
}

export const Sparkline: React.FC<SparklineProps> = ({ data, height = 40, color = '#3b82f6', variant = 'area' }) => {
  const formatted = data.map((y, x) => ({ x, y }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        {variant === 'area' ? (
          <AreaChart data={formatted} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <defs>
              <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="y" stroke={color} fill="url(#spark)" strokeWidth={2} />
          </AreaChart>
        ) : (
          <LineChart data={formatted} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
            <Line type="monotone" dataKey="y" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
