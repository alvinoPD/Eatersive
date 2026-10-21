import { useEffect, useState } from 'react';
import { API_BASE_URL, getApiErrorMessage } from '../api/client';
import { fetchHealth } from '../api/health';
import StatusPanel from '../components/StatusPanel';
import type { HealthData } from '../types/api';

type RequestState = 'loading' | 'success' | 'error';

export default function ApiStatusPage() {
  const [requestState, setRequestState] = useState<RequestState>('loading');
  const [health, setHealth] = useState<HealthData | null>(null);
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isActive = true;

    async function loadHealth() {
      setRequestState('loading');
      setErrorMessage('');

      try {
        const response = await fetchHealth(controller.signal);

        if (!isActive) {
          return;
        }

        setHealth(response.data);
        setMessage(response.message);
        setRequestState('success');
      } catch (error) {
        if (!isActive || controller.signal.aborted) {
          return;
        }

        setHealth(null);
        setMessage('');
        setErrorMessage(getApiErrorMessage(error));
        setRequestState('error');
      }
    }

    void loadHealth();

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [attempt]);

  return (
    <div className="page">
      <section className="hero-card">
        <p className="eyebrow">Integrasi API</p>
        <h1>Status API</h1>
        <p className="lead">
          Halaman ini memanggil <span className="mono">GET /health</span> pada base URL backend
          melalui Axios, lalu menampilkan hasilnya.
        </p>
        <p className="mono muted">Base URL: {API_BASE_URL}</p>
        <div className="hero-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => setAttempt((value) => value + 1)}
            disabled={requestState === 'loading'}
          >
            {requestState === 'loading' ? 'Memeriksa...' : 'Periksa Ulang'}
          </button>
        </div>
      </section>

      {requestState === 'loading' && (
        <StatusPanel variant="loading" title="Menghubungi backend...">
          <p>Menunggu respons dari {API_BASE_URL}/health</p>
        </StatusPanel>
      )}

      {requestState === 'success' && health && (
        <StatusPanel variant="success" title="Backend terhubung">
          <p>{message}</p>
          <dl className="detail-list">
            <div>
              <dt>Status</dt>
              <dd>{health.status}</dd>
            </div>
            <div>
              <dt>Endpoint</dt>
              <dd className="mono">{API_BASE_URL}/health</dd>
            </div>
          </dl>
          <details className="raw-response">
            <summary>Lihat response JSON</summary>
            <pre>{JSON.stringify({ success: true, message, data: health }, null, 2)}</pre>
          </details>
        </StatusPanel>
      )}

      {requestState === 'error' && (
        <StatusPanel variant="error" title="Gagal menghubungi backend">
          <p>{errorMessage}</p>
          <ul className="list list--compact">
            <li>Pastikan backend berjalan: cd backend lalu php artisan serve.</li>
            <li>Pastikan port backend sesuai dengan VITE_API_BASE_URL.</li>
            <li>Pastikan origin frontend diizinkan oleh konfigurasi CORS.</li>
          </ul>
        </StatusPanel>
      )}
    </div>
  );
}
