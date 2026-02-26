import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getMetadataArgsStorage } from 'typeorm';

const ENTITIES_DIR = join(__dirname, 'entities');

function exportedClasses(moduleExports: Record<string, unknown>): Array<new (...args: any[]) => unknown> {
  return Object.values(moduleExports).filter(
    (value): value is new (...args: any[]) => unknown => typeof value === 'function',
  );
}

const entityFiles = readdirSync(ENTITIES_DIR)
  .map((fileName) => join(ENTITIES_DIR, fileName))
  .filter((filePath) => filePath.endsWith('.entity.ts'))
  .sort();

describe('Entity metadata coverage', () => {
  it('covers all entity files', () => {
    expect(entityFiles.length).toBeGreaterThanOrEqual(18);
  });

  it.each(entityFiles)('validates @Entity metadata for %s', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClasses(loadedModule);

    expect(classes.length).toBeGreaterThan(0);

    for (const entityClass of classes) {
      const hasEntityMetadata = getMetadataArgsStorage().tables.some(
        (table) => table.target === entityClass,
      );

      expect(hasEntityMetadata).toBe(true);
    }
  });
});
