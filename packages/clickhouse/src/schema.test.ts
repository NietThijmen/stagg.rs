import { describe, expect, it, vi } from 'vitest';
import { derivedSchemas, initializeDerivedTables } from './schema.js';

describe('initializeDerivedTables', () => {
  it('executes every statement separately', async () => {
    const exec = vi.fn().mockResolvedValue(undefined);

    await initializeDerivedTables({
      exec,
    } as unknown as Parameters<typeof initializeDerivedTables>[0]);

    expect(exec).toHaveBeenCalledTimes(derivedSchemas.length);
    expect(exec).toHaveBeenNthCalledWith(1, { query: derivedSchemas[0] });
  });

  it('keeps statements free of trailing semicolons', () => {
    for (const statement of derivedSchemas) {
      expect(statement.trim().endsWith(';')).toBe(false);
    }
  });
});
