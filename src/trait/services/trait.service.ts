import logger from '../../utils/logger';
import { Trait } from '../../core/models';
import { AppError } from '../../middleware/error.middleware';
import supabase from '../../core/supabase';
import { TraitDataRepository } from './trait-data.repository';
import { TraitAssessmentEngine } from './trait-assessment.engine';
import { TraitAnalyticsEngine } from './trait-analytics.engine';
import { TraitEvolutionTracker } from './trait-evolution.tracker';
import { TraitRecommendationEngine } from './trait-recommendation.engine';
import { TraitRelationship, TraitCluster, MetaCluster, TraitEvolution, TraitRecommendation } from '../models/trait.model';

// Domain-specific error classes for more granular error handling
class TraitError extends AppError {
  constructor(message: string, statusCode = 500, details?: any) {
    super(message, statusCode);
    this.name = 'TraitError';
    this.details = details;
  }
}

class TraitValidationError extends TraitError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
    this.name = 'TraitValidationError';
  }
}

class TraitNotFoundError extends TraitError {
  constructor(message: string, details?: any) {
    super(message, 404, details);
    this.name = 'TraitNotFoundError';
  }
}

class TraitDatabaseError extends TraitError {
  constructor(message: string, details?: any) {
    super(message, 500, details);
    this.name = 'TraitDatabaseError';
  }
}

// Transaction helper to ensure proper transaction handling
interface TransactionOptions {
  isolationLevel?: 'serializable' | 'read_committed';
  maxRetries?: number;
  retryDelay?: number; // milliseconds
}

const DEFAULT_TRANSACTION_OPTIONS: TransactionOptions = {
  isolationLevel: 'read_committed',
  maxRetries: 3,
  retryDelay: 100
};

/**
 * Comprehensive service for managing and analyzing persona traits
 * Implementation of WP9: The Persona Trait System
 *
 * This service handles:
 * - Trait assessment (self, external, derived)
 * - Trait relationship analysis
 * - Trait evolution tracking and projection
 * - Personalized trait recommendations
 * - Advanced correlation and pattern detection
 */
export class TraitService {
  private dataRepository: TraitDataRepository;
  private assessmentEngine: TraitAssessmentEngine;
  private analyticsEngine: TraitAnalyticsEngine;
  private evolutionTracker: TraitEvolutionTracker;
  private recommendationEngine: TraitRecommendationEngine;

  constructor() {
    this.dataRepository = new TraitDataRepository();
    this.assessmentEngine = new TraitAssessmentEngine();
    this.analyticsEngine = new TraitAnalyticsEngine();
    this.evolutionTracker = new TraitEvolutionTracker(this.dataRepository);
    this.recommendationEngine = new TraitRecommendationEngine();
  }

