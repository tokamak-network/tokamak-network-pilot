export const ROADMAP_INTELLIGENCE_QUEUE = 'roadmap-intelligence';

export interface RoadmapDraftJobData {
  action: 'draft-roadmap';
  projectId: string;
  maxItems?: number;
  triggeredByUserId?: string;
}
