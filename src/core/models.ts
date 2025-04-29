/**
 * Core models and types for the application
 */

// Profile related models
export interface Profile {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  title?: string;
  summary?: string;
  industry?: string;
  location?: string;
  photoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Trait related models
export interface Trait {
  id: string;
  profileId: string;
  name: string;
  category: string;
  score: number;
  assessmentMethod: 'self' | 'external' | 'derived';
  assessmentDate: Date;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

// Content related models
export interface Content {
  id: string;
  profileId: string;
  type: string;
  data: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Interview related models
export interface Interview {
  id: string;
  profileId: string;
  title: string;
  date: Date;
  questions: Array<{
    id: string;
    text: string;
    response?: string;
    analysis?: Record<string, any>;
  }>;
  summary?: string;
  insights?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Output related models
export interface Output {
  id: string;
  profileId: string;
  type: string;
  format: string;
  content: string | Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

// Other common types and interfaces
export type SortDirection = 'asc' | 'desc';
export type PaginationParams = {
  page: number;
  limit: number;
};
