/** Default API prefix */
export const API_PREFIX = '/api/v1';

/** Default ports */
export const DEFAULT_API_PORT = 4000;
export const DEFAULT_WEB_PORT = 3000;

/** Source types display labels */
export const SOURCE_TYPE_LABELS: Record<string, string> = {
  github_repo: 'GitHub Repository',
  github_org: 'GitHub Organization',
  documentation: 'Documentation URL',
  file_upload: 'File Upload',
  notion: 'Notion Workspace',
  custom: 'Custom Source',
};

/** User role labels */
export const USER_ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  project_lead: 'Project Lead',
  member: 'Team Member',
  viewer: 'Viewer',
};

/** Tokamak GitHub org */
export const TOKAMAK_GITHUB_ORG = 'tokamak-network';

/** Qdrant collection name for document chunks */
export const QDRANT_COLLECTION_NAME = 'tokamak_knowledge';

/** Embedding model dimensions */
export const EMBEDDING_DIMENSIONS = 1536;

/** Default chunk size (characters) */
export const DEFAULT_CHUNK_SIZE = 1500;

/** Default chunk overlap (characters) */
export const DEFAULT_CHUNK_OVERLAP = 200;

/** Chunk type labels */
export const CHUNK_TYPE_LABELS: Record<string, string> = {
  readme: 'README',
  code: 'Source Code',
  issue: 'GitHub Issue',
  pull_request: 'Pull Request',
  documentation: 'Documentation',
  markdown: 'Markdown File',
  text: 'Plain Text',
  comment: 'Comment',
};
