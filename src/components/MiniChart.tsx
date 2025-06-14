
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';

type MiniChartProps = {
  data: Array<{ value: number }>;
  type: "line" | "area" | "bar";
  color: string;
};

export function MiniChart({ data, type, color }: MiniChartProps) {
  const renderChart = () => {
    if (type === "line") {
      return (
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      );
    }
    
    if (type === "area") {
      return (
        <AreaChart data={data}>
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            fill={color}
            fillOpacity={0.3}
          />
        </AreaChart>
      );
    }
    
    return (
      <BarChart data={data}>
        <Bar dataKey="value" fill={color} />
      </BarChart>
    );
  };

  return (
    <ResponsiveContainer width="100%" height="100%">
      {renderChart()}
    </ResponsiveContainer>
  );
}
