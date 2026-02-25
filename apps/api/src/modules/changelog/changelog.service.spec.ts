import { ChangelogService } from './changelog.service';

describe('ChangelogService', () => {
  let service: ChangelogService;

  beforeEach(() => {
    service = new ChangelogService();
  });

  it('returns all changelog entries by default', () => {
    const entries = service.getAll();
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].version).toBe('0.4.0');
  });

  it('filters entries by change type', () => {
    const entries = service.getAll('security');
    expect(entries).toEqual([]);

    const addedEntries = service.getAll('added');
    expect(addedEntries.length).toBeGreaterThan(0);
    expect(addedEntries.every((e) => e.changes.every((c) => c.type === 'added'))).toBe(true);
  });

  it('gets entry by version and returns undefined when missing', () => {
    expect(service.getByVersion('0.3.0')?.version).toBe('0.3.0');
    expect(service.getByVersion('9.9.9')).toBeUndefined();
  });

  it('returns latest entry as first changelog item', () => {
    const latest = service.getLatest();
    expect(latest.version).toBe('0.4.0');
  });
});
