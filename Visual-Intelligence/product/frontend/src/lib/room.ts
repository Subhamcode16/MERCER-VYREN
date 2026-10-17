import { apiFetch } from './api';

export interface RoomParticipant {
  id: string;
  name: string;
  role: string;
  is_human: boolean;
  avatar?: string;
}

export interface BackendArtifact {
  artifact_id: string;
  artifact_type: string;
  title: string;
  summary: string;
  data: Record<string, any>;
  provenance_hash?: string;
  created_at?: number;
  status?: string;
}

export interface BackendDecisionOption {
  id: string;
  label?: string;
  distinctiveness?: string;
  [key: string]: any;
}

export interface BackendDecision {
  decision_id: string;
  title: string;
  context: string;
  options: BackendDecisionOption[];
  chosen_option_id?: string;
  decided_by?: string;
  timestamp?: number;
  status: "PENDING" | "CONFIRMED" | "REJECTED";
}

export interface BackendWorkEvent {
  event_id?: string;
  step: string;
  status: "PENDING" | "ACTIVE" | "DONE" | "BLOCKED";
  timestamp?: number;
}

export interface BackendRoomMessage {
  message_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  is_human: boolean;
  content: string;
  artifacts?: BackendArtifact[];
  decisions?: BackendDecision[];
  work_events?: BackendWorkEvent[];
  timestamp?: number;
}

export interface BackendRoom {
  room_id: string;
  tenant_id: string;
  title: string;
  campaign_id?: string;
  participants: RoomParticipant[];
  messages: BackendRoomMessage[];
  artifacts: BackendArtifact[];
  active_work_progress: BackendWorkEvent[];
  created_at: number;
  updated_at: number;
}

// ── Frontend Normalized Model Types ──────────────────────────────────────────

export interface MessageArtifact {
  id: string;
  type: "RESEARCH" | "CREATIVE_DIRECTION" | "MOODBOARD" | string;
  title: string;
  summary: string;
  data: any;
}

export interface MessageDecision {
  id: string;
  title: string;
  context: string;
  options: { id: string; label: string; distinctiveness: string }[];
  chosenOptionId?: string;
  status: "PENDING" | "CONFIRMED";
}

export interface WorkEvent {
  step: string;
  status: "DONE" | "PENDING" | "ACTIVE";
}

export interface RoomMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  isHuman: boolean;
  content: string;
  timestamp: string;
  artifacts?: MessageArtifact[];
  decisions?: MessageDecision[];
  workEvents?: WorkEvent[];
}

// ── Formatters & Mappers ─────────────────────────────────────────────────────

function formatTimestamp(ts?: number): string {
  if (!ts) return "Just now";
  try {
    const d = new Date(ts * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return "Just now";
  }
}

export function mapBackendMessageToFrontend(msg: BackendRoomMessage): RoomMessage {
  return {
    id: msg.message_id,
    senderId: msg.sender_id,
    senderName: msg.sender_name,
    senderRole: msg.sender_role,
    isHuman: msg.is_human,
    content: msg.content,
    timestamp: formatTimestamp(msg.timestamp),
    artifacts: msg.artifacts?.map(art => ({
      id: art.artifact_id,
      type: art.artifact_type,
      title: art.title,
      summary: art.summary,
      data: art.data
    })),
    decisions: msg.decisions?.map(dec => ({
      id: dec.decision_id,
      title: dec.title,
      context: dec.context,
      options: (dec.options || []).map(opt => ({
        id: opt.id,
        label: opt.label || opt.id,
        distinctiveness: opt.distinctiveness || "92%"
      })),
      chosenOptionId: dec.chosen_option_id,
      status: dec.status === "CONFIRMED" ? "CONFIRMED" : "PENDING"
    })),
    workEvents: msg.work_events?.map(we => ({
      step: we.step,
      status: we.status === "DONE" ? "DONE" : we.status === "ACTIVE" ? "ACTIVE" : "PENDING"
    }))
  };
}

export function mapBackendRoomToFrontendMessages(room: BackendRoom): RoomMessage[] {
  if (!room.messages || room.messages.length === 0) return [];
  return room.messages.map(mapBackendMessageToFrontend);
}

// ── API Operations ───────────────────────────────────────────────────────────

export async function fetchRoom(roomId: string = "room-default-studio"): Promise<BackendRoom> {
  const data = await apiFetch(`/api/v1/rooms/${roomId}`);
  return data.room;
}

export async function createRoom(title: string, campaignId?: string): Promise<BackendRoom> {
  const data = await apiFetch('/api/v1/rooms/', {
    method: 'POST',
    body: JSON.stringify({ title, campaign_id: campaignId })
  });
  return data.room;
}

export async function sendRoomMessage(
  roomId: string,
  content: string,
  userName: string = "Elena Vance"
): Promise<BackendRoomMessage> {
  const data = await apiFetch(`/api/v1/rooms/${roomId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ content, user_name: userName })
  });
  return data.message;
}

export async function recordRoomDecision(
  roomId: string,
  decisionId: string,
  chosenOptionId: string,
  decidedBy: string = "Elena Vance"
): Promise<BackendDecision> {
  const data = await apiFetch(`/api/v1/rooms/${roomId}/decisions/${decisionId}`, {
    method: 'POST',
    body: JSON.stringify({
      chosen_option_id: chosenOptionId,
      decided_by: decidedBy
    })
  });
  return data.decision;
}

export async function ingestMoodboard(
  boardId: string,
  tenantId: string = "tenant_default"
): Promise<any> {
  return await apiFetch('/api/v1/mcp/pinterest/ingest', {
    method: 'POST',
    body: JSON.stringify({ board_id: boardId, tenant_id: tenantId })
  });
}
