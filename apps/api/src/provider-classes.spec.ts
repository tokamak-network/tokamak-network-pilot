import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INJECTABLE_WATERMARK } from '@nestjs/common/constants';

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

const MODULES_DIR = join(__dirname, 'modules');

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

function exportedClassesWithSuffix(
  moduleExports: Record<string, unknown>,
  suffix: string,
): Array<new (...args: any[]) => unknown> {
  return Object.values(moduleExports).filter(
    (value): value is new (...args: any[]) => unknown =>
      typeof value === 'function' && value.name.endsWith(suffix),
  );
}

const files = walk(MODULES_DIR).sort();
const serviceFiles = files.filter((file) => file.endsWith('.service.ts'));
const guardFiles = files.filter((file) => file.endsWith('.guard.ts'));
const interceptorFiles = files.filter((file) => file.endsWith('.interceptor.ts'));
const processorFiles = files.filter((file) => file.endsWith('.processor.ts'));
const strategyFiles = files.filter((file) => file.endsWith('.strategy.ts'));

describe('Provider class contracts', () => {
  it('covers service and infra provider files', () => {
    expect(serviceFiles.length).toBeGreaterThanOrEqual(23);
    expect(guardFiles.length).toBeGreaterThanOrEqual(5);
    expect(interceptorFiles.length).toBeGreaterThanOrEqual(1);
    expect(processorFiles.length).toBeGreaterThanOrEqual(2);
    expect(strategyFiles.length).toBeGreaterThanOrEqual(1);
  });

  it.each(serviceFiles)('service class in %s is injectable', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClassesWithSuffix(loadedModule, 'Service');

    expect(classes.length).toBeGreaterThan(0);

    for (const serviceClass of classes) {
      expect(Reflect.getMetadata(INJECTABLE_WATERMARK, serviceClass)).toBe(true);
    }
  });

  it.each(guardFiles)('guard class in %s exposes canActivate behavior', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClassesWithSuffix(loadedModule, 'Guard');

    expect(classes.length).toBeGreaterThan(0);

    for (const guardClass of classes) {
      expect(typeof guardClass.prototype.canActivate).toBe('function');
    }
  });

  it.each(interceptorFiles)('interceptor class in %s exposes intercept behavior', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClassesWithSuffix(loadedModule, 'Interceptor');

    expect(classes.length).toBeGreaterThan(0);

    for (const interceptorClass of classes) {
      expect(typeof interceptorClass.prototype.intercept).toBe('function');
      expect(Reflect.getMetadata(INJECTABLE_WATERMARK, interceptorClass)).toBe(true);
    }
  });

  it.each(processorFiles)('processor class in %s exposes process behavior', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClassesWithSuffix(loadedModule, 'Processor');

    expect(classes.length).toBeGreaterThan(0);

    for (const processorClass of classes) {
      expect(typeof processorClass.prototype.process).toBe('function');
    }
  });

  it.each(strategyFiles)('strategy class in %s exposes validate behavior', (filePath) => {
    const loadedModule = require(filePath) as Record<string, unknown>;
    const classes = exportedClassesWithSuffix(loadedModule, 'Strategy');

    expect(classes.length).toBeGreaterThan(0);

    for (const strategyClass of classes) {
      expect(typeof strategyClass.prototype.validate).toBe('function');
      expect(Reflect.getMetadata(INJECTABLE_WATERMARK, strategyClass)).toBe(true);
    }
  });
});
