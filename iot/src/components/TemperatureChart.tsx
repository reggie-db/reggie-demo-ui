import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { TemperatureDataPoint } from '../services/deviceService';

interface TemperatureChartProps {
  data: TemperatureDataPoint[];
}

export function TemperatureChart({ data }: TemperatureChartProps) {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis 
          dataKey="time" 
          stroke="#64748b"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickMargin={8}
        />
        <YAxis 
          stroke="#64748b"
          tick={{ fontSize: 12, fill: '#64748b' }}
          tickMargin={8}
          label={{ value: 'Temperature (°F)', angle: -90, position: 'insideLeft', style: { fontSize: 12, fill: '#64748b' } }}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: 'white', 
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#0f172a'
          }}
          formatter={(value: number) => [`${value.toFixed(1)}°F`, '']}
        />
        <Legend 
          wrapperStyle={{ fontSize: '12px', color: '#64748b' }}
          iconType="line"
        />
        <ReferenceLine y={80} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Warning', position: 'right', fontSize: 11, fill: '#64748b' }} />
        <ReferenceLine y={90} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Critical', position: 'right', fontSize: 11, fill: '#64748b' }} />
        <Line 
          type="monotone" 
          dataKey="temperature" 
          stroke="#dc2626" 
          strokeWidth={2}
          dot={false}
          name="Temperature"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
