import logger from '../../logger';
import { AppError } from '../../error.middleware';
import { TraitEvolution } from '../models/trait.model';

// Define a simpler version of TraitDataPoint with Date type only to avoid TypeScript issues
interface TraitDataPoint {
  date: Date;
  score: number;
  assessmentMethod: string;
}
import { TraitDataRepository } from './trait-data.repository';

/**
 * Service for tracking and analyzing trait evolution over time
 * Implements sophisticated tracking of trait growth patterns and indicators
 */
export class TraitEvolutionTracker {
  private repository: TraitDataRepository;

  constructor(repository: TraitDataRepository) {
    this.repository = repository;
  }

  /**
   * Analyze evolution of a specific trait over time
   * Uses advanced statistical methods to identify growth patterns
   */
  async analyzeTraitEvolution(profileId: string, traitName: string): Promise<TraitEvolution | null> {
    try {
      const historyData = await this.repository.getTraitHistory(profileId, traitName);
      
      if (!historyData || historyData.length === 0) {
        logger.info('No history data for trait evolution analysis', { profileId, traitName });
        return null;
      }

      // Get the trait category from the most recent assessment
      const latestEntry = historyData.sort((a, b) => 
        new Date(b.assessment_date).getTime() - new Date(a.assessment_date).getTime()
      )[0];
      
      const category = latestEntry.category;
      
      // Transform the data into TraitDataPoint format (using our local interface with Date type only)
      const dataPoints: TraitDataPoint[] = historyData.map(history => ({
        date: new Date(history.assessment_date),
        score: history.score,
        assessmentMethod: history.assessment_method
      }));
      
      // Sort data points by date (oldest first)
      dataPoints.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      // Calculate growth rate and other metrics
      const growthMetrics = this.calculateGrowthMetrics(dataPoints);
      const trend = this.analyzeTrend(dataPoints, growthMetrics);
      
      return {
        name: traitName,
        category,
        dataPoints,
        growthRate: growthMetrics,
        trend
      };
    } catch (error) {
      logger.error('Error analyzing trait evolution', { error, profileId, traitName });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to analyze trait evolution: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get evolution data for all traits of a profile
   */
  async getTraitEvolutionData(profileId: string): Promise<TraitEvolution[]> {
    try {
      // Fetch all the profile's trait history
      const allHistoryData = await this.repository.getTraitHistory(profileId);
      
      if (!allHistoryData || allHistoryData.length === 0) {
        logger.info('No history data for trait evolution analysis', { profileId });
        return [];
      }
      
      // Group history data by trait name
      const traitGroups: Record<string, any[]> = {};
      for (const historyItem of allHistoryData) {
        const traitName = historyItem.name;
        if (!traitGroups[traitName]) {
          traitGroups[traitName] = [];
        }
        traitGroups[traitName].push(historyItem);
      }
      
      // Analyze evolution for each trait
      const evolutionData: TraitEvolution[] = [];
      
      for (const traitName of Object.keys(traitGroups)) {
        // Check if we have at least 2 data points for this trait
        if (traitGroups[traitName].length < 2) {
          continue; // Skip traits with insufficient data for evolution analysis
        }
        
        const traitEvolution = await this.analyzeTraitEvolution(profileId, traitName);
        if (traitEvolution) {
          evolutionData.push(traitEvolution);
        }
      }
      
      return evolutionData;
    } catch (error) {
      logger.error('Error getting trait evolution data', { error, profileId });
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get trait evolution data: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Calculate growth metrics for a set of trait data points
   * Implements advanced statistical analysis to identify patterns
   */
  private calculateGrowthMetrics(dataPoints: TraitDataPoint[]): {
    monthlyGrowthRate: number;
    rSquared: number;
    velocityChanges: Array<{date: string, acceleration: number}>;
    confidence: 'high' | 'medium' | 'low';
    trend: 'linear' | 'exponential' | 'plateauing' | 'fluctuating';
  } {
    try {
      if (dataPoints.length < 2) {
        return {
          monthlyGrowthRate: 0,
          rSquared: 0,
          velocityChanges: [],
          confidence: 'low',
          trend: 'linear'
        };
      }
      
      // Extract time points (in months since first assessment) and scores
      const firstDate = dataPoints[0].date.getTime();
      
      const timePoints = dataPoints.map(p => {
        return (p.date.getTime() - firstDate) / (1000 * 60 * 60 * 24 * 30); // Convert to months
      });
      
      const scores = dataPoints.map(p => p.score);
      
      // Linear regression for growth rate
      const n = timePoints.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
      
      for (let i = 0; i < n; i++) {
        sumX += timePoints[i];
        sumY += scores[i];
        sumXY += timePoints[i] * scores[i];
        sumX2 += timePoints[i] * timePoints[i];
        sumY2 += scores[i] * scores[i];
      }
      
      // Calculate slope (monthly growth rate)
      const denominator = n * sumX2 - sumX * sumX;
      let monthlyGrowthRate = 0;
      
      if (denominator !== 0) {
        monthlyGrowthRate = (n * sumXY - sumX * sumY) / denominator;
      }
      
      // Calculate R-squared to measure how well the linear model fits the data
      let rSquared = 0;
      
      const sMean = sumY / n;
      let sTot = 0, sRes = 0;
      
      for (let i = 0; i < n; i++) {
        // Predicted value
        const yPred = (monthlyGrowthRate * timePoints[i]) + ((sumY - monthlyGrowthRate * sumX) / n);
        // Sum of squared residuals
        sRes += Math.pow(scores[i] - yPred, 2);
        // Total sum of squares
        sTot += Math.pow(scores[i] - sMean, 2);
      }
      
      if (sTot !== 0) {
        rSquared = 1 - (sRes / sTot);
      }
      
      // Identify velocity changes (accelerations/decelerations)
      const velocityChanges: Array<{date: string, acceleration: number}> = [];
      
      // Need at least 3 points to detect velocity changes
      if (dataPoints.length >= 3) {
        const velocities: number[] = [];
        
        // Calculate velocities between consecutive points
        for (let i = 0; i < dataPoints.length - 1; i++) {
          // Ensure we're working with Date objects
          const dateObj1 = new Date(dataPoints[i].date instanceof Date ?
            dataPoints[i].date.getTime() : new Date(String(dataPoints[i].date)).getTime());
          const dateObj2 = new Date(dataPoints[i + 1].date instanceof Date ?
            dataPoints[i + 1].date.getTime() : new Date(String(dataPoints[i + 1].date)).getTime());
          
          const timeDiff = (dateObj2.getTime() - dateObj1.getTime()) / (1000 * 60 * 60 * 24 * 30); // Months
          
          if (timeDiff > 0) {
            const scoreDiff = dataPoints[i + 1].score - dataPoints[i].score;
            velocities.push(scoreDiff / timeDiff); // Score points per month
          } else {
            velocities.push(0); // No time passed between assessments
          }
        }
        
        // Calculate accelerations
        for (let i = 0; i < velocities.length - 1; i++) {
          const acceleration = velocities[i + 1] - velocities[i];
          
          // Only record significant changes in velocity
          if (Math.abs(acceleration) >= 2) {
            velocityChanges.push({
              date: dataPoints[i + 1].date.toISOString().split('T')[0],
              acceleration
            });
          }
        }
      }
      
      // Determine confidence level based on number of data points and R-squared
      let confidence: 'high' | 'medium' | 'low';
      
      if (dataPoints.length >= 5 && rSquared >= 0.7) {
        confidence = 'high';
      } else if (dataPoints.length >= 3 && rSquared >= 0.5) {
        confidence = 'medium';
      } else {
        confidence = 'low';
      }
      
      // Determine growth pattern
      let trend: 'linear' | 'exponential' | 'plateauing' | 'fluctuating';
      
      // Check if pattern is fluctuating (high variability)
      if (this.calculateVariabilityIndex(scores) > 0.4) {
        trend = 'fluctuating';
      } 
      // Check if pattern is plateauing (recent growth slowing down)
      else if (dataPoints.length >= 4 && this.detectPlateauing(dataPoints)) {
        trend = 'plateauing';
      }
      // Check if pattern is exponential (accelerating growth)
      else if (velocityChanges.filter(vc => vc.acceleration > 0).length > velocityChanges.filter(vc => vc.acceleration < 0).length) {
        trend = 'exponential';
      }
      // Default to linear
      else {
        trend = 'linear';
      }
      
      return {
        monthlyGrowthRate,
        rSquared,
        velocityChanges,
        confidence,
        trend
      };
    } catch (error) {
      logger.error('Error calculating growth metrics', { error });
      return {
        monthlyGrowthRate: 0,
        rSquared: 0,
        velocityChanges: [],
        confidence: 'low',
        trend: 'linear'
      };
    }
  }

  /**
   * Calculate variability index of scores
   */
  private calculateVariabilityIndex(scores: number[]): number {
    if (scores.length < 2) return 0;
    
    // Calculate mean
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    // Calculate variance
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    // Calculate standard deviation
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation (normalized by score range)
    return stdDev / (Math.max(...scores) - Math.min(...scores) || 100);
  }

  /**
   * Check if growth pattern is plateauing
   */
  private detectPlateauing(dataPoints: TraitDataPoint[]): boolean {
    if (dataPoints.length < 4) return false;
    
    // Calculate growth rates for first half and second half
    const midpoint = Math.floor(dataPoints.length / 2);
    
    const firstHalf = dataPoints.slice(0, midpoint);
    const secondHalf = dataPoints.slice(midpoint);
    
    const firstHalfGrowth = this.calculateSimpleGrowthRate(firstHalf);
    const secondHalfGrowth = this.calculateSimpleGrowthRate(secondHalf);
    
    // Plateauing means growth in second half is significantly slower
    return secondHalfGrowth < firstHalfGrowth * 0.7;
  }

  /**
   * Calculate a simple growth rate for a set of data points
   */
  private calculateSimpleGrowthRate(dataPoints: TraitDataPoint[]): number {
    if (dataPoints.length < 2) return 0;
    
    const firstScore = dataPoints[0].score;
    const lastScore = dataPoints[dataPoints.length - 1].score;
    
    const scoreDiff = lastScore - firstScore;
    
    // Ensure we're working with Date objects
    const lastDateObj = new Date(dataPoints[dataPoints.length - 1].date instanceof Date ?
      dataPoints[dataPoints.length - 1].date.getTime() : new Date(String(dataPoints[dataPoints.length - 1].date)).getTime());
    const firstDateObj = new Date(dataPoints[0].date instanceof Date ?
      dataPoints[0].date.getTime() : new Date(String(dataPoints[0].date)).getTime());
    
    const totalMonths = (lastDateObj.getTime() - firstDateObj.getTime()) / (1000 * 60 * 60 * 24 * 30);
    
    return totalMonths > 0 ? scoreDiff / totalMonths : 0;
  }

  /**
   * Analyze the trend of trait evolution
   * Provides detailed insights into growth patterns and velocity changes
   */
  private analyzeTrend(dataPoints: TraitDataPoint[], growthMetrics: any): {
    status: string;
    description: string;
    confidence: 'high' | 'medium' | 'low';
    pattern?: string;
    velocityChanges?: number;
  } {
    try {
      if (dataPoints.length < 2) {
        return {
          status: 'insufficient-data',
          description: 'Not enough data points to determine a trend',
          confidence: 'low'
        };
      }

      // Generate status based on growth rate
      let status = 'stable';
      if (growthMetrics.monthlyGrowthRate > 0.5) status = 'rapid-growth';
      else if (growthMetrics.monthlyGrowthRate > 0.2) status = 'growth';
      else if (growthMetrics.monthlyGrowthRate < -0.5) status = 'rapid-decline';
      else if (growthMetrics.monthlyGrowthRate < -0.2) status = 'decline';
      
      // Generate trend description
      let description = '';
      
      // If we have enough data points for a meaningful trend
      if (dataPoints.length >= 3) {
        if (growthMetrics.trend === 'linear') {
          if (growthMetrics.monthlyGrowthRate > 0) {
            description = 'Showing consistent improvement over time';
          } else if (growthMetrics.monthlyGrowthRate < 0) {
            description = 'Showing consistent decline over time';
          } else {
            description = 'Maintaining a stable level over time';
          }
        } else if (growthMetrics.trend === 'exponential') {
          description = 'Showing accelerating improvement with increasing growth rate';
        } else if (growthMetrics.trend === 'plateauing') {
          description = 'Initial growth is slowing down and reaching a stable level';
        } else if (growthMetrics.trend === 'fluctuating') {
          description = 'Showing inconsistent changes with significant fluctuations';
        }
        
        // Add confidence qualifier if not high
        if (growthMetrics.confidence !== 'high') {
          description += ` (${growthMetrics.confidence} confidence due to limited data)`;
        }
      } else {
        description = 'Limited data points available for trend analysis';
      }
      
      // Add information about velocity changes
      const velocityChanges = growthMetrics.velocityChanges?.length || 0;
      let pattern;
      
      if (velocityChanges > 0) {
        const positiveAccelerations = growthMetrics.velocityChanges?.filter((vc: any) => vc.acceleration > 0).length || 0;
        const negativeAccelerations = growthMetrics.velocityChanges?.filter((vc: any) => vc.acceleration < 0).length || 0;
        
        if (positiveAccelerations > negativeAccelerations) {
          pattern = 'Generally accelerating growth with occasional slowdowns';
        } else if (negativeAccelerations > positiveAccelerations) {
          pattern = 'Slowing growth trend with occasional improvements';
        } else {
          pattern = 'Mixed growth pattern with equivalent accelerations and slowdowns';
        }
      } else {
        pattern = 'Consistent growth pattern without significant velocity changes';
      }

      return {
        status,
        description,
        confidence: growthMetrics.confidence,
        pattern,
        velocityChanges
      };
    } catch (error) {
      logger.error('Error analyzing trait trend', { error });
      return {
        status: 'error',
        description: 'Error analyzing trend data',
        confidence: 'low'
      };
    }
  }
}