import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import CopyButton from './CopyButton';

interface Link {
  id: string;
  code: string;
  originalUrl: string;
  clicks: number;
  active: boolean;
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
      
      const response = await fetch('http://localhost:3000/api/v1/links', {
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
        throw new Error('Error al cargar los enlaces');
      }

      const data = await response.json();
      setLinks(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los enlaces');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();

    // Listen for link creation events
    const handleLinkCreated = () => {
      fetchLinks();
    };

    window.addEventListener('linkCreated', handleLinkCreated);
    return () => window.removeEventListener('linkCreated', handleLinkCreated);
  }, [fetchLinks]);

  const handleDelete = async (code: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este enlace?')) {
      return;
    }

    setDeletingId(code);

    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`http://localhost:3000/api/v1/links/${code}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Error al eliminar el enlace');
      }

      setLinks((prev) => prev.filter((link) => link.code !== code));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el enlace');
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
      <div className="card overflow-hidden">
        <div className="divide-y divide-surface-200">
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
      <div className="card p-8 text-center">
        <div className="w-12 h-12 bg-error-light rounded-full flex items-center justify-center mx-auto mb-4">
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
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-surface-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
            <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </div>
        <h3 className="font-serif text-lg font-semibold mb-2">No tienes enlaces todavía</h3>
        <p className="text-surface-500 text-sm max-w-xs mx-auto mb-6">
          Crea tu primer enlace corto usando el formulario de arriba y empieza a rastrear clics.
        </p>
        <a href="/" className="btn btn-primary text-sm">
          Crear mi primer enlace
        </a>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50/50">
              <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase tracking-wide">
                Enlace corto
              </th>
              <th className="text-left p-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden sm:table-cell">
                Original
              </th>
              <th className="text-right p-4 text-xs font-medium text-surface-500 uppercase tracking-wide">
                Clics
              </th>
              <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase tracking-wide hidden md:table-cell">
                Fecha
              </th>
              <th className="text-center p-4 text-xs font-medium text-surface-500 uppercase tracking-wide">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-100">
            {links.map((link) => (
              <tr 
                key={link.id} 
                className={clsx(
                  'group transition-colors hover:bg-surface-50',
                  deletingId === link.code && 'opacity-50'
                )}
              >
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                      link.active ? 'bg-brand-100 text-brand-600' : 'bg-surface-200 text-surface-500'
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
                          className="font-mono text-sm font-medium text-brand-600 hover:text-brand-700 truncate max-w-[150px] block sm:max-w-none"
                        >
                          {link.code}
                        </a>
                        <CopyButton text={`${window.location.origin}/${link.code}`} />
                      </div>
                      <div className="sm:hidden mt-1">
                        <span className={clsx(
                          'badge text-2xs',
                          link.active ? 'badge-success' : 'badge-warning'
                        )}>
                          {link.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-surface-600 truncate max-w-[200px] block" title={link.originalUrl}>
                      {truncateUrl(link.originalUrl)}
                    </span>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <span className="text-sm font-semibold tabular-nums">{link.clicks.toLocaleString()}</span>
                </td>
                <td className="p-4 text-center hidden md:table-cell">
                  <span className="text-sm text-surface-500">{formatDate(link.createdAt)}</span>
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
                      className="btn btn-ghost text-sm p-2 text-error hover:bg-error-light"
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
