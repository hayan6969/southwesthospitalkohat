
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

type MiniChartProps = {
  data: Array<{ value: number }>;
  type: "line" | "area" | "bar";
  color: string;
};

export function MiniChart({ data, type, color }: MiniChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      {type === "line" && (
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      )}
      {type === "area" && (
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      )}
      {type === "bar" && (
        <BarChart data={data}>
          <Bar dataKey="value" fill={color} />
        </BarChart>
      )}
    </ResponsiveContainer>
  );
}
