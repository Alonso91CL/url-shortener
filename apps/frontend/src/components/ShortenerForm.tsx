import { useState, useRef } from 'react';
import clsx from 'clsx';
import CopyButton from './CopyButton';

interface Props {
  compact?: boolean;
}

export default function ShortenerForm({ compact = false }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ code: string; shortUrl: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!url.trim()) {
      setError('Por favor, ingresa una URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('La URL no es válida. Asegúrate de incluir https://');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch('http://localhost:3000/api/v1/links', {
        method: 'POST',
        headers,
        body: JSON.stringify({ url }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Error al crear el enlace');
      }

      setResult({
        code: data.code,
        shortUrl: `${window.location.origin}/${data.code}`,
      });

      // Dispatch event to refresh tables if on dashboard
      window.dispatchEvent(new CustomEvent('linkCreated', { detail: data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el enlace');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setResult(null);
    setError(null);
    inputRef.current?.focus();
  };

  return (
    <div className={clsx(compact ? 'space-y-4' : 'space-y-6')}>
      <form onSubmit={handleSubmit} className={clsx(compact ? 'flex gap-3' : '')}>
        <div className={clsx(compact ? 'flex-1' : 'relative')}>
          <div className={clsx(
            'relative',
            !compact && 'max-w-xl'
          )}>
            <input
              ref={inputRef}
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://ejemplo.com/tu-enlace-muy-largo"
              className={clsx(
                'input-base',
                !compact && 'pr-32',
                error && 'border-error focus:border-error focus:shadow-glow'
              )}
              disabled={loading}
              aria-invalid={!!error}
              aria-describedby={error ? 'url-error' : undefined}
            />
            {!compact && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {url && (
                  <button
                    type="button"
                    onClick={() => setUrl('')}
                    className="p-1.5 text-surface-400 hover:text-surface-600 transition-colors"
                    aria-label="Limpiar campo"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className={clsx(
            'btn btn-primary',
            compact ? 'px-6' : 'mt-4'
          )}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              Creando...
            </span>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101"/>
                <path d="M10.172 13.828a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
              </svg>
              Acortar
            </>
          )}
        </button>
      </form>

      {error && (
        <p id="url-error" className="text-error text-sm flex items-center gap-2" role="alert">
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}

      {result && (
        <div 
          className={clsx(
            'bg-success-light border border-success/20 rounded-xl p-4',
            !compact && 'max-w-xl'
          )}
          role="status"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-success-dark/60 uppercase tracking-wide mb-1">Tu enlace corto</p>
              <p className="font-mono text-sm truncate">{result.shortUrl}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <CopyButton text={result.shortUrl} />
              <button
                onClick={handleReset}
                className="btn btn-ghost text-sm p-2"
                aria-label="Crear otro enlace"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <p className="text-xs text-surface-400 max-w-xl">
          Al crear un enlace, aceptas que este sea público y rastreable. Los enlaces eliminados no se pueden recuperar.
        </p>
      )}
    </div>
  );
}
