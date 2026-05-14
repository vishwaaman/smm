export const reportError = async (
  error: Error,
  source: 'frontend' | 'orchestrator' = 'frontend',
  endpoint?: string
) => {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
    await fetch(`${backendUrl}/error-log/report`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source,
        message: error?.message || String(error),
        stack: error?.stack,
        endpoint: endpoint || (typeof window !== 'undefined' ? window.location.pathname : undefined),
      }),
    });
  } catch {
    // never throw from error reporter
  }
};
