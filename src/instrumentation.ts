export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.DATABASE_URL) {
    const { startScheduler } = await import('./lib/jobs/scheduler');
    startScheduler();
  }
}
