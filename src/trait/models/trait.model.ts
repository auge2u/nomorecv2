import { Trait } from '../../models';

// Trait relationship type
export interface TraitRelationship {
  trait1: {
    name: string;
    category: string;
  };
  trait2: {
    name: string;
    category: string;
  };
  correlation: number;
  strength: 'strong' | 'moderate' | 'weak';
  direction: 'positive' | 'negative' | 'neutral';
}

// Trait cluster type
export interface TraitCluster {
  category: string;
  traits: string[];
  traitObjects?: Array<{
    name: string;
    score: number;
    assessmentMethod: string;
  }>;
  averageScore: number;
  topTrait: string;
  bottomTrait?: string;
  scoreRange?: {
    min: number;
    max: number;
  };
  subclusters?: Array<{
    traits: string[];
    coherence: number;
  }>;
  crossCategoryConnections?: string[];
  traitCount?: number;
}

// Meta cluster type
export interface MetaCluster {
  name: string;
  traits: string[];
  averageScore: number;
  completeness: number;
}

// Trait evolution data point
export interface TraitDataPoint {
  date: string | Date;
  score: number;
  assessmentMethod: string;
}

// Trait evolution data
export interface TraitEvolution {
  name: string;
  category: string;
  dataPoints: TraitDataPoint[];
  growthRate: {
    monthlyGrowthRate: number;
    rSquared: number;
    velocityChanges: Array<{date: string, acceleration: number}>;
    confidence: 'high' | 'medium' | 'low';
    trend: 'linear' | 'exponential' | 'plateauing' | 'fluctuating';
  };
  trend: {
    status: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    pattern?: string;
    velocityChanges?: number;
  };
}

// Trait recommendation
export interface TraitRecommendation {
  trait: string;
  currentScore: number;
  industryBenchmark: number;
  gap: number;
  needsImprovement: boolean;
  recommendations: string[];
}

// Industry benchmark definition
export interface TraitBenchmark {
  minimum: number;
  target: number;
  exceptional: number;
  importance: 'critical' | 'high' | 'medium' | 'low';
}

// Assessor information
export interface AssessorInfo {
  name: string;
  relationship: string;
  email?: string;
}

// Export existing types as needed
export { Trait };