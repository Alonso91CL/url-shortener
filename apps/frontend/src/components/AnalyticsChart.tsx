import { useState, useEffect, useCallback } from 'react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

type ChartType = 'timeseries' | 'devices' | 'browsers';

interface Props {
  type: ChartType;
}

const COLORS = {
  brand: 'oklch(55% 0.22 50)',
  brandLight: 'oklch(85% 0.14 50)',
  info: 'oklch(60% 0.15 250)',
  success: 'oklch(60% 0.15 145)',
  warning: 'oklch(75% 0.18 85)',
};

const DEVICE_COLORS = ['oklch(55% 0.22 50)', 'oklch(60% 0.15 145)', 'oklch(75% 0.18 85)', 'oklch(60% 0.15 250)'];

export default function AnalyticsChart({ type }: Props) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const code = window.location.pathname.split('/').pop();

  const fetchData = useCallback(async () => {
    if (!code) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let endpoint = '';

      switch (type) {
        case 'timeseries':
          endpoint = `${code}/timeseries?days=${days}`;
          break;
        case 'devices':
          endpoint = `${code}/devices`;
          break;
        case 'browsers':
          endpoint = `${code}/browsers`;
          break;
        default:
          return;
      }

      const response = await fetch(`http://localhost:3000/api/v1/stats/${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar datos');

      const result = await response.json();
      
      // Transform data based on type
      switch (type) {
        case 'timeseries':
          setData(result.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
            clicks: item.clicks,
          })));
          break;
        case 'devices':
          setData(result.map((item: any) => ({
            name: item.device || 'Otro',
            value: item.count,
          })));
          break;
        case 'browsers':
          setData(result.map((item: any) => ({
            name: item.browser || 'Otro',
            value: item.count,
          })));
          break;
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
    } finally {
      setLoading(false);
    }
  }, [type, days, code]);

  useEffect(() => {
    fetchData();

    const handlePeriodChange = (e: CustomEvent) => {
      setDays(e.detail.days);
    };

    window.addEventListener('periodChange', handlePeriodChange as EventListener);
    return () => window.removeEventListener('periodChange', handlePeriodChange as EventListener);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="skeleton h-full w-full rounded-lg"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-surface-400">
        <div className="text-center">
          <svg className="w-12 h-12 mx-auto mb-2 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 3v18h18"/>
            <path d="M18 17V9"/>
            <path d="M13 17V5"/>
            <path d="M8 17v-3"/>
          </svg>
          <p className="text-sm">No hay datos para mostrar</p>
        </div>
      </div>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lift border border-surface-200">
          <p className="text-sm font-medium text-surface-900 mb-1">{label}</p>
          <p className="text-sm text-brand-600 font-semibold">
            {payload[0].value.toLocaleString()} clics
          </p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lift border border-surface-200">
          <p className="text-sm font-medium text-surface-900 mb-1">{payload[0].name}</p>
          <p className="text-sm font-semibold">
            {payload[0].value.toLocaleString()} ({((payload[0].value / data.reduce((a: number, b: any) => a + b.value, 0)) * 100).toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  switch (type) {
    case 'timeseries':
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="oklch(55% 0.22 50)" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="oklch(55% 0.22 50)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(93% 0.012 60)" vertical={false} />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12, fill: 'oklch(55% 0.025 60)' }}
              tickLine={false}
              axisLine={{ stroke: 'oklch(88% 0.015 60)' }}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: 'oklch(55% 0.025 60)' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area 
              type="monotone" 
              dataKey="clicks" 
              stroke="oklch(55% 0.22 50)" 
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorClicks)"
              dot={false}
              activeDot={{ r: 6, fill: 'oklch(55% 0.22 50)', strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'devices':
    case 'browsers':
      return (
        <div className="flex items-center gap-8 h-full">
          <div className="flex-1 h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={DEVICE_COLORS[index % DEVICE_COLORS.length]} 
                    />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-36 space-y-3">
            {data.map((item, index) => {
              const total = data.reduce((a: number, b: any) => a + b.value, 0);
              const percentage = ((item.value / total) * 100).toFixed(1);
              
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DEVICE_COLORS[index % DEVICE_COLORS.length] }}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-surface-500">{percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    default:
      return null;
  }
}
