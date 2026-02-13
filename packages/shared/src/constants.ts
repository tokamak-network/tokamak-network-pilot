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

/** Project role labels */
export const PROJECT_ROLE_LABELS: Record<string, string> = {
  lead: 'Lead',
  contributor: 'Contributor',
  viewer: 'Viewer',
};

/** Tokamak GitHub org */
export const TOKAMAK_GITHUB_ORG = 'tokamak-network';
