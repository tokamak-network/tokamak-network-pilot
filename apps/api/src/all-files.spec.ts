import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

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
const SKIPPED_SOURCE_FILES = new Set(['main.ts']);

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

const sourceFiles = walk(SRC_DIR)
  .filter((file) => file.endsWith('.ts'))
  .filter((file) => !file.endsWith('.spec.ts'))
  .map((file) => relative(SRC_DIR, file).replace(/\\/g, '/'))
  .filter((file) => !SKIPPED_SOURCE_FILES.has(file))
  .sort();

describe('API source file coverage', () => {
  it('discovers a broad set of API source files', () => {
    expect(sourceFiles.length).toBeGreaterThanOrEqual(110);
  });

  it.each(sourceFiles)('loads %s', (relativePath) => {
    const absolutePath = join(SRC_DIR, relativePath);
    expect(() => require(absolutePath)).not.toThrow();
  });
});
