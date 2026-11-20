import { useCallback, useEffect, useState } from 'react';
import { getApiErrorMessage } from '../api/client';
import { fetchLayanan, toCatalogService } from '../api/layanan';
import type { CatalogService } from '../types/eatersive';

let cache: CatalogService[] = [];
let loaded = false;
let pending: Promise<CatalogService[]> | null = null;

export function getCachedServices(): CatalogService[] {
  return cache;
}

export function getCachedService(id: string): CatalogService | undefined {
  return cache.find((service) => service.id === id);
}

/**
 * Memuat katalog dari backend sekali, lalu memakai cache untuk halaman lain.
 * `force` dipakai setelah owner mengubah data.
 */
export async function loadCatalog(force = false): Promise<CatalogService[]> {
  if (loaded && !force) return cache;

  pending ??= fetchLayanan()
    .then((list) => {
      cache = list
        .filter((item) => item.aktif !== false)
        .map(toCatalogService);
      loaded = true;

      return cache;
    })
    .finally(() => {
      pending = null;
    });

  return pending;
}

export function useCatalog() {
  const [services, setServices] = useState<CatalogService[]>(getCachedServices);
  const [loading, setLoading] = useState(!loaded);
  const [error, setError] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);

    try {
      setServices(await loadCatalog(true));
      setError('');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;

    loadCatalog()
      .then((list) => {
        if (!alive) return;
        setServices(list);
        setError('');
      })
      .catch((err) => {
        if (!alive) return;
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  return { services, loading, error, reload };
}
