import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { MODULE_METADATA } from '@nestjs/common/constants';

jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000000'),
}));

jest.mock('@octokit/rest', () => {
  class MockOctokit {
    static plugin = jest.fn(() => MockOctokit);

    request = jest.fn();
    paginate = jest.fn();
    rest = {};
  }

  return { Octokit: MockOctokit };
});

jest.mock('@octokit/plugin-throttling', () => ({
  throttling: jest.fn(() => ({})),
}));

const SRC_DIR = __dirname;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return walk(fullPath);
    }

    return [fullPath];
  });
}

function exportedClassesWithSuffix(moduleExports: Record<string, unknown>, suffix: string): Array<new (...args: any[]) => unknown> {
  return Object.values(moduleExports).filter(
    (value): value is new (...args: any[]) => unknown =>
      typeof value === 'function' && value.name.endsWith(suffix),
  );
}

const moduleFiles = [
  join(SRC_DIR, 'app.module.ts'),
  ...walk(join(SRC_DIR, 'modules')).filter((file) => file.endsWith('.module.ts')),
].sort();

describe('Nest module metadata', () => {
  it('covers all module files', () => {
    expect(moduleFiles.length).toBeGreaterThanOrEqual(23);
  });

  it.each(moduleFiles)('validates @Module metadata for %s', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const moduleClasses = exportedClassesWithSuffix(loadedModule, 'Module');

    expect(moduleClasses.length).toBeGreaterThan(0);

    for (const moduleClass of moduleClasses) {
      const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, moduleClass);
      const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, moduleClass);
      const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, moduleClass);
      const exportsMetadata = Reflect.getMetadata(MODULE_METADATA.EXPORTS, moduleClass);

      expect([imports, controllers, providers, exportsMetadata].some(Array.isArray)).toBe(true);
    }
  });
});
