import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';

interface OverviewStats {
  totalClicks: number;
  uniqueVisitors: number;
  avgCtr: number;
  topCountry: string;
  topDevice: string;
}

export default function StatsOverview() {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const code = window.location.pathname.split('/').pop();

  const fetchStats = useCallback(async () => {
    if (!code) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3000/api/v1/stats/${code}/overview`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const data = await response.json();
      setStats({
        totalClicks: data.totalClicks || 0,
        uniqueVisitors: data.uniqueVisitors || 0,
        avgCtr: data.avgCtr || 0,
        topCountry: data.topCountry || 'N/A',
        topDevice: data.topDevice || 'N/A',
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Set default values on error
      setStats({
        totalClicks: 0,
        uniqueVisitors: 0,
        avgCtr: 0,
        topCountry: 'N/A',
        topDevice: 'N/A',
      });
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="card p-5">
            <div className="skeleton h-3 w-16 mb-3"></div>
            <div className="skeleton h-7 w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Clics totales',
      value: stats?.totalClicks.toLocaleString() || '0',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5"/>
        </svg>
      ),
      color: 'brand',
    },
    {
      label: 'Visitantes únicos',
      value: stats?.uniqueVisitors.toLocaleString() || '0',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: 'info',
    },
    {
      label: 'CTR promedio',
      value: `${stats?.avgCtr.toFixed(1)}%`,
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
      ),
      color: 'success',
    },
    {
      label: 'Top país',
      value: stats?.topCountry || 'N/A',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <path d="M2 12h20"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      ),
      color: 'warning',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <div 
          key={stat.label}
          className="card p-5 group hover:shadow-lift transition-shadow duration-300"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-surface-500 uppercase tracking-wide font-medium">
              {stat.label}
            </p>
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              stat.color === 'brand' && 'bg-brand-100 text-brand-600',
              stat.color === 'info' && 'bg-info-light text-info',
              stat.color === 'success' && 'bg-success-light text-success',
              stat.color === 'warning' && 'bg-warning-light text-warning',
            )}>
              {stat.icon}
            </div>
          </div>
          <p className="text-2xl font-semibold tabular-nums">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
