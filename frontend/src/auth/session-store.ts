export const SESSION_KEY = 'eatersive-auth-session';

function storages(): Storage[] {
  return [window.localStorage, window.sessionStorage];
}

/** Membaca sesi tersimpan (localStorage dulu, lalu sessionStorage). */
export function readStoredSession<T>(): T | null {
  try {
    for (const storage of storages()) {
      const raw = storage.getItem(SESSION_KEY);
      if (!raw) continue;

      try {
        return JSON.parse(raw) as T;
      } catch {
        storage.removeItem(SESSION_KEY);
      }
    }
  } catch {
    /* Storage bisa diblokir oleh browser. */
  }

  return null;
}

export function writeStoredSession(session: unknown, remember: boolean): void {
  try {
    for (const storage of storages()) storage.removeItem(SESSION_KEY);

    const storage = remember ? window.localStorage : window.sessionStorage;
    storage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch (error) {
    console.error('Tidak dapat menyimpan sesi:', error);
  }
}

export function clearStoredSession(): void {
  try {
    for (const storage of storages()) storage.removeItem(SESSION_KEY);
  } catch {
    /* Storage bisa diblokir oleh browser. */
  }
}

/** Token Sanctum dibaca dari sesi tersimpan — dipakai interceptor axios. */
export function readToken(): string | null {
  const session = readStoredSession<{ token?: unknown }>();
  return typeof session?.token === 'string' && session.token.length > 0 ? session.token : null;
}
