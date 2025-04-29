/**
 * Common types used across the application
 */

// Generic response type
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Query parameters for filtering and pagination
export interface QueryParams {
  filters?: Record<string, any>;
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
  pagination?: {
    page: number;
    limit: number;
  };
}

// Authentication related types
export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export type UserRole = 'user' | 'admin' | 'guest';

// Environment configuration
export interface AppConfig {
  environment: 'development' | 'staging' | 'production';
  apiUrl: string;
  auth: {
    tokenExpiryMinutes: number;
  };
  features: Record<string, boolean>;
}

// Event types for the application
export enum EventType {
  PROFILE_CREATED = 'profile.created',
  PROFILE_UPDATED = 'profile.updated',
  TRAIT_ASSESSED = 'trait.assessed',
  CONTENT_ADDED = 'content.added',
  INTERVIEW_COMPLETED = 'interview.completed',
  OUTPUT_GENERATED = 'output.generated'
}

// Event data structure
export interface AppEvent<T = any> {
  id: string;
  type: EventType;
  timestamp: Date;
  data: T;
}