  /**
   * Get all traits for a profile
   */
  async getTraitsForProfile(profileId: string, category?: string): Promise<Trait[]> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      return await this.dataRepository.getTraitsForProfile(profileId, category);
    } catch (error) {
      logger.error('Error getting profile traits', { error, profileId });
      throw new Error(`Failed to fetch traits for profile ${profileId}: ${error.message}`);
    }
  }

  /**
   * Get a specific trait by ID
   */
  async getTraitById(traitId: string): Promise<Trait | null> {
    try {
      if (!traitId) {
        throw new Error('Trait ID is required');
      }
      
      return await this.dataRepository.getTraitById(traitId);
    } catch (error) {
      logger.error('Error getting trait by ID', { error, traitId });
      throw new Error(`Failed to fetch trait ${traitId}: ${error.message}`);
    }
  }

  /**
   * Add a self-assessed trait to a profile
   */
  async addSelfAssessedTrait(
    profileId: string,
    name: string,
    category: string,
    score: number,
    context?: { [key: string]: any }
  ): Promise<Trait> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      if (!name || !category) {
        throw new Error('Trait name and category are required');
      }
      
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      
      const trait = {
        profileId,
        name,
        category,
        score,
        assessmentMethod: 'self' as const,
        assessmentDate: new Date()
      };
      
      // Use insert transaction for safety
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) throw beginError;
      
      const newTrait = await this.createTrait(trait);
      
      // After adding a new trait, trigger derived trait updates
      await this.updateDerivedTraits(profileId);
      
      const { error: endError } = await supabase.rpc('commit_transaction');
      if (endError) {
        logger.error('Transaction error in addSelfAssessedTrait', { error: endError });
        await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
        throw endError;
      }
      
      return newTrait;
    } catch (error) {
      // Ensure transaction is rolled back on error
      await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
      
      logger.error('Error adding self-assessed trait', { error, profileId, name });
      throw new Error(`Failed to add trait: ${error.message}`);
    }
  }

  /**
   * Add an externally assessed trait to a profile
   */
  async addExternalAssessedTrait(
    profileId: string,
    name: string,
    category: string,
    score: number,
    assessedBy: string,
    context?: { [key: string]: any }
  ): Promise<Trait> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      if (!name || !category) {
        throw new Error('Trait name and category are required');
      }
      
      if (score < 0 || score > 100) {
        throw new Error('Score must be between 0 and 100');
      }
      
      if (!assessedBy) {
        throw new Error('Assessor information is required for external assessments');
      }
      
      const trait = {
        profileId,
        name,
        category,
        score,
        assessmentMethod: 'external' as const,
        assessmentDate: new Date(),
      };
      
      // Store assessor info separately
      await this.dataRepository.storeAssessorInfo(profileId, name, {
        name: assessedBy,
        relationship: "professional"
      });
      
      // Use insert transaction for safety
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) throw beginError;
      
      const newTrait = await this.createTrait(trait);
      
      // After adding a new trait, trigger derived trait updates
      await this.updateDerivedTraits(profileId);
      
      const { error: endError } = await supabase.rpc('commit_transaction');
      if (endError) throw endError;
      
      return newTrait;
    } catch (error) {
      // Ensure transaction is rolled back on error
      await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
      
      logger.error('Error adding externally assessed trait', { error, profileId, name });
      throw new Error(`Failed to add external trait: ${error.message}`);
    }
  }

  /**
   * Automatically assess traits from profile data
   */
  async assessTraitsFromProfile(profileId: string): Promise<Trait[]> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      // Use transaction to ensure consistency
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) throw beginError;
      
      // Get profile data from repository
      const profileData = await this.dataRepository.getProfileData(profileId);
      
      // Calculate trait scores using assessment engine
      const assessedTraits: Array<{
        profileId: string;
        name: string;
        category: string;
        score: number;
        assessmentMethod: 'derived';
        assessmentDate: Date;
      }> = [];
      
      // Analytical thinking assessment
      try {
        const analyticalScore = await this.calculateAnalyticalThinkingScore(profileId);
        assessedTraits.push({
          profileId,
          name: 'Analytical Thinking',
          category: 'cognitive',
          score: analyticalScore,
          assessmentMethod: 'derived',
          assessmentDate: new Date()
        });
      } catch (error) {
        logger.warn(`Failed to assess analytical thinking trait: ${error.message}`);
      }
      
      // Leadership assessment
      try {
        const leadershipScore = await this.calculateLeadershipScore(profileId);
        assessedTraits.push({
          profileId,
          name: 'Leadership',
          category: 'professional',
          score: leadershipScore,
          assessmentMethod: 'derived',
          assessmentDate: new Date()
        });
      } catch (error) {
        logger.warn(`Failed to assess leadership trait: ${error.message}`);
      }
      
      // Add traits to the database
      const createdTraits: Trait[] = [];
      for (const trait of assessedTraits) {
        try {
          const createdTrait = await this.createTrait(trait);
          createdTraits.push(createdTrait);
        } catch (error) {
          logger.warn(`Failed to create trait: ${error.message}`);
        }
      }
      
      // Commit transaction
      const { error: endError } = await supabase.rpc('commit_transaction');
      if (endError) throw endError;
      
      return createdTraits;
    } catch (error) {
      // Ensure transaction is rolled back on error
      await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
      
      logger.error('Error assessing traits from profile', { error, profileId });
      throw new Error(`Failed to assess traits: ${error.message}`);
    }
  }

  /**
   * Delete a trait
   */
  async deleteTrait(traitId: string): Promise<void> {
    try {
      if (!traitId) {
        throw new Error('Trait ID is required');
      }
      
      // Use transaction to ensure database consistency
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) throw beginError;
      
      // Get trait to find the profile ID
      const trait = await this.dataRepository.getTraitById(traitId);
      if (!trait) {
        throw new Error(`Trait not found: ${traitId}`);
      }
      
      await this.dataRepository.deleteTrait(traitId);
      
      // After deleting a trait, trigger derived trait updates
      await this.updateDerivedTraits(trait.profileId);
      
      // Commit transaction
      const { error: endError } = await supabase.rpc('commit_transaction');
      if (endError) throw endError;
    } catch (error) {
      // Ensure transaction is rolled back on error
      await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
      
      logger.error('Error deleting trait', { error, traitId });
      throw new Error(`Failed to delete trait: ${error.message}`);
    }
  }

  /**
   * Get trait history for a profile
   */
  async getTraitHistory(
    profileId: string,
    traitName?: string
  ): Promise<any[]> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      return await this.dataRepository.getTraitHistory(profileId, traitName);
    } catch (error) {
      logger.error('Error retrieving trait history', { error, profileId, traitName });
      throw new Error(`Failed to get trait history: ${error.message}`);
    }
  }

  /**
   * Advanced trait relationship analysis with sophisticated correlation methods
   * Analyzes inter-trait relationships, temporal patterns, and clustered traits
   * to provide deeper insights into persona dynamics
   */
  async getTraitRelationships(profileId: string): Promise<{
    relationships: TraitRelationship[];
    clusters: {
      categoryClusters: TraitCluster[];
      metaClusters: MetaCluster[];
    };
    analysisMetrics?: {
      relationshipStrengthDistribution: { high: number, medium: number, low: number };
      dominantPatterns: string[];
      temporalStability: number;
    };
  }> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      // Begin transaction for data consistency
      const { error: beginError } = await supabase.rpc('begin_transaction');
      if (beginError) {
        logger.error('Transaction error in trait relationship analysis', { error: beginError });
        throw new Error(`Transaction error: ${beginError.message}`);
      }
      
      // Fetch all traits for the profile
      const traits = await this.getTraitsForProfile(profileId);
      if (!traits || traits.length === 0) {
        // Complete transaction and return empty results
        await supabase.rpc('commit_transaction').catch(err => {
          logger.warn('Error committing empty transaction', { err });
        });
        return { 
          relationships: [], 
          clusters: { categoryClusters: [], metaClusters: [] } 
        };
      }
      
      // Get extended trait history with more data points for better temporal analysis 
      const traitHistory = await this.dataRepository.getTraitHistory(profileId);
      
      // Get trait evolution data for advanced pattern recognition
      const traitEvolution = await this.getTraitEvolution(profileId, {}) as TraitEvolution[];
      const evolutionData = Array.isArray(traitEvolution) ? traitEvolution : [traitEvolution];
      
      // Prepare simplified traits
      const simplifiedTraits = traits.map(t => ({
        name: t.name,
        category: t.category,
        score: t.score
      }));
      
      // Perform advanced relationship analysis
      const relationships = this.analyticsEngine.analyzeTraitRelationships(traits);
      
      // Group history by trait name with improved date sorting
      let historyByTrait: Record<string, any[]> = {};
      if (traitHistory && traitHistory.length > 0) {
        historyByTrait = traitHistory.reduce((acc, entry) => {
          if (!acc[entry.name]) {
            acc[entry.name] = [];
          }
          acc[entry.name].push(entry);
          return acc;
        }, {} as Record<string, any[]>);
        
        // Sort each trait's history by date for accurate temporal analysis
        Object.keys(historyByTrait).forEach(traitName => {
          historyByTrait[traitName].sort((a, b) => {
            const dateA = new Date(a.timestamp || a.date).getTime();
            const dateB = new Date(b.timestamp || b.date).getTime();
            return dateA - dateB;
          });
        });
      }
      
      // Calculate relationship strength distribution for analysis metrics
      const relationshipStrengths = {
        high: 0,
        medium: 0,
        low: 0
      };
      
      // Track common patterns for analysis
      const patternFrequency: Record<string, number> = {};
      
      // Add sophisticated correlation analysis to relationships
      for (const rel of relationships.relationships) {
        try {
          const trait1History = historyByTrait[rel.trait1.name] || [];
          const trait2History = historyByTrait[rel.trait2.name] || [];
          
          // Enhanced temporal correlation with sufficient data points
          if (trait1History.length > 2 && trait2History.length > 2) {
            // Extract aligned scores by timestamp (more accurate than simple lists)
            const alignedScores = this.getAlignedScoresByDate(trait1History, trait2History);
            
            if (alignedScores.trait1Scores.length > 2) {
              // Calculate temporal correlation coefficient (Pearson's r)
              const temporalCorrelation = this.calculateNumericCorrelation(
                alignedScores.trait1Scores,
                alignedScores.trait2Scores
              );
              
              // Calculate moving window correlations for stability analysis
              const windowCorrelations = this.calculateMovingWindowCorrelations(
                alignedScores.trait1Scores,
                alignedScores.trait2Scores,
                3 // Window size
              );
              
              // Calculate correlation stability (standard deviation of correlation values)
              const correlationStability = windowCorrelations.length > 1 
                ? this.calculateStandardDeviation(windowCorrelations)
                : 1;
                
              // Enhanced growth pattern detection
              let growthPattern = 'independent';
              if (temporalCorrelation > 0.7) {
                growthPattern = 'synchronized_growth';
              } else if (temporalCorrelation > 0.4) {
                growthPattern = 'moderately_synchronized';
              } else if (temporalCorrelation < -0.7) {
                growthPattern = 'inverse_growth';
              } else if (temporalCorrelation < -0.4) {
                growthPattern = 'moderately_inverse';
              }
              
              // Add pattern to frequency tracker
              patternFrequency[growthPattern] = (patternFrequency[growthPattern] || 0) + 1;
              
              // Calculate confidence level based on sample size and correlation strength
              const confidenceLevel = this.calculateConfidenceLevel(
                alignedScores.trait1Scores.length,
                Math.abs(temporalCorrelation)
              );
              
              // Phase shift detection (temporal lag analysis)
              const phaseShift = this.detectPhaseShift(trait1History, trait2History);
              
              // Analyze complementary growth patterns
              const complementaryGrowth = this.assessComplementaryGrowth(
                rel.trait1.trend,
                rel.trait2.trend
              );
              
              // Enhanced relationship with detailed analytics
              Object.assign(rel, {
                temporalCorrelation,
                correlationStability,
                growthPattern,
                confidenceLevel,
                phaseShift,
                complementaryGrowth,
                sampleSize: alignedScores.trait1Scores.length
              });
              
              // Update relationship strength counters
              if (Math.abs(temporalCorrelation) > 0.7) {
                relationshipStrengths.high++;
              } else if (Math.abs(temporalCorrelation) > 0.4) {
                relationshipStrengths.medium++;
              } else {
                relationshipStrengths.low++;
              }
            }
          }
        } catch (error) {
          logger.warn(`Error analyzing relationship between ${rel.trait1.name} and ${rel.trait2.name}`, { error });
        }
      }
      
      // Sort relationships by correlation strength (most significant first)
      relationships.relationships.sort((a, b) => {
        const aCorr = a.temporalCorrelation !== undefined ? Math.abs(a.temporalCorrelation) : 0;
        const bCorr = b.temporalCorrelation !== undefined ? Math.abs(b.temporalCorrelation) : 0;
        return bCorr - aCorr;
      });
      
      // Get dominant patterns (top 3)
      const dominantPatterns = Object.entries(patternFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([pattern]) => pattern);
      
      // Calculate temporal stability from correlation stabilities
      const stabilityValues = relationships.relationships
        .filter(r => r.correlationStability !== undefined)
        .map(r => r.correlationStability);
      
      const temporalStability = stabilityValues.length > 0
        ? 1 - (this.calculateStandardDeviation(stabilityValues) / Math.max(...stabilityValues))
        : 0;
      
      // Commit transaction
      const { error: endError } = await supabase.rpc('commit_transaction');
      if (endError) {
        logger.error('Transaction error in trait relationship analysis', { error: endError });
        throw new Error(`Transaction error: ${endError.message}`);
      }
      
      // Return enhanced analysis with metrics
      return {
        ...relationships,
        analysisMetrics: {
          relationshipStrengthDistribution: relationshipStrengths,
          dominantPatterns,
          temporalStability
        }
      };
    } catch (error) {
      // Ensure transaction is rolled back on error
      await supabase.rpc('rollback_transaction').catch(e => logger.error('Rollback failed', { error: e }));
      
      logger.error('Error analyzing trait relationships', { error, profileId });
      throw new Error(`Failed to analyze trait relationships: ${error.message}`);
    }
  }
  
  // Utility to calculate standard deviation
  private calculateStandardDeviation(values: number[]): number {
    const n = values.length;
    if (n < 2) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    return Math.sqrt(variance);
  }
  
  private calculateMovingWindowCorrelations(
    values1: number[],
    values2: number[],
    windowSize: number
  ): number[] {
    if (values1.length !== values2.length) return [];
    if (values1.length <= windowSize) return [this.calculateNumericCorrelation(values1, values2)];
    
    const results: number[] = [];
    for (let i = 0; i <= values1.length - windowSize; i++) {
      const window1 = values1.slice(i, i + windowSize);
      const window2 = values2.slice(i, i + windowSize);
      results.push(this.calculateNumericCorrelation(window1, window2));
    }
    
    return results;
  }
  
  private calculateConfidenceLevel(sampleSize: number, correlation: number): string {
    if (sampleSize < 5) return 'low';
    if (sampleSize < 10) return correlation > 0.7 ? 'medium' : 'low';
    if (sampleSize < 30) return correlation > 0.5 ? 'high' : correlation > 0.3 ? 'medium' : 'low';
    return correlation > 0.3 ? 'very_high' : correlation > 0.2 ? 'high' : 'medium';
  }
  
  private detectPhaseShift(trait1History: any[], trait2History: any[]): { 
    hasPhaseShift: boolean;
    leadingTrait?: string;
    lagAmount?: number;
    confidence: string;
  } {
    try {
      if (trait1History.length < 5 || trait2History.length < 5) {
        return { hasPhaseShift: false, confidence: 'insufficient_data' };
      }
      
      // Convert histories to time series with aligned dates
      const series1 = trait1History.map(h => ({
        date: new Date(h.date || h.timestamp).getTime(),
        score: h.score || 0
      }));
      
      const series2 = trait2History.map(h => ({
        date: new Date(h.date || h.timestamp).getTime(),
        score: h.score || 0
      }));
      
      // Find inflection points (score trend changes)
      const scoresSeries1 = series1.map(p => p.score);
      const scoresSeries2 = series2.map(p => p.score);
      
      const inflectionIndices1 = this.findInflectionPoints(scoresSeries1);
      const inflectionIndices2 = this.findInflectionPoints(scoresSeries2);
      
      if (inflectionIndices1.length === 0 || inflectionIndices2.length === 0) {
        return { hasPhaseShift: false, confidence: 'no_inflection_points' };
      }
      
      // Get dates of inflection points
      const inflectionDates1 = inflectionIndices1.map(i => series1[i].date);
      const inflectionDates2 = inflectionIndices2.map(i => series2[i].date);
      
      // For each inflection in trait1, find the closest inflection in trait2
      let totalLag = 0;
      let matchingPoints = 0;
      
      for (const date1 of inflectionDates1) {
        const closestDate2 = inflectionDates2.reduce((closest, current) => {
          return Math.abs(current - date1) < Math.abs(closest - date1) ? current : closest;
        }, inflectionDates2[0]);
        
        // If inflection points are close enough, count as a match
        if (Math.abs(closestDate2 - date1) < 30 * 24 * 60 * 60 * 1000) { // 30 days max
          totalLag += closestDate2 - date1;
          matchingPoints++;
        }
      }
      
      if (matchingPoints < 2) {
        return { hasPhaseShift: false, confidence: 'insufficient_matches' };
      }
      
      const averageLag = totalLag / matchingPoints;
      const absLag = Math.abs(averageLag);
      const lagDays = Math.round(absLag / (24 * 60 * 60 * 1000));
      
      if (absLag < 3 * 24 * 60 * 60 * 1000) { // Less than 3 days
        return { hasPhaseShift: false, confidence: 'synchronized' };
      }
      
      return {
        hasPhaseShift: true,
        leadingTrait: averageLag < 0 ? trait1History[0].name : trait2History[0].name,
        lagAmount: lagDays,
        confidence: matchingPoints > 3 ? 'high' : 'medium'
      };
    } catch (error) {
      logger.warn('Error detecting phase shift', { error });
      return { hasPhaseShift: false, confidence: 'error' };
    }
  }
  
  private findInflectionPoints(series: number[]): number[] {
    if (series.length < 3) return [];
    
    const inflectionIndices: number[] = [];
    for (let i = 1; i < series.length - 1; i++) {
      const prevDiff = series[i] - series[i-1];
      const nextDiff = series[i+1] - series[i];
      
      // Inflection point: sign changes or local min/max
      if ((prevDiff >= 0 && nextDiff < 0) || (prevDiff <= 0 && nextDiff > 0)) {
        inflectionIndices.push(i);
      }
    }
    
    return inflectionIndices;
  }
  
  private getAlignedScoresByDate(trait1History: any[], trait2History: any[]): {
    trait1Scores: number[];
    trait2Scores: number[];
    dates: Date[];
  } {
    // Build maps of date (string) => score
    const trait1Map = new Map<string, number>();
    const trait2Map = new Map<string, number>();
    
    trait1History.forEach(entry => {
      const dateStr = new Date(entry.date || entry.timestamp).toISOString().split('T')[0];
      trait1Map.set(dateStr, entry.score);
    });
    
    trait2History.forEach(entry => {
      const dateStr = new Date(entry.date || entry.timestamp).toISOString().split('T')[0];
      trait2Map.set(dateStr, entry.score);
    });
    
    // Find common dates
    const commonDates: string[] = [];
    trait1Map.forEach((_, date) => {
      if (trait2Map.has(date)) {
        commonDates.push(date);
      }
    });
    
    // Sort dates chronologically
    commonDates.sort();
    
    // Build aligned score arrays
    const trait1Scores: number[] = [];
    const trait2Scores: number[] = [];
    const dates: Date[] = [];
    
    commonDates.forEach(dateStr => {
      trait1Scores.push(trait1Map.get(dateStr) || 0);
      trait2Scores.push(trait2Map.get(dateStr) || 0);
      dates.push(new Date(dateStr));
    });
    
    return { trait1Scores, trait2Scores, dates };
  }
  
  private assessComplementaryGrowth(trend1?: string, trend2?: string): string {
    if (!trend1 || !trend2) {
      return 'insufficient_data';
    }
    
    function getDirection(trend: string): 'positive' | 'neutral' | 'negative' {
      if (['increasing', 'improving', 'rapid_growth'].includes(trend)) {
        return 'positive';
      } else if (['stable', 'consistent', 'plateau'].includes(trend)) {
        return 'neutral';
      } else {
        return 'negative';
      }
    }
    
    const dir1 = getDirection(trend1);
    const dir2 = getDirection(trend2);
    
    if (dir1 === dir2 && dir1 === 'positive') return 'synchronized_growth';
    if (dir1 === dir2 && dir1 === 'negative') return 'synchronized_decline';
    if (dir1 === 'positive' && dir2 === 'negative') return 'inverse_relationship';
    if (dir1 === 'negative' && dir2 === 'positive') return 'inverse_relationship';
    if (dir1 === 'neutral' || dir2 === 'neutral') return 'partial_dependency';
    
    return 'complex_relationship';
  }
  
  /**
   * Get trait evolution data with projected future values
   */
  async getTraitEvolution(
    profileId: string, 
    options: {
      traitNames?: string[];
      timeframe?: 'short' | 'medium' | 'long';
      confidenceInterval?: number;
    }
  ): Promise<TraitEvolution | TraitEvolution[]> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      return await this.evolutionTracker.getTraitEvolution(profileId, options);
    } catch (error) {
      logger.error('Error getting trait evolution', { error, profileId });
      throw new Error(`Failed to get trait evolution: ${error.message}`);
    }
  }
  
  /**
   * Create a new trait
   */
  async createTrait(trait: {
    profileId: string;
    name: string;
    category: string;
    score: number;
    assessmentMethod: 'self' | 'external' | 'derived';
    assessmentDate: Date;
  }): Promise<Trait> {
    try {
      return await this.dataRepository.createTrait(trait);
    } catch (error) {
      logger.error('Error creating trait', { error, trait });
      throw new Error(`Failed to create trait: ${error.message}`);
    }
  }
  
  async updateTrait(traitId: string, updates: Partial<Trait>): Promise<Trait> {
    try {
      // Validate update request
      if (!traitId) {
        throw new Error('Trait ID is required');
      }
      
      return await this.dataRepository.updateTrait(traitId, updates);
    } catch (error) {
      logger.error('Error updating trait', { error, traitId, updates });
      throw new Error(`Failed to update trait: ${error.message}`);
    }
  }
  
  /**
   * Get personalized trait recommendations
   */
  async getTraitRecommendations(
    profileId: string,
    industry?: string
  ): Promise<{
    recommendations: TraitRecommendation[];
    priorityAreas: string[];
    strengths: string[];
    clusterRecommendations?: Array<{
      name: string;
      traits: string[];
      recommendation: string;
    }>;
    contextualInsights?: string[];
    developmentSuggestions?: string[];
  }> {
    try {
      if (!profileId) {
        throw new Error('Profile ID is required');
      }
      
      // Get profile traits
      const traits = await this.getTraitsForProfile(profileId);
      if (!traits || traits.length === 0) {
        return {
          recommendations: [],
          priorityAreas: [],
          strengths: []
        };
      }
      
      // Get trait relationships
      const relationships = await this.getTraitRelationships(profileId);
      
      // Get profile data for context
      const profileData = await this.dataRepository.getProfileData(profileId);
      
      // Get trait evolution data
      const evolutionData = await this.getTraitEvolution(profileId, {
        timeframe: 'medium'
      });
      
      // Generate evolution insights
      const evolutionInsights = this.generateEvolutionInsights(evolutionData);
      
      // Prepare enhanced traits with related data for richer recommendations
      const enhancedTraits = traits.map(t => {
        // Find relationships for this trait
        const relatedTraits = relationships.relationships
          .filter(r => r.trait1.name === t.name || r.trait2.name === t.name)
          .map(r => r.trait1.name === t.name ? r.trait2 : r.trait1);
        
        return {
          ...t,
          relatedTraits,
          influence: relatedTraits.length // Measure of trait centrality/influence
        };
      });
      
      // Get career alignment score if available
      const careerGoal = profileData?.careerGoal || industry;
      const careerAlignmentScore = careerGoal 
        ? this.calculateCareerAlignmentScore(enhancedTraits, careerGoal)
        : undefined;
      
      // Generate individual recommendations for each trait
      const individualRecommendations = enhancedTraits.map(trait => {
        // Generate action items
        const actionItems = this.generateActionItems(trait.name, profileData);
        
        // Generate development milestones
        const milestones = this.generateDevelopmentMilestones(trait.name);
        
        // Generate recommended paired development
        const synergisticTraits = this.generateSynergisticOpportunities(trait.name, enhancedTraits);
        
        return {
          traitId: trait.id,
          traitName: trait.name,
          score: trait.score,
          category: trait.category,
          priority: this.calculatePriority(trait, careerGoal, profileData),
          actionItems,
          milestones,
          synergisticTraits,
          potential: 100 - trait.score, // Room for growth
          influence: trait.influence || 0
        };
      });
      
      // Sort recommendations by priority (highest first)
      const sortedRecommendations = individualRecommendations.sort((a, b) => {
        return b.priority - a.priority;
      });
      
      // Extract priority areas and strengths
      const priorityAreas = sortedRecommendations
        .filter(r => r.priority > 7 && r.score < 70)
        .map(r => r.traitName);
      
      const strengths = sortedRecommendations
        .filter(r => r.score > 80)
        .map(r => r.traitName);
      
      // Generate cluster recommendations if relationships are available
      let clusterRecommendations;
      if (relationships.clusters.categoryClusters.length > 0) {
        const baseClusterRecommendations = relationships.clusters.categoryClusters
          .filter(cluster => cluster.traits.length > 1); // Only include meaningful clusters
          
        clusterRecommendations = baseClusterRecommendations.map(cluster => ({
          name: cluster.category,
          traits: cluster.traits.map(t => t.name),
          recommendation: this.generateClusterRecommendation(cluster.category, industry)
        }));
      }
      
      // Generate industry-specific context if industry is provided
      const contextualInsights = industry
        ? [this.generateIndustryContext(industry, traits)]
        : undefined;
      
      // Generate development suggestions based on career goals
      const developmentSuggestions = careerGoal
        ? [
            `Focus on developing ${priorityAreas[0]} to enhance your career progression in ${careerGoal}.`,
            `Consider leveraging your strength in ${strengths[0]} while working on complementary traits.`,
            `The data suggests a ${careerAlignmentScore ? Math.round(careerAlignmentScore) + '%' : 'moderate'} alignment between your current traits and a career in ${careerGoal}.`
          ]
        : undefined;
      
      // Return comprehensive recommendations
      return {
        recommendations: sortedRecommendations
          .map(r => ({
            traitName: r.traitName,
            category: r.category,
            score: r.score,
            priority: r.priority,
            actionItems: r.actionItems.slice(0, 3), // Limit to top 3 actions
            milestones: r.milestones.slice(0, 2), // Limit to 2 milestones
            synergisticTraits: r.synergisticTraits.slice(0, 2) // Limit to 2 related traits
          })),
        priorityAreas,
        strengths,
        clusterRecommendations,
        contextualInsights,
        developmentSuggestions
      };
    } catch (error) {
      logger.error('Error generating trait recommendations', { error, profileId });
      throw new Error(`Failed to generate trait recommendations: ${error.message}`);
    }
  }
  
  // Helper method to generate insights from evolution data
  private generateEvolutionInsights(traitEvolution: TraitEvolution | TraitEvolution[]): string[] {
    const insights: string[] = [];
    const evolutions = Array.isArray(traitEvolution) ? traitEvolution : [traitEvolution];
    
    for (const evolution of evolutions) {
      // Skip if no data points
      if (!evolution.dataPoints || evolution.dataPoints.length === 0) continue;
      
      // Get trend information
      const { trend, confidence } = evolution;
      
      // Add insight based on trend
      if (trend === 'improving' && confidence > 0.7) {
        insights.push(`Your ${evolution.name} is steadily improving, showing consistent progress.`);
      } else if (trend === 'declining' && confidence > 0.7) {
        insights.push(`Your ${evolution.name} has been declining, which may require attention.`);
      } else if (trend === 'stable' && confidence > 0.7) {
        insights.push(`Your ${evolution.name} has remained stable over time.`);
      } else if (trend === 'volatile') {
        insights.push(`Your ${evolution.name} shows significant variability, which may indicate inconsistent application.`);
      }
      
      // Add projection insight if available
      if (evolution.projection && evolution.projection.length > 0) {
        const lastCurrent = evolution.dataPoints[evolution.dataPoints.length - 1].score;
        const projectedFuture = evolution.projection[evolution.projection.length - 1].score;
        
        if (projectedFuture > lastCurrent + 10) {
          insights.push(`Based on your trajectory, ${evolution.name} is projected to improve significantly.`);
        } else if (projectedFuture < lastCurrent - 10) {
          insights.push(`Without intervention, ${evolution.name} may decline further based on current trends.`);
        }
      }
    }
    
    return insights;
  }
  
  // Generate action items for specific traits
  private generateActionItems(traitName: string, profileData: any): string[] {
    switch (traitName.toLowerCase()) {
      case 'analytical thinking':
        return [
          "Practice breaking down complex problems into smaller components",
          "Take on projects that require data analysis and pattern recognition",
          "Develop skills in logical frameworks and structured problem-solving methodologies",
          "Join discussion groups that focus on analytical topics"
        ];
        
      case 'leadership':
        return [
          "Seek opportunities to lead small teams or projects",
          "Develop your communication and delegation skills",
          "Mentor junior colleagues to build coaching abilities",
          "Study leadership styles and adapt them to different situations"
        ];
        
      case 'communication':
        return [
          "Practice public speaking through groups like Toastmasters",
          "Focus on active listening in conversations",
          "Ask for feedback on your written communications",
          "Adapt your communication style for different audiences"
        ];
        
      case 'problem solving':
        return [
          "Tackle unfamiliar challenges that require creative solutions",
          "Learn methodologies like Design Thinking or TRIZ",
          "Practice root cause analysis techniques",
          "Collaborate with diverse teams to gain new perspectives"
        ];
        
      case 'innovation':
        return [
          "Allocate time for creative thinking and experimentation",
          "Study innovations in other fields and industries",
          "Challenge assumptions and established processes",
          "Build prototypes to test new concepts quickly"
        ];
        
      default:
        return [
          `Seek feedback on your ${traitName} from colleagues and mentors`,
          `Identify specific aspects of ${traitName} to improve`,
          `Set measurable goals related to ${traitName}`,
          `Practice ${traitName} in low-risk environments first`
        ];
    }
  }
  
  // Generate development milestones for specific traits
  private generateDevelopmentMilestones(traitName: string): Array<{
    level: string;
    description: string;
    criteria: string;
    score: number;
  }> {
    switch (traitName.toLowerCase()) {
      case 'analytical thinking':
        return [
          {
            level: 'Beginner',
            description: 'Basic pattern recognition and logical reasoning',
            criteria: 'Can follow structured analytical processes when guided',
            score: 30
          },
          {
            level: 'Intermediate',
            description: 'Independent analysis of moderately complex problems',
            criteria: 'Regularly identifies patterns and root causes',
            score: 60
          },
          {
            level: 'Advanced',
            description: 'Systematic analysis of complex systems and data',
            criteria: 'Creates analytical frameworks and models for others',
            score: 80
          },
          {
            level: 'Expert',
            description: 'Sophisticated insight generation across domains',
            criteria: 'Synthesizes complex information into actionable insights',
            score: 95
          }
        ];
        
      case 'leadership':
        return [
          {
            level: 'Beginner',
            description: 'Leading by example and taking initiative',
            criteria: 'Successfully completes self-directed projects',
            score: 30
          },
          {
            level: 'Intermediate',
            description: 'Effective management of small teams or projects',
            criteria: 'Team consistently meets objectives under your leadership',
            score: 60
          },
          {
            level: 'Advanced',
            description: 'Strategic leadership across functions or departments',
            criteria: 'Develops other leaders and creates systemic improvements',
            score: 80
          },
          {
            level: 'Expert',
            description: 'Transformational leadership of organizations',
            criteria: 'Creates lasting cultural and strategic change',
            score: 95
          }
        ];
        
      default:
        return [
          {
            level: 'Beginner',
            description: `Basic ${traitName} capabilities`,
            criteria: `Shows fundamental understanding of ${traitName}`,
            score: 30
          },
          {
            level: 'Intermediate',
            description: `Consistent application of ${traitName}`,
            criteria: `Regularly demonstrates effective ${traitName}`,
            score: 60
          },
          {
            level: 'Advanced',
            description: `Sophisticated ${traitName} across contexts`,
            criteria: `Can teach and model excellent ${traitName} for others`,
            score: 80
          },
          {
            level: 'Expert',
            description: `Exemplary ${traitName} recognized by peers`,
            criteria: `Sets standards and innovations in ${traitName}`,
            score: 95
          }
        ];
    }
  }
  
  // Generate synergistic opportunities (complementary traits)
  private generateSynergisticOpportunities(
    traitName: string,
    allTraits: Array<any>
  ): Array<{ trait: string; reason: string }> {
    const complementaryPairs: Record<string, Array<{ trait: string; reason: string }>> = {
      'analytical thinking': [
        { trait: 'creativity', reason: 'Combines logical analysis with innovative thinking' },
        { trait: 'communication', reason: 'Helps communicate complex analysis effectively' }
      ],
      'leadership': [
        { trait: 'empathy', reason: 'Creates more effective and supportive leadership' },
        { trait: 'strategic thinking', reason: 'Enhances long-term vision and direction' }
      ],
      'communication': [
        { trait: 'emotional intelligence', reason: 'Improves audience understanding and connection' },
        { trait: 'active listening', reason: 'Creates two-way information flow' }
      ],
      'problem solving': [
        { trait: 'resilience', reason: 'Helps persist through complex challenges' },
        { trait: 'creativity', reason: 'Enables innovative solutions to difficult problems' }
      ]
    };
    
    const lowercaseName = traitName.toLowerCase();
    const existingTraits = new Set(allTraits.map(t => t.name.toLowerCase()));
    
    // Return predefined complementary traits if available
    if (complementaryPairs[lowercaseName]) {
      // Filter out traits the person already has
      return complementaryPairs[lowercaseName].filter(pair => !existingTraits.has(pair.trait));
    }
    
    // Generic synergistic opportunities
    return [
      { trait: 'communication', reason: `Enhances expression of ${traitName}` },
      { trait: 'analytical thinking', reason: `Adds depth to ${traitName}` },
      { trait: 'adaptability', reason: `Makes ${traitName} more effective in changing situations` }
    ].filter(pair => !existingTraits.has(pair.trait));
  }
  
  private generateIndustryContext(industry: string, traits: any[]): string {
    switch (industry.toLowerCase()) {
      case 'technology':
        return 'The technology industry values continuous learning, innovation, and problem-solving abilities. Focus on developing technical depth while maintaining adaptability as technologies evolve.';
        
      case 'healthcare':
        return 'The healthcare field requires a combination of empathy, precision, and ethical decision-making. Emphasize communication skills and the ability to work in multidisciplinary teams.';
        
      case 'finance':
        return 'Financial sectors prioritize analytical thinking, attention to detail, and risk assessment. Developing strong numerical reasoning alongside ethical judgment is particularly valuable.';
        
      default:
        return `${industry} typically values a combination of technical expertise and interpersonal skills. Focus on developing your strongest traits while addressing areas needed for your specific role.`;
    }
  }
  
  private calculateNumericCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length < 2) {
      return 0;
    }
    
    const n = values1.length;
    
    // Calculate means
    const mean1 = values1.reduce((sum, val) => sum + val, 0) / n;
    const mean2 = values2.reduce((sum, val) => sum + val, 0) / n;
    
    // Calculate covariance and standard deviations
    let covariance = 0;
    let stdDev1 = 0;
    let stdDev2 = 0;
    
    for (let i = 0; i < n; i++) {
      const diff1 = values1[i] - mean1;
      const diff2 = values2[i] - mean2;
      covariance += diff1 * diff2;
      stdDev1 += diff1 * diff1;
      stdDev2 += diff2 * diff2;
    }
    
    // Avoid division by zero
    if (stdDev1 === 0 || stdDev2 === 0) {
      return 0;
    }
    
    // Normalize by (n-1) for sample correlation
    covariance /= (n - 1);
    stdDev1 = Math.sqrt(stdDev1 / (n - 1));
    stdDev2 = Math.sqrt(stdDev2 / (n - 1));
    
    // Pearson correlation coefficient
    return covariance / (stdDev1 * stdDev2);
  }
  
  private calculateCareerAlignmentScore(traits: any[], careerGoal?: string): number {
    if (!careerGoal) return 50; // Neutral score if no goal
    
    // Define trait weights for different career paths (0-10 scale)
    let weights: Record<string, number> = {};
    
    switch (careerGoal.toLowerCase()) {
      case 'leadership':
        weights = {
          'leadership': 10,
          'communication': 9,
          'strategic thinking': 8,
          'emotional intelligence': 8,
          'decision making': 7,
          'problem solving': 7,
          'adaptability': 6,
          'innovation': 6,
          'negotiation': 5,
          'analytical thinking': 5
        };
        break;
        
      case 'engineering':
        weights = {
          'analytical thinking': 10,
          'problem solving': 9,
          'attention to detail': 8,
          'technical expertise': 8,
          'innovation': 7,
          'adaptability': 6,
          'communication': 5,
          'teamwork': 5,
          'perseverance': 5,
          'creativity': 4
        };
        break;
        
      default:
        // Generic weights for most careers
        weights = {
          'communication': 8,
          'problem solving': 7,
          'adaptability': 7,
          'teamwork': 6,
          'analytical thinking': 6,
          'leadership': 5,
          'emotional intelligence': 5
        };
    }
    
    // Calculate weighted score based on trait relevance
    let totalScore = 0;
    let totalWeight = 0;
    
    Object.entries(weights).forEach(([trait, weight]) => {
      const matchingTrait = traits.find(t => t.name.toLowerCase() === trait.toLowerCase());
      if (matchingTrait) {
        totalScore += (matchingTrait.score * weight);
        totalWeight += weight;
      }
    });
    
    // Calculate final alignment percentage
    return totalWeight > 0 ? (totalScore / totalWeight) : 50;
  }
  
  /**
   * Calculate analytical thinking score based on profile data
   */
  async calculateAnalyticalThinkingScore(profileId: string): Promise<number> {
    try {
      // Get profile data
      const profileData = await this.dataRepository.getProfileData(profileId);
      
      if (!profileData) {
        throw new Error(`Profile data not found for ${profileId}`);
      }
      
      const { skills = [], experiences = [], projects = [], education = [] } = profileData;
      
      // Base score (everyone starts at 20)
      let score = 20;
      
      // Skills component (max 20 points)
      const analyticalKeywords = [
        'analysis', 'analytical', 'problem solving', 'data', 'research',
        'statistics', 'quantitative', 'algorithm', 'logical', 'critical thinking',
        'mathematics', 'modeling', 'data mining', 'business intelligence'
      ];
      
      // Check skills for analytical keywords
      const analyticalSkills = skills.filter((skill: any) => 
        analyticalKeywords.some(keyword => 
          skill.name.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      // Award points based on the number of analytical skills
      score += Math.min(analyticalSkills.length * 4, 20);
      
      // Experience component (max 25 points)
      let experiencePoints = 0;
      
      experiences.forEach((exp: any) => {
        // Check for analytical role keywords
        const hasAnalyticalRole = [
          'analyst', 'researcher', 'scientist', 'engineer', 'data',
          'intelligence', 'quantitative', 'statistical'
        ].some(keyword => (exp.title || '').toLowerCase().includes(keyword.toLowerCase()));
        
        // Check for analytical responsibilities
        const hasAnalyticalWork = [
          'analysis', 'analyzed', 'research', 'data', 'solving', 'developed algorithm',
          'quantitative', 'metrics', 'insights', 'statistical', 'evaluation',
          'assessment', 'diagnostic', 'modeling'
        ].some(keyword => (exp.description || '').toLowerCase().includes(keyword.toLowerCase()));
        
        // Award points based on analytical roles and work
        if (hasAnalyticalRole) experiencePoints += 5;
        if (hasAnalyticalWork) experiencePoints += 5;
      });
      
      // Cap experience points at 25
      score += Math.min(experiencePoints, 25);
      
      // Projects component (max 20 points)
      const analyticalProjects = projects.filter((project: any) => 
        [
          'analysis', 'research', 'data', 'algorithm', 'model',
          'problem solving', 'optimization', 'statistical', 'prediction',
          'diagnostic', 'insights', 'metrics'
        ].some(keyword => 
          (project.name || '').toLowerCase().includes(keyword.toLowerCase()) ||
          (project.description || '').toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      // Award points based on number of analytical projects
      score += Math.min(analyticalProjects.length * 7, 20);
      
      // Education component (max 15 points)
      const analyticalEducation = education.filter((edu: any) => {
        const field = edu.fieldOfStudy || edu.major || '';
        return [
          'mathematics', 'statistics', 'physics', 'engineering', 'computer science',
          'economics', 'analytics', 'data science', 'quantitative', 'operations research'
        ].some(keyword => field.toLowerCase().includes(keyword.toLowerCase()));
      });
      
      const educationPoints = analyticalEducation.reduce((points: number, edu: any) => {
        // Award points based on degree level
        const level = (edu.degree || '').toLowerCase();
        if (level.includes('doctorate') || level.includes('phd')) {
          return points + 15;
        } else if (level.includes('master')) {
          return points + 10;
        } else if (level.includes('bachelor')) {
          return points + 5;
        }
        return points + 3; // Other education
      }, 0);
      
      // Cap education points at 15
      score += Math.min(educationPoints, 15);
      
      // Cap total score at 100
      return Math.min(Math.max(score, 0), 100);
    } catch (error) {
      logger.error('Error calculating analytical thinking score', { error, profileId });
      throw new Error(`Failed to calculate analytical thinking score: ${error.message}`);
    }
  }
  
  /**
   * Calculate leadership score based on profile data
   */
  async calculateLeadershipScore(profileId: string): Promise<number> {
    try {
      // Get profile data
      const profileData = await this.dataRepository.getProfileData(profileId);
      
      if (!profileData) {
        throw new Error(`Profile data not found for ${profileId}`);
      }
      
      const { skills = [], experiences = [], projects = [], education = [] } = profileData;
      
      // Base score (everyone starts at 20)
      let score = 20;
      
      // Experience component (max 40 points)
      let leadershipExperiencePoints = 0;
      let leadershipDuration = 0; // in months
      let seniorityScore = 0;
      
      experiences.forEach((exp: any) => {
        // Check for leadership role titles
        const leadershipLevel = (() => {
          const title = (exp.title || '').toLowerCase();
          if (title.includes('chief') || title.includes('ceo') || title.includes('cto') || title.includes('coo') || title.includes('president')) {
            return 4; // Executive level
          } else if (title.includes('director') || title.includes('head of') || title.includes('vp') || title.includes('vice president')) {
            return 3; // Director level
          } else if (title.includes('manager') || title.includes('lead') || title.includes('principal')) {
            return 2; // Manager level
          } else if (title.includes('supervisor') || title.includes('senior') || title.includes('team lead')) {
            return 1; // Supervisor level
          }
          return 0; // Individual contributor
        })();
        
        // Check for leadership keywords in description
        const leadershipKeywords = [
          'led team', 'managed team', 'directed team', 'leadership', 'supervised',
          'mentored', 'team of', 'direct reports', 'built team', 'grew team',
          'strategic direction', 'vision', 'executive'
        ];
        
        const hasLeadershipResponsibilities = leadershipKeywords.some(keyword => 
          (exp.description || '').toLowerCase().includes(keyword.toLowerCase())
        );
        
        // Calculate duration (default to 12 months if not specified)
        const duration = exp.durationMonths || 12;
        
        // Award points based on leadership level and duration
        if (leadershipLevel > 0 || hasLeadershipResponsibilities) {
          // Points for leadership role
          leadershipExperiencePoints += leadershipLevel * 5;
          
          // Points for leadership responsibilities
          if (hasLeadershipResponsibilities) {
            leadershipExperiencePoints += 5;
          }
          
          // Track duration in leadership roles
          leadershipDuration += duration;
          
          // Track seniority score (weights recent experience more)
          seniorityScore += leadershipLevel * (exp.isCurrent ? 2 : 1);
        }
      });
      
      // Award points for total leadership duration (max 15 points)
      const durationPoints = Math.min(Math.floor(leadershipDuration / 12) * 3, 15);
      
      // Award points for seniority (max 10 points)
      const seniorityPoints = Math.min(seniorityScore * 2, 10);
      
      // Total experience points (cap at 40)
      const totalExperiencePoints = Math.min(leadershipExperiencePoints + durationPoints + seniorityPoints, 40);
      score += totalExperiencePoints;
      
      // Skills component (max 20 points)
      const leadershipKeywords = [
        'leadership', 'management', 'team building', 'mentoring', 'coaching',
        'strategic', 'vision', 'delegation', 'decision making', 'influence',
        'negotiation', 'conflict resolution', 'change management', 'executive'
      ];
      
      // Check skills for leadership keywords
      const leadershipSkills = skills.filter((skill: any) => 
        leadershipKeywords.some(keyword => 
          skill.name.toLowerCase().includes(keyword.toLowerCase())
        )
      );
      
      // Award points based on the number of leadership skills
      score += Math.min(leadershipSkills.length * 4, 20);
      
      // Projects component (max 15 points)
      const leadershipProjects = projects.filter((project: any) => {
        const description = (project.description || '').toLowerCase();
        return [
          'led team', 'leadership role', 'managed team', 'directed',
          'spearheaded', 'initiated', 'founded', 'established'
        ].some(keyword => description.includes(keyword.toLowerCase()));
      });
      
      // Award points based on number of leadership projects
      score += Math.min(leadershipProjects.length * 5, 15);
      
      // Education component (max 10 points)
      const leadershipEducation = education.filter((edu: any) => {
        const field = (edu.fieldOfStudy || edu.major || '').toLowerCase();
        const degree = (edu.degree || '').toLowerCase();
        
        return field.includes('business') || 
               field.includes('management') || 
               field.includes('leadership') ||
               field.includes('mba') ||
               degree.includes('mba') ||
               degree.includes('business admin');
      });
      
      // Award points for leadership education
      score += Math.min(leadershipEducation.length * 5, 10);
      
      // Cap total score at 100
      return Math.min(Math.max(score, 0), 100);
    } catch (error) {
      logger.error('Error calculating leadership score', { error, profileId });
      throw new Error(`Failed to calculate leadership score: ${error.message}`);
    }
  }
  
  // Update derived traits
  private async updateDerivedTraits(profileId: string): Promise<void> {
    try {
      // Get current derived traits
      const existingTraits = await this.dataRepository.getTraitsForProfile(profileId);
      
      // Create a map for easier lookup
      const traitMap = existingTraits.reduce((map: Map<string, Trait>, trait) => {
        if (trait.assessmentMethod === 'derived') {
          map.set(trait.name.toLowerCase(), trait);
        }
        return map;
      }, new Map());
      
      // Analytical thinking assessment
      await this.calculateAnalyticalThinkingScore(profileId).then(async score => {
        const existing = traitMap.get('analytical thinking');
        if (existing) {
          await this.updateTrait(existing.id, { score });
        } else {
          await this.createTrait({
            profileId,
            name: 'Analytical Thinking',
            category: 'cognitive',
            score,
            assessmentMethod: 'derived',
            assessmentDate: new Date()
          });
        }
      }).catch(e => logger.warn(`Error updating analytical thinking: ${e.message}`));
      
      // Leadership assessment
      await this.calculateLeadershipScore(profileId).then(async score => {
        const existing = traitMap.get('leadership');
        if (existing) {
          await this.updateTrait(existing.id, { score });
        } else {
          await this.createTrait({
            profileId,
            name: 'Leadership',
            category: 'professional',
            score,
            assessmentMethod: 'derived',
            assessmentDate: new Date()
          });
        }
      }).catch(e => logger.warn(`Error updating leadership: ${e.message}`));
      
      // Future: Add additional derived traits as needed
    } catch (error) {
      logger.error('Error updating derived traits', { error, profileId });
      throw new Error(`Failed to update derived traits: ${error.message}`);
    }
  }
  
  /**
   * Calculate priority score for trait recommendations
   */
  private calculatePriority(
    trait: any,
    careerGoal?: string,
    profileData?: any
  ): number {
    // Start with base priority
    let priority = 5;
    
    // Higher priority for lower scores (more room for improvement)
    if (trait.score < 40) priority += 3;
    else if (trait.score < 60) priority += 2;
    else if (trait.score < 80) priority += 1;
    
    // Adjust priority based on trait influence (centrality in relationships)
    if (trait.influence > 5) priority += 2;
    else if (trait.influence > 2) priority += 1;
    
    // If we have a career goal, adjust based on relevant traits
    if (careerGoal) {
      const relevantTraits = this.analyzePotentialTraitChanges(trait.name, careerGoal, profileData);
      priority += relevantTraits.relevanceScore;
    }
    
    // Cap priority at 10
    return Math.min(priority, 10);
  }
  
  private analyzePotentialTraitChanges(
    traitName: string,
    careerGoal: string,
    profileData: any
  ): { relevanceScore: number; insights: string[] } {
    const insights: string[] = [];
    let relevanceScore = 0;
    
    if (!profileData) {
      return { relevanceScore: 0, insights: [] };
    }
    
    // Leadership-specific analysis
    if (traitName.toLowerCase() === 'leadership' && careerGoal.toLowerCase().includes('leadership')) {
      try {
        // Check for recent leadership education
        const recentEducation = (profileData.education || []).filter((edu: any) => {
          const endDate = edu.endDate ? new Date(edu.endDate) : new Date();
          return (new Date().getTime() - endDate.getTime()) < 3 * 365 * 24 * 60 * 60 * 1000; // 3 years
        });
        
        if (recentEducation.some((edu: any) =>
          (edu.fieldOfStudy || '').toLowerCase().includes('business') ||
          (edu.fieldOfStudy || '').toLowerCase().includes('management')
        )) {
          insights.push('Recent business education could accelerate leadership development');
          relevanceScore += 1;
        }
        
        // Check for recent management courses
        if (recentEducation.some((edu: any) =>
          (edu.courseTitle || '').toLowerCase().includes('leadership') ||
          (edu.courseTitle || '').toLowerCase().includes('management')
        )) {
          insights.push('Recent leadership courses show commitment to improvement');
          relevanceScore += 1;
        }
        
        // Check for recent leadership experience
        const recentExperienceWithLeadership = (profileData.experiences || []).some((exp: any) => {
          const isRecent = exp.isCurrent || (exp.endDate && (new Date().getTime() - new Date(exp.endDate).getTime()) < 2 * 365 * 24 * 60 * 60 * 1000); // 2 years
          
          const hasLeadershipTitle = (exp.title || '').toLowerCase().includes('lead') ||
                                  (exp.title || '').toLowerCase().includes('manager') ||
                                  (exp.title || '').toLowerCase().includes('director');
                                  
          const hasLeadershipResponsibility = (exp.description || '').toLowerCase().includes('team') ||
                                           (exp.description || '').toLowerCase().includes('managed') ||
                                           (exp.description || '').toLowerCase().includes('led');
                                           
          return isRecent && (hasLeadershipTitle || hasLeadershipResponsibility);
        });
        
        if (recentExperienceWithLeadership) {
          insights.push('Recent leadership experience provides a foundation for growth');
          relevanceScore += 2;
        }
        
        if (careerGoal.toLowerCase() === 'leadership' || careerGoal.toLowerCase() === 'management') {
          relevanceScore += 3; // Direct alignment with career goal
        }
      } catch (error) {
        logger.warn(`Error in leadership trait analysis: ${error.message}`);
      }
    }
    
    // Add more trait-specific analyses as needed
    
    return { relevanceScore, insights };
  }
  
  /**
   * Generate trait recommendations for specific clusters
   */
  private generateClusterRecommendation(clusterCategory: string, industry?: string): string {
    // Industry-specific cluster recommendations
    if (industry) {
      if (industry.toLowerCase() === 'technology' && clusterCategory.toLowerCase() === 'technical') {
        return 'Focus on developing your technical trait cluster through continuous learning and practical application. Consider specialized certification in your strongest technical area.';
      }
      
      if (industry.toLowerCase() === 'healthcare' && clusterCategory.toLowerCase() === 'interpersonal') {
        return 'Your interpersonal traits are particularly important in healthcare settings. Consider enhancing these skills through patient-centered communication training.';
      }
    }
    
    // Generic recommendations by cluster category
    switch (clusterCategory.toLowerCase()) {
      case 'cognitive':
        return 'Developing your cognitive trait cluster will enhance your problem-solving abilities. Consider challenging yourself with complex analytical projects.';
        
      case 'interpersonal':
        return 'Your interpersonal traits form a foundation for effective collaboration. Look for opportunities to lead diverse teams or facilitate group discussions.';
        
      case 'technical':
        return 'Your technical trait cluster shows potential for specialization. Consider deepening your expertise while also developing adjacent complementary skills.';
        
      case 'professional':
        return 'Your professional traits indicate career readiness. Focus on applying these traits in increasingly complex situations to build mastery.';
        
      default:
        return `Developing your ${clusterCategory} traits as a cluster will create synergistic effects. Focus on balanced growth across these related traits.`;
    }
  }
  
  /**
   * Robust correlation calculation with outlier handling
   */
  private calculateRobustCorrelation(values1: number[], values2: number[]): number {
    if (values1.length !== values2.length || values1.length < 5) {
      // Fall back to regular correlation for small samples
      return this.calculateNumericCorrelation(values1, values2);
    }
    
    try {
      // Remove outliers using IQR method
      const removeOutliers = (values: number[]): number[] => {
        // Calculate quartiles
        const sorted = [...values].sort((a, b) => a - b);
        const q1Index = Math.floor(sorted.length * 0.25);
        const q3Index = Math.floor(sorted.length * 0.75);
        
        const q1 = sorted[q1Index];
        const q3 = sorted[q3Index];
        const iqr = q3 - q1;
        
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        // Filter out outliers
        return values.filter(v => v >= lowerBound && v <= upperBound);
      };
      
      // Get outlier-free values
      const cleanValues1 = removeOutliers(values1);
      const cleanValues2 = removeOutliers(values2);
      
      // Need to realign the arrays after outlier removal
      const validIndices = values1.map((_, i) => 
        cleanValues1.includes(values1[i]) && cleanValues2.includes(values2[i]) ? i : -1
      ).filter(i => i !== -1);
      
      const alignedValues1 = validIndices.map(i => values1[i]);
      const alignedValues2 = validIndices.map(i => values2[i]);
      
      if (alignedValues1.length < 5) {
        // Not enough data after outlier removal
        return this.calculateNumericCorrelation(values1, values2);
      }
      
      // Use Spearman's rank correlation for robustness (less sensitive to non-linearity)
      // 1. Convert values to ranks
      const rank = (values: number[]): number[] => {
        const sorted = [...values].map((v, i) => ({ value: v, index: i }))
                                 .sort((a, b) => a.value - b.value);
        
        const ranks = new Array(values.length).fill(0);
        
        for (let i = 0; i < sorted.length; i++) {
          ranks[sorted[i].index] = i + 1;
        }
        
        return ranks;
      };
      
      const ranks1 = rank(alignedValues1);
      const ranks2 = rank(alignedValues2);
      
      // 2. Calculate regular Pearson correlation on the ranks
      return this.calculateNumericCorrelation(ranks1, ranks2);
    } catch (error) {
      // Fallback to standard correlation if anything goes wrong
      logger.warn('Error in robust correlation calculation', { error });
      return this.calculateNumericCorrelation(values1, values2);
    }
  }
}