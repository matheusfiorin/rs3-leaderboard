/**
 * TypeScript Type Definitions for RS3 Leaderboard
 * Provides type safety and IDE support for core modules
 */

// ===== Error Handler Types =====
export function fetchWithRetry(
  url: string,
  options?: RequestInit,
  maxRetries?: number,
  timeoutMs?: number,
  abortController?: AbortController
): Promise<Response>;

export function setupGlobalErrorHandlers(): void;
export function showErrorNotification(message: string): void;
export function trackedSetTimeout(callback: () => void, ms: number): number;
export function trackedSetInterval(callback: () => void, ms: number): number;
export function addTrackedListener(
  element: Element,
  event: string,
  handler: EventListener
): void;
export function cleanupAllTimers(): void;
export function safeJsonParse<T>(json: string, fallback?: T): T;
export function safeLocalStorageGet<T>(key: string, defaultValue?: T): T;
export function safeLocalStorageSet(key: string, value: any): boolean;

// ===== XP Validation Types =====
export function getOfficialXpForLevel(level: number): number | null;
export function getLevelFromXp(xp: number): number;

export interface XpValidationResult {
  valid: boolean;
  errors: string[];
  mismatches?: Array<{
    level: number;
    expected: number;
    actual: number;
    diff: number;
  }>;
}

export function validateXpTable(xpTable: number[]): XpValidationResult;
export function getSkillLevelCap(skillId: number): number;
export function getXpToNextLevel(currentXp: number): number;
export function getProgressToNextLevel(currentXp: number): number;
export function isValidSkillLevel(skillId: number, level: number): boolean;

export interface PlayerXpValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data: {
    [skillId: number]: {
      xp: number;
      level: number;
      cap: number;
      valid: boolean;
    };
  };
}

export function validatePlayerXpData(
  playerXpData: Record<string, number>
): PlayerXpValidation;

// ===== Player Data Types =====
export interface PlayerProfile {
  name: string;
  level: number;
  xp: number;
  rank: number;
  questsCompleted: number;
  skillsPercentage: number;
  activities?: Array<{
    date: string;
    description: string;
  }>;
}

export interface PlayerHiscores {
  name: string;
  skillData: Array<{
    skillId: number;
    rank: number;
    level: number;
    xp: number;
  }>;
}

export interface PlayerGoal {
  id: string;
  skillId: number;
  targetLevel: number;
  targetXp: number;
  createdDate: string;
  completedDate?: string;
  priority: 'low' | 'medium' | 'high';
}

export interface CombatStats {
  attack: number;
  defence: number;
  strength: number;
  ranged: number;
  magic: number;
  constitution: number;
  combatLevel: number;
  dps?: number;
}

// ===== API Response Types =====
export interface ApiErrorResponse {
  error: string;
  statusCode: number;
  timestamp: number;
}

export interface CacheMetadata {
  lastUpdated: number;
  version: string;
  playerCount: number;
}

// ===== UI State Types =====
export interface UIState {
  activeTab: string;
  selectedPlayer?: string;
  sortBy: string;
  filterBy?: string;
  notifications: Array<{
    id: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
    timestamp: number;
  }>;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ===== Utility Types =====
export type Optional<T> = T | null | undefined;

export interface Result<T, E = string> {
  success: boolean;
  data?: T;
  error?: E;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ===== Storage Types =====
export interface StorageKey {
  profile: string;
  hiscores: string;
  quests: string;
  meta: string;
  cache: string;
}

// ===== Performance Monitoring =====
export interface PerformanceMetrics {
  apiCallDuration: number;
  renderDuration: number;
  memoryUsage: number;
  errorRate: number;
}

// ===== Notification Types =====
export interface Notification {
  id: string;
  playerName: string;
  skillId: number;
  level: number;
  timestamp: number;
  acknowledged: boolean;
}

export interface NotificationPreferences {
  enableLevelUp: boolean;
  enableGoalComplete: boolean;
  enableNewActivity: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
}
