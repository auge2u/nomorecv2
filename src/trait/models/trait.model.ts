/**
 * Trait Models
 * 
 * Defines the data models for the trait system
 * Part of the WP9 Persona Trait System implementation
 */

// Import core model for type compatibility
import { Trait as CoreTrait } from '../../core/models';

/**
 * Extended Trait Model
 * Extends the core Trait model with additional properties specific to the trait system
 */
export interface Trait {
  id: string;
  profileId: string;
  name: string;
  category: string;
  description?: string;
  score: number;
  confidence?: number;  // Made optional to improve compatibility with core Trait
  source?: string;
  assessmentMethod: 'self' | 'external' | 'derived' | 'validated' | 'combined';
  assessmentDate: Date;
  lastUpdated?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * Core to Extended Trait Converter
 * Helper function to convert Core Trait to Extended Trait
 */
export const coreToExtendedTrait = (coreTrait: CoreTrait): Trait => {
  return {
    ...coreTrait,
    confidence: 80, // Default confidence
    source: coreTrait.metadata?.source || 'system'
  } as Trait;
};

/**
 * Extended to Core Trait Converter
 * Helper function to convert Extended Trait to Core Trait
 */
export const extendedToCoreTrait = (extendedTrait: Trait): CoreTrait => {
  const { confidence, source, description, ...coreTraitProps } = extendedTrait;
  
  // Map extended assessment methods to core assessment methods
  let assessmentMethod: 'self' | 'external' | 'derived' = 'derived';
  
  if (extendedTrait.assessmentMethod === 'self' ||
      extendedTrait.assessmentMethod === 'external') {
    assessmentMethod = extendedTrait.assessmentMethod;
  } else if (extendedTrait.assessmentMethod === 'derived' ||
             extendedTrait.assessmentMethod === 'validated' ||
             extendedTrait.assessmentMethod === 'combined') {
    assessmentMethod = 'derived';
  }
  
  return {
    ...coreTraitProps,
    assessmentMethod,
    metadata: {
      ...(extendedTrait.metadata || {}),
      confidence,
      source,
      description,
      originalAssessmentMethod: extendedTrait.assessmentMethod
    }
  } as CoreTrait;
};

/**
 * Adapter function to use Core Traits with the Extended Trait System
 */
export const adaptCoreTrait = (coreTrait: CoreTrait): Trait => {
  return {
    ...coreTrait,
    confidence: coreTrait.metadata?.confidence || 80,
    source: coreTrait.metadata?.source || 'system'
  } as Trait;
};

/**
 * Adapter function to convert multiple Core Traits to Extended Traits
 */
export const adaptCoreTraits = (coreTraits: CoreTrait[]): Trait[] => {
  return coreTraits.map(adaptCoreTrait);
};

/**
 * Trait Assessment Model
 * Represents a trait assessment result
 */
export interface TraitAssessment {
  id?: string;
  profileId: string;
  assessmentType: TraitAssessmentType;
  traits: Trait[];
  source: string;
  timestamp: Date;
  metadata?: {
    completionRate?: number;
    duration?: number;
    confidenceLevel?: number;
    context?: string;
  };
}

/**
 * Trait Assessment Type Enum
 */
export type TraitAssessmentType = 
  'direct' |      // Direct user assessment via questionnaire
  'indirect' |    // Derived from content analysis
  'inferred' |    // Inferred from related traits or data
  'validated' |   // Validated through multiple sources
  'combined';     // Combined from multiple assessments

/**
 * Trait Relationship Model
 * Defines a relationship between two traits
 */
export interface TraitRelationship {
  id?: string;
  profileId: string;
  traitId1: string;
  traitId2: string;
  trait1?: Trait;
  trait2?: Trait;
  type: TraitRelationshipType;
  strength: number;
  description?: string;
  source?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Trait Relationship Type Enum
 */
export type TraitRelationshipType = 
  'complementary' |  // Traits that enhance each other
  'conflicting' |    // Traits that may conflict with each other
  'reinforcing' |    // Traits that reinforce the same behavior/attribute
  'sequential' |     // Traits that form a development sequence
  'contextual';      // Traits related in specific contexts

/**
 * Trait Snapshot
 * A point-in-time measurement of a trait
 */
export interface TraitSnapshot {
  date: Date;
  score: number;
  confidence: number;
  source: string;
  context?: string;
  assessmentMethod?: string;
}

/**
 * Trait Evolution Model
 * Tracks the evolution of a trait over time
 */
export interface TraitEvolution {
  id?: string;
  profileId: string;
  traitId: string;
  traitName?: string;
  name?: string; // Alias for traitName for compatibility
  snapshots: TraitSnapshot[];
  dataPoints: TraitSnapshot[]; // Alias for snapshots for compatibility
  projection?: TraitSnapshot[]; // Projected future snapshots
  startDate: Date;
  latestDate: Date;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trend?: string; // Alias for trendDirection for compatibility
  changeRate?: number;  // Rate of change as percentage
  confidence?: number;  // Confidence in the evolution tracking
}

/**
 * Trait Milestone
 * Represents a milestone in trait development
 */
export interface TraitMilestone {
  id?: string;
  traitId: string;
  profileId: string;
  name: string;
  description: string;
  criteria: string;
  score: number;
  date: Date;
  achieved: boolean;
  evidence?: string;
}

/**
 * Trait Recommendation Model
 * Represents a recommendation based on trait analysis
 */
export interface TraitRecommendation {
  id?: string;
  profileId: string;
  type: TraitRecommendationType;
  title: string;
  description: string;
  traitId?: string;
  traitName?: string;
  category?: string;
  priority: number;
  actionItems: string[];
  impact: string;
  reason: string;
  timeframe?: string;
  createdAt: Date;
  status?: 'new' | 'viewed' | 'implemented' | 'dismissed';
}

/**
 * Trait Recommendation Type Enum
 */
export type TraitRecommendationType = 
  'content' |       // Content emphasis recommendations
  'skill' |         // Skill development recommendations
  'career' |        // Career path recommendations
  'communication' | // Communication style guidance
  'development';    // Personal development recommendations

/**
 * Trait Cluster
 * A grouping of related traits
 */
export interface TraitCluster {
  id?: string;
  profileId: string;
  name: string;
  description?: string;
  category?: string;
  traits: TraitClusterMember[];  // References to traits with weights
  centrality: number;
  importance: number;
  context?: string;
}

/**
 * Trait Cluster Member
 * A member of a trait cluster with associated weight
 */
export interface TraitClusterMember {
  id: string;       // Trait ID
  name: string;     // Trait name for convenience
  weight: number;   // Importance of trait in this cluster
}

/**
 * Meta Cluster
 * A higher-level grouping of trait clusters
 */
export interface MetaCluster {
  id: string;
  name: string;
  description?: string;
  clusterIds: string[];
  clusters?: TraitCluster[];
  importance: number;
  context: string;
}

/**
 * Trait Query Options
 * Options for querying traits
 */
export interface TraitQueryOptions {
  includeCategories?: string[];
  excludeCategories?: string[];
  minScore?: number;
  maxScore?: number;
  sortBy?: 'score' | 'name' | 'category' | 'confidence' | 'lastUpdated';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  source?: string;
  includeMetadata?: boolean;
  includeRelationships?: boolean;
  includeEvolution?: boolean;
}

/**
 * Trait Assessment Configuration
 * Configuration options for trait assessments
 */
export interface TraitAssessmentConfig {
  profileId: string;
  assessmentType: TraitAssessmentType;
  contentTypes?: ('resume' | 'project' | 'social' | 'professional' | 'feedback' | 'interview' | 'article' | 'general')[];
  includeCategories?: string[];
  excludeCategories?: string[];
  targetTraits?: string[];
  confidenceThreshold?: number;
  context?: string;
  customParameters?: Record<string, any>;
}

/**
 * Trait Evolution Options
 * Options for tracking trait evolution
 */
export interface TraitEvolutionOptions {
  traitIds?: string[];
  categories?: string[];
  timeframe?: 'short' | 'medium' | 'long';
  startDate?: Date;
  endDate?: Date;
  includeConfidence?: boolean;
  groupByCategory?: boolean;
  smoothing?: boolean;  // Whether to apply smoothing to the data
}

/**
 * Trait Visualization Options
 * Options for trait visualizations
 */
export interface TraitVisualizationOptions {
  visType?: 'constellation' | 'distribution' | 'comparison' | 'evolution' | 'context';
  includeCategories?: string[];
  excludeCategories?: string[];
  sortBy?: 'score' | 'name' | 'category';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  threshold?: number;
  groupByCategory?: boolean;
  includeRelationships?: boolean;
  colorScheme?: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Trait Assessment Result
 * The result of a trait assessment
 */
export interface TraitAssessmentResult {
  profileId: string;
  assessmentType: TraitAssessmentType;
  traits: Trait[];
  confidence: number;
  timestamp: Date;
  metadata?: Record<string, any>;
  rawData?: any;
}

/**
 * Trait Context
 * Contextual information for adapting traits
 */
export interface TraitContext {
  type: 'role' | 'industry' | 'project' | 'team' | 'audience';
  value: string;
  requirements?: Array<{
    name: string;
    importance: number;
  }>;
  emphasisCategories?: string[];
  description?: string;
}

/**
 * Trait Analysis Filter
 * Filter criteria for analyzing traits
 */
export interface TraitAnalysisFilter {
  profileId: string;
  traitIds?: string[];
  categories?: string[];
  minScore?: number;
  maxScore?: number;
  sources?: string[];
  timeframe?: 'recent' | 'all';
  context?: string;
}

/**
 * Trait Benchmark
 * Benchmark data for trait comparison
 */
export interface TraitBenchmark {
  id: string;
  name: string;
  type: 'industry' | 'role' | 'skillset' | 'expert' | 'peer';
  description?: string;
  traits: Array<{
    name: string;
    score: number;
    category?: string;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Trait Insight
 * Insights derived from trait analysis
 */
export interface TraitInsight {
  id?: string;
  profileId: string;
  type: 'strength' | 'gap' | 'opportunity' | 'pattern' | 'anomaly' | 'trend';
  title: string;
  description: string;
  relatedTraits: string[];
  confidence: number;
  priority: number;
  actionable: boolean;
  generatedAt: Date;
}

/**
 * Trait Report
 * A comprehensive report of trait analysis
 */
export interface TraitReport {
  profileId: string;
  generatedAt: Date;
  summary: {
    topStrengths: string[];
    developmentAreas: string[];
    distinctiveTraits: string[];
    overallProfile: string;
  };
  traitsByCategory: Record<string, Trait[]>;
  insights: TraitInsight[];
  recommendations: TraitRecommendation[];
  evolutionSummary?: {
    fastestGrowing: string[];
    mostConsistent: string[];
    recentChanges: string[];
  };
  benchmarkComparisons?: Array<{
    benchmarkName: string;
    matchScore: number;
    significantDifferences: string[];
  }>;
}