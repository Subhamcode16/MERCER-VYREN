/**
 * Campaign API Client
 * Typed wrappers for all /api/campaigns endpoints.
 *
 * Uses the shared `apiFetch` from api.ts so all campaign requests
 * automatically benefit from:
 *   - Supabase JWT attachment
 *   - 3× exponential-backoff retry on network failures and 5xx responses
 *   - Typed ApiError with .status for precise error handling
 */

import { apiFetch } from './api';


export interface CampaignSummary {
  id: string;
  name: string;
  has_material: boolean;
  created_at: string;
  owner_id: string;
  tenant_id: string;
  brand_id: string;
  state: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  version: number;
}

export interface MemoryNode {
  type: 'observation' | 'reasoning' | 'conclusion';
  content: string;
  timestamp: string;
}

export interface ConfidenceField {
  value: string | string[];
  confidence: number;
}

export interface ProductDNA {
  material: ConfidenceField;
  weaving_technique: ConfidenceField;
  primary_features: ConfidenceField;
  cultural_context?: ConfidenceField;
  raw_claims?: Record<string, unknown>[];
}

export interface FullCampaign {
  id: string;
  owner_id: string;
  tenant_id: string;
  brand_id: string;
  state: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  version: number;
  name: string;
  material_path: string | null;
  memory_stream: MemoryNode[];
  identity: {
    product_dna: ProductDNA | null;
  };
  planning: {
    creative_objective: string;
    proposed_direction_title: string | null;
    proposed_direction_body: string | null;
    selected_background: string | null;
    selected_pose: string | null;
    selected_lighting: string | null;
    recommendations: Record<string, { value: string, reason: string }> | null;
  };
  execution: {
    moodboard_brief: string | null;
    asset_states: {
      id: string;
      prompt: string;
      status: string;
      image_url: string | null;
    }[];
  };
  v3_creative_state?: {
    status: 'pending_green_signal' | 'approved' | 'rendering';
    strategy: {
      background: string;
      pose: string;
      lighting: string;
    };
    product?: any;
    objective?: string;
  } | null;
  intelligence_trace?: {
    decisions?: any[];
    cre_scores?: any;
    level_1_violation?: any;
    level_2_recommendation?: any;
  };
  created_at: string;
  updated_at: string;
}

// --- API Functions ---

/** GET /api/campaigns — list all campaign folders */
export async function listCampaigns(): Promise<CampaignSummary[]> {
  return apiFetch('/api/campaigns');
}

/** POST /api/campaigns — caller keeps the same key when retrying one create action. */
export async function createCampaign(name: string, brandId: string, idempotencyKey: string): Promise<CampaignSummary> {
  return apiFetch('/api/campaigns', {
    method: 'POST',
    headers: { 'X-Idempotency-Key': idempotencyKey },
    body: JSON.stringify({ name, brand_id: brandId }),
  });
}

/** GET /api/campaigns/{id} — get full campaign state (restores workspace) */
export async function getCampaign(id: string): Promise<FullCampaign> {
  return apiFetch(`/api/campaigns/${id}`);
}

/** PATCH /api/campaigns/{id} — rename a campaign folder */
export async function renameCampaign(id: string, name: string): Promise<CampaignSummary> {
  return apiFetch(`/api/campaigns/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });
}

/** DELETE /api/campaigns/{id} — delete a campaign and its assets */
export async function deleteCampaign(id: string): Promise<void> {
  await apiFetch(`/api/campaigns/${id}`, { method: 'DELETE' });
}

/** POST /api/campaigns/{id}/approve — grant Green Signal */
export async function approveCampaign(id: string): Promise<FullCampaign> {
  return apiFetch(`/api/campaigns/${id}/approve`, { method: 'POST' });
}

/** PATCH /api/campaigns/{id}/options — update custom art direction options */
export async function updateCampaignOptions(
  id: string,
  options: { background: string; pose: string; lighting: string }
): Promise<FullCampaign> {
  return apiFetch(`/api/campaigns/${id}/options`, {
    method: 'PATCH',
    body: JSON.stringify(options),
  });
}

/**
 * POST /api/campaigns/{id}/material — upload image file (multipart)
 * Passes FormData directly; apiFetch skips Content-Type so the browser
 * sets the multipart boundary automatically.
 */
export async function uploadMaterial(id: string, file: File): Promise<{ status: string; material_path: string }> {
  const form = new FormData();
  form.append('file', file);
  return apiFetch(`/api/campaigns/${id}/material`, {
    method: 'POST',
    body: form,
  });
}

/** POST /api/campaigns/{id}/analyze — trigger Gemini Vision analysis (starts background job) */
export async function analyzeMaterial(id: string): Promise<{ status: string; message: string }> {
  return apiFetch(`/api/campaigns/${id}/analyze`, { method: 'POST' });
}

/** POST /api/campaigns/{id}/generate — trigger Prompt Engine RAG generation (starts background job) */
export async function generateCampaign(id: string, options?: any): Promise<{ status: string; message: string }> {
  return apiFetch(`/api/campaigns/${id}/generate`, {
    method: 'POST',
    body: options ? JSON.stringify(options) : undefined,
  });
}

/** Returns the public URL to serve a campaign's material image via the backend static server */
export function getMaterialUrl(material_path: string): string {
  // If path starts with http (e.g. R2 cloud URL), return as-is
  if (material_path.startsWith('http')) return material_path;
  // Local: backend serves data/ folder as /static/ — proxied via Next.js
  const relative = material_path.replace(/\\/g, '/').replace(/^data\//, '');
  return `/static/${relative}`;
}
