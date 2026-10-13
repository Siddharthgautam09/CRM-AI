import type { Router } from 'express';

import { buildSwaggerSpec } from '../../config/swagger';
import { crmRouter } from '../../modules/crm/crm.routes';
import { platformRouter } from '../../modules/platform/platform.routes';

type Spec = { paths: Record<string, Record<string, unknown>> };

/** Every route actually registered on a router, as "METHOD /openapi/{path}". */
function routesOf(router: Router, prefix: string): string[] {
  const out: string[] = [];
  for (const layer of router.stack as {
    route?: { path: string; methods: Record<string, boolean> };
  }[]) {
    if (!layer.route) continue;
    const path = prefix + layer.route.path.replace(/:(\w+)/g, '{$1}');
    for (const method of Object.keys(layer.route.methods))
      out.push(`${method.toUpperCase()} ${path}`);
  }
  return out;
}

describe('Swagger covers every route, end to end', () => {
  const spec = buildSwaggerSpec() as unknown as Spec;
  const documented = new Set(
    Object.entries(spec.paths).flatMap(([path, ops]) =>
      Object.keys(ops).map((m) => `${m.toUpperCase()} ${path}`),
    ),
  );

  it.each([
    ['CRM', routesOf(crmRouter, '/crm')],
    ['Platform', routesOf(platformRouter, '/platform')],
  ])('%s: no undocumented routes', (_name, routes) => {
    expect(routes.filter((r) => !documented.has(r))).toEqual([]);
  });

  it('documents nothing that does not exist', () => {
    const real = new Set([
      ...routesOf(crmRouter, '/crm'),
      ...routesOf(platformRouter, '/platform'),
    ]);
    const stale = [...documented].filter((r) => !real.has(r) && !r.endsWith(' /health'));
    expect(stale).toEqual([]);
  });

  it('tags every operation by area and gives it the standard error responses', () => {
    const ops = Object.entries(spec.paths).flatMap(([path, o]) =>
      Object.values(o).map((op) => ({ path, op: op as { tags?: string[]; responses?: object } })),
    );
    expect(
      ops.filter(({ op }) => !op.tags?.length || op.tags[0] === 'CRM').map((o) => o.path),
    ).toEqual([]);
    expect(ops.filter(({ op }) => !('500' in (op.responses ?? {}))).map((o) => o.path)).toEqual([]);
  });
});
