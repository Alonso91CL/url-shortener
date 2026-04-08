import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import CopyButton from './CopyButton';
import { confirmDelete, notifySuccess, notifyError } from '../utils/notifications';
import { getShortUrl, getApiUrl } from '../utils/config';

interface Link {
  id: string;
  code: string;
  originalUrl: string;
  clickCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function LinkTable() {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return;
      }
      
      const response = await fetch(getApiUrl('/links'), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return;
        }
        const data = await response.json();
        throw new Error(data.error || 'Error al cargar los enlaces');
      }

      const data = await response.json();
      console.log('API Response:', data);
      console.log('data.data:', data.data);
      setLinks(Array.isArray(data.data) ? data.data : []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los enlaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();

    const handleLinkCreated = () => {
      fetchLinks();
    };

    const handleRefresh = () => {
      fetchLinks();
    };

    window.addEventListener('linkCreated', handleLinkCreated);
    window.addEventListener('refreshLinks', handleRefresh);
    return () => {
      window.removeEventListener('linkCreated', handleLinkCreated);
      window.removeEventListener('refreshLinks', handleRefresh);
    };
  }, [fetchLinks]);

  const handleDelete = async (code: string) => {
    const confirmed = await confirmDelete(
      '¿Eliminar enlace?',
      'Esta acción no se puede deshacer. El enlace dejará de funcionar.'
    );
    
    if (!confirmed) {
      return;
    }

    setDeletingId(code);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(getApiUrl(`/links/${code}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el enlace');
      }

      setLinks((prev) => prev.filter((link) => link.code !== code));
      notifySuccess('Enlace eliminado correctamente');
    } catch (err) {
      notifyError(err instanceof Error ? err.message : 'Error al eliminar el enlace');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  };

  const truncateUrl = (url: string, maxLength = 40) => {
    if (url.length <= maxLength) return url;
    return url.slice(0, maxLength) + '...';
  };

  if (loading) {
    return (
      <div className="card overflow-hidden border border-white/5">
        <div className="divide-y divide-white/5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-4">
              <div className="skeleton h-10 w-10 rounded-lg flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-48"></div>
                <div className="skeleton h-3 w-24"></div>
              </div>
              <div className="skeleton h-8 w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center border border-error/20">
        <div className="w-12 h-12 bg-error/10 border border-error/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <p className="text-error mb-4">{error}</p>
        <button onClick={fetchLinks} className="btn btn-secondary text-sm">
          Reintentar
        </button>
      </div>
    );
  }

  if (links.length === 0) {
    return (
      <div className="card p-12 text-center border border-white/5">
        <div className="w-16 h-16 bg-accent-500/10 border border-accent-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
            <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <h3 className="font-sans text-lg font-semibold mb-2 text-ink-100">No tienes enlaces todavía</h3>
        <p className="text-ink-500 text-sm max-w-xs mx-auto mb-6">
          Crea tu primer enlace corto usando el formulario de arriba y empieza a rastrear clics.
        </p>
        <a href="/" className="btn btn-primary text-sm">
          Crear mi primer enlace
        </a>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden border border-white/5">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/5 bg-surface-800/50">
              <th className="text-left p-4 text-xs font-medium text-ink-500 uppercase tracking-wide">
                Enlace corto
              </th>
              <th className="text-left p-4 text-xs font-medium text-ink-500 uppercase tracking-wide hidden sm:table-cell">
                Original
              </th>
              <th className="text-right p-4 text-xs font-medium text-ink-500 uppercase tracking-wide">
                Clics
              </th>
              <th className="text-center p-4 text-xs font-medium text-ink-500 uppercase tracking-wide hidden md:table-cell">
                Fecha
              </th>
              <th className="text-center p-4 text-xs font-medium text-ink-500 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {links.map((link) => (
              <tr 
                key={link.id} 
                className={clsx(
                  'group transition-colors hover:bg-surface-800/50',
                  deletingId === link.code && 'opacity-50'
                )}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      link.isActive ? 'bg-accent-500/10 border border-accent-500/20 text-accent-400' : 'bg-surface-700 text-ink-600'
                    )}>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <a 
                          href={`/dashboard/${link.code}`}
                          className="font-mono text-sm font-medium text-accent-400 hover:text-accent-300 truncate max-w-[150px] block sm:max-w-none"
                        >
                          {link.code}
                        </a>
                        <CopyButton text={getShortUrl(link.code)} />
                      </div>
                      <div className="sm:hidden mt-1">
                        <span className={clsx(
                          'badge text-2xs',
                          link.isActive ? 'badge-success' : 'badge-warning'
                        )}>
                          {link.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-500 truncate max-w-[200px] block" title={link.originalUrl}>
                      {truncateUrl(link.originalUrl)}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-sm font-semibold tabular-nums text-ink-100">{link.clickCount.toLocaleString()}</span>
                </td>
                <td className="p-4 text-center hidden md:table-cell">
                  <span className="text-sm text-ink-600">{formatDate(link.createdAt)}</span>
                </td>
                <td className="p-4">
                  <div className="flex items-center justify-center gap-1">
                    <a
                      href={`/dashboard/${link.code}`}
                      className="btn btn-ghost text-sm p-2"
                      title="Ver analytics"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v18h18"/>
                        <path d="M18 17V9"/>
                        <path d="M13 17V5"/>
                        <path d="M8 17v-3"/>
                      </svg>
                    </a>
                    <button
                      onClick={() => handleDelete(link.code)}
                      disabled={deletingId === link.code}
                      className="btn btn-ghost text-sm p-2 text-error hover:bg-error/10"
                      title="Eliminar"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
