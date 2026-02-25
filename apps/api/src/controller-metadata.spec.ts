import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';

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

function exportedControllers(moduleExports: Record<string, unknown>): Array<new (...args: any[]) => unknown> {
  return Object.values(moduleExports).filter(
    (value): value is new (...args: any[]) => unknown =>
      typeof value === 'function' && value.name.endsWith('Controller'),
  );
}

const controllerFiles = [
  join(SRC_DIR, 'app.controller.ts'),
  ...walk(join(SRC_DIR, 'modules')).filter((file) => file.endsWith('.controller.ts')),
].sort();

describe('Controller route metadata', () => {
  it('covers all controller files', () => {
    expect(controllerFiles.length).toBeGreaterThanOrEqual(17);
  });

  it.each(controllerFiles)('validates controller metadata for %s', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const controllerClasses = exportedControllers(loadedModule);

    expect(controllerClasses.length).toBeGreaterThan(0);

    for (const controllerClass of controllerClasses) {
      expect(Reflect.hasMetadata(PATH_METADATA, controllerClass)).toBe(true);

      const decoratedMethods = Object.getOwnPropertyNames(controllerClass.prototype)
        .filter((methodName) => methodName !== 'constructor')
        .filter((methodName) => {
          const method = controllerClass.prototype[methodName];
          return (
            Reflect.hasMetadata(PATH_METADATA, method) ||
            Reflect.hasMetadata(METHOD_METADATA, method)
          );
        });

      expect(decoratedMethods.length).toBeGreaterThan(0);
    }
  });
});
