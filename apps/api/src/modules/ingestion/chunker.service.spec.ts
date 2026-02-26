import { ChunkerService } from './chunker.service';

describe('ChunkerService', () => {
  let service: ChunkerService;

  beforeEach(() => {
    service = new ChunkerService();
  });

  it('returns empty chunks for blank content', async () => {
    await expect(service.chunkDocument('')).resolves.toEqual([]);
    await expect(service.chunkDocument('   ')).resolves.toEqual([]);
  });

  it('chunks a long document and preserves metadata', async () => {
    const content = `${'A'.repeat(1200)}\n\n${'B'.repeat(1200)}`;
    const chunks = await service.chunkDocument(content, { sourceId: 's1' });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata).toEqual(
      expect.objectContaining({ sourceId: 's1', chunkIndex: 0, totalChunks: chunks.length }),
    );
    expect(chunks.at(-1)?.metadata).toEqual(
      expect.objectContaining({ chunkIndex: chunks.length - 1, totalChunks: chunks.length }),
    );
  });

  it('chunks multiple documents and flattens results', async () => {
    const docs = [
      { content: 'one', metadata: { id: 1 } },
      { content: 'two', metadata: { id: 2 } },
    ];

    const chunks = await service.chunkDocuments(docs as any);

    expect(chunks.length).toBe(2);
    expect(chunks[0].metadata).toEqual(expect.objectContaining({ id: 1 }));
    expect(chunks[1].metadata).toEqual(expect.objectContaining({ id: 2 }));
  });
});
