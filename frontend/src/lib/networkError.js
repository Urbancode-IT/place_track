/** True when the request never got an HTTP response (dropped socket, DNS, proxy, CORS). */
export function isTransientNetworkError(err) {
  if (!err || err.response) return false;
  if (err.code === 'ERR_CANCELED' || err.name === 'CanceledError' || err.name === 'AbortError') {
    return false;
  }
  const code = String(err.code || '');
  const msg = String(err.message || '');
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    msg.includes('Network Error') ||
    msg.includes('Failed to fetch')
  );
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retry only connection drops — never 4xx/5xx bodies unless shouldRetry says so. */
export async function retryOnNetworkError(fn, { attempts = 3, delayMs = 400, shouldRetry = isTransientNetworkError } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!shouldRetry(err) || i === attempts - 1) throw err;
      await sleep(delayMs * (i + 1));
    }
  }
  throw lastErr;
}

/** Login: also retry Vite proxy 502/504 and empty 500 (nothing listening on :5001). */
export function shouldRetryLogin(err) {
  if (err?.response?.status === 403) return false;
  if (isTransientNetworkError(err)) return true;
  const status = err.response?.status;
  if (status === 502 || status === 504) return true;
  if (status !== 500) return false;
  const data = err.response?.data;
  const msg = data && typeof data === 'object' ? data.message : null;
  return typeof msg !== 'string';
}
