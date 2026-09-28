/**
 * Cross-Tab Communication Bus (BroadcastChannel & LocalStorage Fallback)
 * Enables seamless multi-tab coordination between 1 Host tab and multiple Player tabs
 * on the same local browser without external network dependencies.
 */

import type { GameRoom, GameStage, PlayerAnswer } from '@/types/game';
import type { OptionId } from '@/types/quiz';

export const CROSS_TAB_CHANNEL_NAME = 'bdcahoot_arena_bus';
export const STORAGE_ROOM_SNAPSHOT_KEY = 'bdcahoot_room_snapshot';
export const STORAGE_PLAYER_SESSION_KEY = 'bdcahoot_player_id';

export type CrossTabMessageType =
  | 'ROOM_STATE_SYNC'
  | 'PLAYER_JOIN_REQUEST'
  | 'PLAYER_JOIN_ACCEPTED'
  | 'PLAYER_JOIN_REJECTED'
  | 'PLAYER_SUBMIT_ANSWER'
  | 'PLAYER_ANSWER_ACK'
  | 'PING_CLOCK_SYNC'
  | 'PONG_CLOCK_SYNC';

export interface BaseCrossTabMessage {
  type: CrossTabMessageType;
  timestamp: number;
  roomId: string;
}

export interface RoomStateSyncMessage extends BaseCrossTabMessage {
  type: 'ROOM_STATE_SYNC';
  room: GameRoom;
  serverTimestampMs: number;
}

export interface PlayerJoinRequestMessage extends BaseCrossTabMessage {
  type: 'PLAYER_JOIN_REQUEST';
  name: string;
  requestId: string;
}

export interface PlayerJoinAcceptedMessage extends BaseCrossTabMessage {
  type: 'PLAYER_JOIN_ACCEPTED';
  requestId: string;
  playerId: string;
}

export interface PlayerJoinRejectedMessage extends BaseCrossTabMessage {
  type: 'PLAYER_JOIN_REJECTED';
  requestId: string;
  error: string;
}

export interface PlayerSubmitAnswerMessage extends BaseCrossTabMessage {
  type: 'PLAYER_SUBMIT_ANSWER';
  playerId: string;
  option: OptionId;
  questionIndex: number;
  clientSentAtMs: number;
  submissionId: string;
}

export interface PlayerAnswerAckMessage extends BaseCrossTabMessage {
  type: 'PLAYER_ANSWER_ACK';
  submissionId: string;
  playerId: string;
  success: boolean;
  error?: string;
  serverReceivedAtMs: number;
}

export interface PingClockSyncMessage extends BaseCrossTabMessage {
  type: 'PING_CLOCK_SYNC';
  clientSentAtMs: number;
}

export interface PongClockSyncMessage extends BaseCrossTabMessage {
  type: 'PONG_CLOCK_SYNC';
  clientSentAtMs: number;
  serverReceivedAtMs: number;
}

export type CrossTabMessage =
  | RoomStateSyncMessage
  | PlayerJoinRequestMessage
  | PlayerJoinAcceptedMessage
  | PlayerJoinRejectedMessage
  | PlayerSubmitAnswerMessage
  | PlayerAnswerAckMessage
  | PingClockSyncMessage
  | PongClockSyncMessage;

export type CrossTabMessageHandler = (msg: CrossTabMessage) => void;

class CrossTabBus {
  private channel: BroadcastChannel | null = null;
  private listeners: Set<CrossTabMessageHandler> = new Set();
  private isSupported: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if (typeof BroadcastChannel !== 'undefined') {
          this.channel = new BroadcastChannel(CROSS_TAB_CHANNEL_NAME);
          this.channel.onmessage = (event: MessageEvent<CrossTabMessage>) => {
            this.notifyListeners(event.data);
          };
          this.isSupported = true;
        } else {
          // Fallback using storage event
          window.addEventListener('storage', this.handleStorageEvent);
          this.isSupported = true;
        }
      } catch {
        this.isSupported = false;
      }
    }
  }

  private handleStorageEvent = (e: StorageEvent) => {
    if (e.key === 'bdcahoot_cross_tab_event' && e.newValue) {
      try {
        const msg = JSON.parse(e.newValue) as CrossTabMessage;
        this.notifyListeners(msg);
      } catch {
        // ignore parse error
      }
    }
  };

  private notifyListeners(msg: CrossTabMessage) {
    this.listeners.forEach((handler) => {
      try {
        handler(msg);
      } catch (err) {
        console.error('[CrossTabBus] Listener error:', err);
      }
    });
  }

  public subscribe(handler: CrossTabMessageHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  public post(msg: CrossTabMessage): void {
    if (this.channel) {
      this.channel.postMessage(msg);
    } else if (typeof window !== 'undefined') {
      try {
        // Trigger storage event across other tabs
        window.localStorage.setItem('bdcahoot_cross_tab_event', JSON.stringify(msg));
      } catch {
        // ignore
      }
    }
  }

  public saveRoomSnapshot(room: GameRoom): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_ROOM_SNAPSHOT_KEY, JSON.stringify(room));
      } catch {
        // quota exceeded or storage disabled
      }
    }
  }

  public loadRoomSnapshot(): GameRoom | null {
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem(STORAGE_ROOM_SNAPSHOT_KEY);
        if (raw) {
          return JSON.parse(raw) as GameRoom;
        }
      } catch {
        return null;
      }
    }
    return null;
  }

  public clearRoomSnapshot(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(STORAGE_ROOM_SNAPSHOT_KEY);
      } catch {
        // ignore
      }
    }
  }

  public close(): void {
    this.listeners.clear();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', this.handleStorageEvent);
    }
  }

  public getActiveListenerCount(): number {
    return this.listeners.size;
  }
}

// Global Singleton Instance
export const crossTabBus = new CrossTabBus();
