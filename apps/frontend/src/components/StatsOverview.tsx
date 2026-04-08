import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { getApiUrl } from '../utils/config';

interface OverviewStats {
  totalClicks: number;
  uniqueClicks: number;
  firstClick: string | null;
  lastClick: string | null;
}

interface Props {
  code: string;
}

export default function StatsOverview({ code }: Props) {
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    console.log('[StatsOverview] Fetching stats for code:', code);
    
    if (!code) {
      console.log('[StatsOverview] No code provided');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('token');
    console.log('[StatsOverview] Token exists:', !!token);
    
    if (!token) {
      console.log('[StatsOverview] No token, not fetching');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/stats/${code}/overview`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) throw new Error('Error al cargar estadísticas');

      const json = await response.json();
      console.log('[StatsOverview] Stats data:', json.data);
      const statsData = json.data || {};
      setStats({
        totalClicks: statsData.totalClicks || 0,
        uniqueClicks: statsData.uniqueClicks || 0,
        firstClick: statsData.firstClick,
        lastClick: statsData.lastClick,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalClicks: 0,
        uniqueClicks: 0,
        firstClick: null,
        lastClick: null,
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
          <div key={i} className="card p-5 border border-white/5">
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
      color: 'accent',
    },
    {
      label: 'Clics únicos',
      value: stats?.uniqueClicks.toLocaleString() || '0',
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
      label: 'Primer clic',
      value: stats?.firstClick 
        ? new Date(stats.firstClick).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        : 'N/A',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
      ),
      color: 'success',
    },
    {
      label: 'Último clic',
      value: stats?.lastClick 
        ? new Date(stats.lastClick).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
        : 'N/A',
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
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
          className="card p-5 group hover:border-accent-500/30 transition-all duration-300 border border-white/5"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-ink-500 uppercase tracking-wide font-medium">
              {stat.label}
            </p>
            <div className={clsx(
              'w-8 h-8 rounded-lg flex items-center justify-center',
              stat.color === 'accent' && 'bg-accent-500/10 border border-accent-500/20 text-accent-400',
              stat.color === 'info' && 'bg-info/10 border border-info/20 text-info',
              stat.color === 'success' && 'bg-success/10 border border-success/20 text-success',
              stat.color === 'warning' && 'bg-warning/10 border border-warning/20 text-warning',
            )}>
              {stat.icon}
            </div>
          </div>
          <p className="text-2xl font-semibold tabular-nums text-ink-100">
            {stat.value}
          </p>
        </div>
      ))}
    </div>
  );
}
