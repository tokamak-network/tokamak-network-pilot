import { Injectable, Logger } from '@nestjs/common';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface Chunk {
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
}

@Injectable()
export class ChunkerService {
  private readonly logger = new Logger(ChunkerService.name);

  private readonly splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
    separators: ['\n## ', '\n### ', '\n\n', '\n', '. ', ' ', ''],
  });

  /**
   * Split a single document into chunks, preserving metadata.
   */
  async chunkDocument(
    content: string,
    baseMetadata: Record<string, unknown> = {},
  ): Promise<Chunk[]> {
    if (!content || content.trim().length === 0) {
      return [];
    }

    const docs = await this.splitter.createDocuments([content]);

    const chunks: Chunk[] = docs.map((doc, index) => ({
      content: doc.pageContent,
      chunkIndex: index,
      metadata: { ...baseMetadata, chunkIndex: index, totalChunks: docs.length },
    }));

    this.logger.debug(
      `Split document into ${chunks.length} chunks (avg ${Math.round(
        content.length / Math.max(chunks.length, 1),
      )} chars)`,
    );

    return chunks;
  }

  /**
   * Split multiple documents into chunks.
   */
  async chunkDocuments(
    documents: Array<{ content: string; metadata: Record<string, unknown> }>,
  ): Promise<Chunk[]> {
    const allChunks: Chunk[] = [];

    for (const doc of documents) {
      const chunks = await this.chunkDocument(doc.content, doc.metadata);
      allChunks.push(...chunks);
    }

    this.logger.log(
      `Chunked ${documents.length} documents into ${allChunks.length} total chunks`,
    );
    return allChunks;
  }
}
