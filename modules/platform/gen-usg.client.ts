import { AI_COST_METRIC, aiCostLimitProvider } from './ai-cost-limit-provider';
import { env } from '../../config/env';

// gen-usg-starter is pure ESM (like gen-sup-starter) — dynamic import(), not
// static, for the same CJS/ESM interop reason documented in
// brokerage.service.ts's loadGenSup().
function importGenUsg() {
  return import('@gen-ms/gen-usg-starter');
}
type GenUsg = Awaited<ReturnType<typeof importGenUsg>>;
type GenUsgInstance = ReturnType<GenUsg['createGenUsg']>;

let instancePromise: Promise<GenUsgInstance> | null = null;

export function getGenUsg(): Promise<GenUsgInstance> {
  instancePromise ??= initialize();
  return instancePromise;
}

async function initialize(): Promise<GenUsgInstance> {
  const genUsg = await importGenUsg();

  // gen-usg-starter's own default repos (PrismaMeterRepo, RedisCounterStore,
  // ...) read process.env.DATABASE_URL / REDIS_URL directly — it has no
  // config option to inject a connection string, unlike gen-sup-starter.
  // Safe to overwrite here (not restore afterward): config/env.ts already
  // took its own snapshot of these at module-load time (see env.databaseUrl),
  // and server.ts's connectDatabases() has already connected this app's own
  // Prisma client using that snapshot before any request — including the one
  // that triggers this lazy initializer — can reach this code. Nothing reads
  // the live process.env value after that point except gen-usg-starter's own
  // lazy singletons, which is exactly what this sets up for them.
  process.env.DATABASE_URL = env.platform.usageDatabaseUrl;
  process.env.REDIS_URL = env.platform.usageRedisUrl;

  genUsg.registerMeter(AI_COST_METRIC, {
    unit: 'usd_cents',
    mode: 'counter',
    // Deliberately false: GRACE would let check() silently keep allowing
    // usage past the limit on its own. "Allow extra for today" is meant to
    // be the super admin's call, not automatic — see ai-cost-limit-provider.ts.
    graceEligible: false,
  });

  return genUsg.createGenUsg({
    limitProvider: aiCostLimitProvider,
    internalSecret: env.platform.internalSecret,
    modules: { check: true, increment: true, summary: false },
  });
}
