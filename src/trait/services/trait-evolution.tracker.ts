import logger from '../../utils/logger';
import { Trait, TraitMilestone } from '../models/trait.model';
import { TraitDataRepository } from './trait-data.repository';

/**
 * TraitEvolutionTracker
 * Tracks and analyzes the evolution of traits over time
 */
export class TraitEvolutionTracker {
  constructor(
    private dataRepository: TraitDataRepository
  ) {}

  /**
   * Track trait evolution for a profile
   * Analyzes how traits have evolved over specified time period
   */
  async trackTraitEvolution(
    profileId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      traitNames?: string[];
      categories?: string[];
    }
  ): Promise<{
    traits: Array<{
      name: string;
      category: string;
      history: Array<{
        date: Date;
        score: number;
        assessmentMethod: string;
      }>;
      analysis: {
        startScore: number;
        currentScore: number;
        growth: number;
        growthPercentage: number;
        trend: 'improving' | 'declining' | 'stable';
        growthRate: number;
        volatility: number;
      };
    }>;
    overallGrowth: number;
    fastestGrowingTrait?: {
      name: string;
      growth: number;
    };
    mostDeclinedTrait?: {
      name: string;
      decline: number;
    };
  }> {
    try {
      logger.info('Tracking trait evolution', { profileId, options });
      
      // Default dates
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(endDate.getTime() - (180 * 24 * 60 * 60 * 1000)); // 180 days by default
      
      // Get trait history from the repository
      const traitHistory = await this.dataRepository.getTraitHistory(
        profileId,
        undefined, // All traits
        startDate,
        endDate
      );
      
      if (!traitHistory || traitHistory.length === 0) {
        logger.warn('No trait history found for profile', { profileId });
        return {
          traits: [],
          overallGrowth: 0
        };
      }
      
      // Group traits by name
      const traitsByName: Record<string, Trait[]> = {};
      
      traitHistory.forEach(trait => {
        // Skip if we're filtering by trait names and this isn't in the list
        if (options?.traitNames && !options.traitNames.includes(trait.name)) {
          return;
        }
        
        // Skip if we're filtering by categories and this isn't in the list
        if (options?.categories && !options.categories.includes(trait.category)) {
          return;
        }
        
        const key = trait.name.toLowerCase();
        
        if (!traitsByName[key]) {
          traitsByName[key] = [];
        }
        
        traitsByName[key].push(trait);
      });
      
      // Analyze each trait's evolution
      const traitEvolutions: Array<{
        name: string;
        category: string;
        history: Array<{
          date: Date;
          score: number;
          assessmentMethod: string;
        }>;
        analysis: {
          startScore: number;
          currentScore: number;
          growth: number;
          growthPercentage: number;
          trend: 'improving' | 'declining' | 'stable';
          growthRate: number;
          volatility: number;
        };
      }> = [];
      
      let totalGrowth = 0;
      let fastestGrowingTrait: {name: string; growth: number} | undefined;
      let mostDeclinedTrait: {name: string; decline: number} | undefined;
      
      Object.entries(traitsByName).forEach(([name, traits]) => {
        if (traits.length < 2) {
          // Skip traits with insufficient history
          return;
        }
        
        // Sort traits by assessment date
        const sortedTraits = [...traits].sort((a, b) => 
          a.assessmentDate.getTime() - b.assessmentDate.getTime()
        );
        
        // Create history array
        const history = sortedTraits.map(t => ({
          date: t.assessmentDate,
          score: t.score,
          assessmentMethod: t.assessmentMethod
        }));
        
        // Calculate metrics
        const startScore = sortedTraits[0].score;
        const currentScore = sortedTraits[sortedTraits.length - 1].score;
        const growth = currentScore - startScore;
        const growthPercentage = startScore > 0 ? (growth / startScore) * 100 : 0;
        
        // Determine trend
        let trend: 'improving' | 'declining' | 'stable';
        if (growth > 5) {
          trend = 'improving';
        } else if (growth < -5) {
          trend = 'declining';
        } else {
          trend = 'stable';
        }
        
        // Calculate growth rate (points per month)
        const timeSpanMs = sortedTraits[sortedTraits.length - 1].assessmentDate.getTime() - 
                          sortedTraits[0].assessmentDate.getTime();
        const monthsElapsed = timeSpanMs / (30 * 24 * 60 * 60 * 1000);
        const growthRate = monthsElapsed > 0 ? growth / monthsElapsed : 0;
        
        // Calculate volatility (standard deviation of score changes)
        let volatility = 0;
        if (sortedTraits.length > 2) {
          const changes: number[] = [];
          
          for (let i = 1; i < sortedTraits.length; i++) {
            changes.push(sortedTraits[i].score - sortedTraits[i-1].score);
          }
          
          const meanChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
          const squaredDiffs = changes.map(change => Math.pow(change - meanChange, 2));
          volatility = Math.sqrt(squaredDiffs.reduce((sum, diff) => sum + diff, 0) / changes.length);
        }
        
        // Add to result
        traitEvolutions.push({
          name: traits[0].name, // Use proper case from trait
          category: traits[0].category,
          history,
          analysis: {
            startScore,
            currentScore,
            growth,
            growthPercentage,
            trend,
            growthRate,
            volatility
          }
        });
        
        // Track fastest growing/most declined
        if (growth > 0 && (!fastestGrowingTrait || growth > fastestGrowingTrait.growth)) {
          fastestGrowingTrait = {
            name: traits[0].name,
            growth
          };
        } else if (growth < 0 && (!mostDeclinedTrait || growth < -mostDeclinedTrait.decline)) {
          mostDeclinedTrait = {
            name: traits[0].name,
            decline: -growth
          };
        }
        
        // Add to total growth
        totalGrowth += growth;
      });
      
      return {
        traits: traitEvolutions,
        overallGrowth: totalGrowth,
        fastestGrowingTrait,
        mostDeclinedTrait
      };
    } catch (error) {
      logger.error('Error tracking trait evolution', { error, profileId });
      throw new Error(`Failed to track trait evolution: ${error.message}`);
    }
  }

  /**
   * Analyze trait growth periods
   * Identifies and analyzes significant growth periods for a trait
   */
  async analyzeGrowthPeriods(
    profileId: string,
    traitName: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      significanceThreshold?: number; // Min growth to be considered significant
    }
  ): Promise<Array<{
    startDate: Date;
    endDate: Date;
    startScore: number;
    endScore: number;
    growth: number;
    growthRate: number;
    duration: number; // days
    sources: Array<{
      assessmentMethod: string;
      count: number;
    }>;
  }>> {
    try {
      logger.info('Analyzing growth periods', { profileId, traitName });
      
      // Default dates and threshold
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000)); // 1 year by default
      const significanceThreshold = options?.significanceThreshold || 5; // 5 points by default
      
      // Get trait history
      const traitHistory = await this.dataRepository.getTraitHistory(
        profileId,
        traitName,
        startDate,
        endDate
      );
      
      if (!traitHistory || traitHistory.length < 2) {
        logger.warn('Insufficient trait history to analyze growth periods', { profileId, traitName });
        return [];
      }
      
      // Sort by date
      const sortedHistory = [...traitHistory].sort((a, b) => 
        a.assessmentDate.getTime() - b.assessmentDate.getTime()
      );
      
      // Identify periods of continuous growth or decline
      const growthPeriods: Array<{
        traits: Trait[];
        startDate: Date;
        endDate: Date;
        startScore: number;
        endScore: number;
        growth: number;
        direction: 'growth' | 'decline';
      }> = [];
      
      let periodStart = 0;
      let currentDirection: 'growth' | 'decline' | null = null;
      
      for (let i = 1; i < sortedHistory.length; i++) {
        const prevScore = sortedHistory[i-1].score;
        const currentScore = sortedHistory[i].score;
        const scoreDiff = currentScore - prevScore;
        
        const newDirection = scoreDiff > 0 ? 'growth' : scoreDiff < 0 ? 'decline' : currentDirection;
        
        // Direction changed or period ended
        if (newDirection !== currentDirection && currentDirection !== null) {
          // Record completed period
          const periodTraits = sortedHistory.slice(periodStart, i);
          
          // Skip single-point periods
          if (periodTraits.length >= 2) {
            const startTraitDate = periodTraits[0].assessmentDate;
            const endTraitDate = periodTraits[periodTraits.length - 1].assessmentDate;
            const startTraitScore = periodTraits[0].score;
            const endTraitScore = periodTraits[periodTraits.length - 1].score;
            const periodGrowth = endTraitScore - startTraitScore;
            
            growthPeriods.push({
              traits: periodTraits,
              startDate: startTraitDate,
              endDate: endTraitDate,
              startScore: startTraitScore, 
              endScore: endTraitScore,
              growth: periodGrowth,
              direction: currentDirection
            });
          }
          
          // Start new period
          periodStart = i - 1;
        }
        
        currentDirection = newDirection;
      }
      
      // Handle final period
      if (currentDirection !== null) {
        const periodTraits = sortedHistory.slice(periodStart);
        
        // Skip single-point periods
        if (periodTraits.length >= 2) {
          const startTraitDate = periodTraits[0].assessmentDate;
          const endTraitDate = periodTraits[periodTraits.length - 1].assessmentDate;
          const startTraitScore = periodTraits[0].score;
          const endTraitScore = periodTraits[periodTraits.length - 1].score;
          const periodGrowth = endTraitScore - startTraitScore;
          
          growthPeriods.push({
            traits: periodTraits,
            startDate: startTraitDate,
            endDate: endTraitDate,
            startScore: startTraitScore,
            endScore: endTraitScore,
            growth: periodGrowth,
            direction: currentDirection
          });
        }
      }
      
      // Filter and analyze significant growth periods
      return growthPeriods
        .filter(period => 
          period.direction === 'growth' && Math.abs(period.growth) >= significanceThreshold
        )
        .map(period => {
          // Calculate duration in days
          const durationMs = period.endDate.getTime() - period.startDate.getTime();
          const durationDays = Math.round(durationMs / (24 * 60 * 60 * 1000));
          
          // Calculate growth rate (points per month)
          const monthsElapsed = durationMs / (30 * 24 * 60 * 60 * 1000);
          const growthRate = monthsElapsed > 0 ? period.growth / monthsElapsed : period.growth;
          
          // Count assessment methods
          const methodCounts: Record<string, number> = {};
          
          period.traits.forEach(trait => {
            const method = trait.assessmentMethod;
            methodCounts[method] = (methodCounts[method] || 0) + 1;
          });
          
          const sources = Object.entries(methodCounts).map(([method, count]) => ({
            assessmentMethod: method,
            count
          }));
          
          return {
            startDate: period.startDate,
            endDate: period.endDate,
            startScore: period.startScore,
            endScore: period.endScore,
            growth: period.growth,
            growthRate,
            duration: durationDays,
            sources
          };
        })
        .sort((a, b) => b.growth - a.growth); // Sort by growth magnitude
    } catch (error) {
      logger.error('Error analyzing growth periods', { error, profileId, traitName });
      throw new Error(`Failed to analyze growth periods: ${error.message}`);
    }
  }

  /**
   * Identify development milestones
   * Detects significant milestones in trait development
   */
  async identifyMilestones(
    profileId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      traitNames?: string[];
    }
  ): Promise<Array<TraitMilestone>> {
    try {
      logger.info('Identifying trait milestones', { profileId });
      
      // Default dates
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000)); // 1 year by default
      
      // Get trait history
      const traitHistory = await this.dataRepository.getTraitHistory(
        profileId,
        options?.traitNames?.length === 1 ? options.traitNames[0] : undefined,
        startDate,
        endDate
      );
      
      if (!traitHistory || traitHistory.length === 0) {
        logger.warn('No trait history to identify milestones from', { profileId });
        return [];
      }
      
      // Filter traits if specified
      let filteredHistory = traitHistory;
      if (options?.traitNames && options.traitNames.length > 0) {
        filteredHistory = traitHistory.filter(trait => 
          options.traitNames!.includes(trait.name)
        );
      }
      
      // Group traits by name
      const traitsByName: Record<string, Trait[]> = {};
      
      filteredHistory.forEach(trait => {
        const key = trait.name.toLowerCase();
        
        if (!traitsByName[key]) {
          traitsByName[key] = [];
        }
        
        traitsByName[key].push(trait);
      });
      
      // Identify milestones for each trait
      const milestones: TraitMilestone[] = [];
      
      Object.entries(traitsByName).forEach(([name, traits]) => {
        if (traits.length < 2) {
          return; // Skip traits with insufficient history
        }
        
        // Sort by date
        const sortedTraits = [...traits].sort((a, b) => 
          a.assessmentDate.getTime() - b.assessmentDate.getTime()
        );
        
        // Baseline milestone (starting point)
        const baselineTrait = sortedTraits[0];
        milestones.push({
          id: `milestone_baseline_${baselineTrait.id}`,
          traitId: baselineTrait.id,
          profileId,
          score: baselineTrait.score,
          date: baselineTrait.assessmentDate,
          type: 'baseline',
          description: `Initial assessment of ${baselineTrait.name}`,
          evidence: `Assessment via ${baselineTrait.assessmentMethod} method`
        });
        
        // Significant improvements
        let lastMilestoneScore = baselineTrait.score;
        let consecutiveGrowth = 0;
        
        for (let i = 1; i < sortedTraits.length; i++) {
          const trait = sortedTraits[i];
          const scoreDiff = trait.score - lastMilestoneScore;
          
          // Check for significant improvements
          if (scoreDiff >= 10) {
            // Major improvement milestone
            milestones.push({
              id: `milestone_major_${trait.id}`,
              traitId: trait.id,
              profileId,
              score: trait.score,
              date: trait.assessmentDate,
              type: 'improvement',
              description: `Major improvement in ${trait.name}`,
              evidence: `Score increased by ${scoreDiff} points from ${lastMilestoneScore} to ${trait.score}`
            });
            
            lastMilestoneScore = trait.score;
            consecutiveGrowth = 0;
          } else if (scoreDiff > 0) {
            consecutiveGrowth += scoreDiff;
            
            // Check for consistent growth milestone
            if (consecutiveGrowth >= 15) {
              milestones.push({
                id: `milestone_consistent_${trait.id}`,
                traitId: trait.id,
                profileId,
                score: trait.score,
                date: trait.assessmentDate,
                type: 'improvement',
                description: `Consistent improvement in ${trait.name}`,
                evidence: `Score has consistently improved by ${consecutiveGrowth} points over multiple assessments`
              });
              
              lastMilestoneScore = trait.score;
              consecutiveGrowth = 0;
            }
          } else {
            // Reset consecutive growth counter on decline
            consecutiveGrowth = 0;
          }
          
          // Check for threshold crossings (e.g., crossing 50, 75, 90 points)
          const thresholds = [90, 75, 50];
          for (const threshold of thresholds) {
            const prevTrait = sortedTraits[i-1];
            if (prevTrait.score < threshold && trait.score >= threshold) {
              milestones.push({
                id: `milestone_threshold_${trait.id}_${threshold}`,
                traitId: trait.id,
                profileId,
                score: trait.score,
                date: trait.assessmentDate,
                type: 'threshold',
                description: `${trait.name} reached ${threshold}+ level`,
                evidence: `Score increased from ${prevTrait.score} to ${trait.score}, crossing the ${threshold} threshold`
              });
            }
          }
          
          // Check for achievement milestones (based on metadata)
          if (trait.metadata?.certificationEarned || 
              trait.metadata?.recognition || 
              trait.metadata?.achievement) {
            const achievementDesc = trait.metadata.certificationEarned || 
                                   trait.metadata.recognition || 
                                   trait.metadata.achievement || 
                                   'Notable achievement';
            
            milestones.push({
              id: `milestone_achievement_${trait.id}`,
              traitId: trait.id,
              profileId,
              score: trait.score,
              date: trait.assessmentDate,
              type: 'recognition',
              description: `Recognition for ${trait.name}`,
              evidence: achievementDesc
            });
          }
        }
        
        // Latest assessment milestone
        const latestTrait = sortedTraits[sortedTraits.length - 1];
        milestones.push({
          id: `milestone_latest_${latestTrait.id}`,
          traitId: latestTrait.id,
          profileId,
          score: latestTrait.score,
          date: latestTrait.assessmentDate,
          type: 'current',
          description: `Current level of ${latestTrait.name}`,
          evidence: `Latest assessment via ${latestTrait.assessmentMethod} method`
        });
      });
      
      // Sort milestones by date
      return milestones.sort((a, b) => a.date.getTime() - b.date.getTime());
    } catch (error) {
      logger.error('Error identifying trait milestones', { error, profileId });
      throw new Error(`Failed to identify milestones: ${error.message}`);
    }
  }

  /**
   * Perform comparative historical analysis
   * Compares trait evolution across different time periods
   */
  async performComparativeHistoricalAnalysis(
    profileId: string,
    traitName: string,
    periods: Array<{
      name: string;
      startDate: Date;
      endDate: Date;
    }>
  ): Promise<{
    traitName: string;
    comparisons: Array<{
      periodName: string;
      startScore: number;
      endScore: number;
      growth: number;
      growthRate: number;
    }>;
    bestGrowthPeriod: string;
    worstGrowthPeriod: string;
    overallTrend: 'improving' | 'declining' | 'fluctuating' | 'stable';
  }> {
    try {
      logger.info('Performing comparative historical analysis', { profileId, traitName });
      
      // Validate periods
      if (!periods || periods.length < 2) {
        throw new Error('At least two time periods are required for comparative analysis');
      }
      
      // Analyze each period
      const periodAnalyses: Array<{
        periodName: string;
        startDate: Date;
        endDate: Date;
        startScore: number;
        endScore: number;
        growth: number;
        growthRate: number; // points per month
      }> = [];
      
      for (const period of periods) {
        // Get trait history for this period
        const traitHistory = await this.dataRepository.getTraitHistory(
          profileId,
          traitName,
          period.startDate,
          period.endDate
        );
        
        if (!traitHistory || traitHistory.length < 2) {
          logger.warn(`Insufficient history for period ${period.name}`, { profileId, traitName });
          continue;
        }
        
        // Sort by date
        const sortedHistory = [...traitHistory].sort((a, b) => 
          a.assessmentDate.getTime() - b.assessmentDate.getTime()
        );
        
        const startScore = sortedHistory[0].score;
        const endScore = sortedHistory[sortedHistory.length - 1].score;
        const growth = endScore - startScore;
        
        // Calculate growth rate (points per month)
        const timeSpanMs = period.endDate.getTime() - period.startDate.getTime();
        const monthsElapsed = timeSpanMs / (30 * 24 * 60 * 60 * 1000);
        const growthRate = monthsElapsed > 0 ? growth / monthsElapsed : 0;
        
        periodAnalyses.push({
          periodName: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          startScore,
          endScore,
          growth,
          growthRate
        });
      }
      
      if (periodAnalyses.length < 2) {
        throw new Error('Insufficient data for comparative analysis - need at least two valid periods');
      }
      
      // Find best and worst growth periods
      let bestGrowthPeriod = periodAnalyses[0];
      let worstGrowthPeriod = periodAnalyses[0];
      
      for (let i = 1; i < periodAnalyses.length; i++) {
        const analysis = periodAnalyses[i];
        
        if (analysis.growth > bestGrowthPeriod.growth) {
          bestGrowthPeriod = analysis;
        }
        
        if (analysis.growth < worstGrowthPeriod.growth) {
          worstGrowthPeriod = analysis;
        }
      }
      
      // Determine overall trend
      let overallTrend: 'improving' | 'declining' | 'fluctuating' | 'stable';
      
      // Count growth periods and decline periods
      const growthPeriods = periodAnalyses.filter(p => p.growth > 5).length;
      const declinePeriods = periodAnalyses.filter(p => p.growth < -5).length;
      const stablePeriods = periodAnalyses.filter(p => Math.abs(p.growth) <= 5).length;
      
      if (growthPeriods > declinePeriods && growthPeriods > stablePeriods) {
        overallTrend = 'improving';
      } else if (declinePeriods > growthPeriods && declinePeriods > stablePeriods) {
        overallTrend = 'declining';
      } else if (growthPeriods > 0 && declinePeriods > 0) {
        overallTrend = 'fluctuating';
      } else {
        overallTrend = 'stable';
      }
      
      // Format comparisons for response
      const comparisons = periodAnalyses.map(analysis => ({
        periodName: analysis.periodName,
        startScore: analysis.startScore,
        endScore: analysis.endScore,
        growth: analysis.growth,
        growthRate: analysis.growthRate
      }));
      
      return {
        traitName,
        comparisons,
        bestGrowthPeriod: bestGrowthPeriod.periodName,
        worstGrowthPeriod: worstGrowthPeriod.periodName,
        overallTrend
      };
    } catch (error) {
      logger.error('Error performing comparative historical analysis', { error, profileId, traitName });
      throw new Error(`Failed to perform comparative historical analysis: ${error.message}`);
    }
  }

  /**
   * Generate development trends report
   */
  async generateDevelopmentTrendsReport(
    profileId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      topTraits?: number;
    }
  ): Promise<{
    overallGrowth: number;
    topGrowingTraits: Array<{
      name: string;
      category: string;
      growth: number;
      growthPercentage: number;
    }>;
    topDecliningTraits: Array<{
      name: string;
      category: string;
      decline: number;
      declinePercentage: number;
    }>;
    categoryTrends: Array<{
      category: string;
      averageGrowth: number;
      topGrowingTrait?: string;
      topDecliningTrait?: string;
    }>;
    insightSummary: string;
  }> {
    try {
      logger.info('Generating development trends report', { profileId });
      
      // Default values
      const endDate = options?.endDate || new Date();
      const startDate = options?.startDate || new Date(endDate.getTime() - (180 * 24 * 60 * 60 * 1000)); // 6 months by default
      const topTraitCount = options?.topTraits || 5;
      
      // Get trait evolution data
      const evolutionData = await this.trackTraitEvolution(profileId, {
        startDate,
        endDate
      });
      
      if (!evolutionData.traits || evolutionData.traits.length === 0) {
        return {
          overallGrowth: 0,
          topGrowingTraits: [],
          topDecliningTraits: [],
          categoryTrends: [],
          insightSummary: 'Insufficient data to generate development trends report.'
        };
      }
      
      // Sort traits by growth/decline
      const traitsByGrowth = [...evolutionData.traits].sort((a, b) => 
        b.analysis.growth - a.analysis.growth
      );
      
      // Get top growing and declining traits
      const topGrowingTraits = traitsByGrowth
        .filter(t => t.analysis.growth > 0)
        .slice(0, topTraitCount)
        .map(t => ({
          name: t.name,
          category: t.category,
          growth: t.analysis.growth,
          growthPercentage: t.analysis.growthPercentage
        }));
      
      const topDecliningTraits = [...traitsByGrowth]
        .reverse()
        .filter(t => t.analysis.growth < 0)
        .slice(0, topTraitCount)
        .map(t => ({
          name: t.name,
          category: t.category,
          decline: -t.analysis.growth,
          declinePercentage: -t.analysis.growthPercentage
        }));
      
      // Group by category and analyze category trends
      const traitsByCategory: Record<string, Array<typeof traitsByGrowth[0]>> = {};
      
      evolutionData.traits.forEach(trait => {
        if (!traitsByCategory[trait.category]) {
          traitsByCategory[trait.category] = [];
        }
        
        traitsByCategory[trait.category].push(trait);
      });
      
      const categoryTrends = Object.entries(traitsByCategory).map(([category, traits]) => {
        // Calculate average growth for the category
        const totalGrowth = traits.reduce((sum, t) => sum + t.analysis.growth, 0);
        const averageGrowth = traits.length > 0 ? totalGrowth / traits.length : 0;
        
        // Find top growing trait in category
        const topGrowingTrait = traits.length > 0 
          ? [...traits].sort((a, b) => b.analysis.growth - a.analysis.growth)[0].name
          : undefined;
        
        // Find top declining trait in category
        const topDecliningTrait = traits.length > 0
          ? [...traits].sort((a, b) => a.analysis.growth - b.analysis.growth)[0].name
          : undefined;
        
        return {
          category,
          averageGrowth,
          topGrowingTrait,
          topDecliningTrait
        };
      });
      
      // Generate insight summary
      let insightSummary = '';
      
      if (evolutionData.overallGrowth > 0) {
        insightSummary = `Overall positive growth trend with a ${evolutionData.overallGrowth} point increase in trait scores. `;
      } else if (evolutionData.overallGrowth < 0) {
        insightSummary = `Overall negative growth trend with a ${-evolutionData.overallGrowth} point decrease in trait scores. `;
      } else {
        insightSummary = `Overall stable trait scores with no significant change. `;
      }
      
      if (topGrowingTraits.length > 0) {
        insightSummary += `The most significant growth was observed in ${topGrowingTraits[0].name} with a +${topGrowingTraits[0].growth} point increase. `;
      }
      
      if (topDecliningTraits.length > 0) {
        insightSummary += `The most significant decline was observed in ${topDecliningTraits[0].name} with a -${topDecliningTraits[0].decline} point decrease. `;
      }
      
      // Identify strongest and weakest category trends
      const sortedCategories = [...categoryTrends].sort((a, b) => b.averageGrowth - a.averageGrowth);
      
      if (sortedCategories.length > 0) {
        const strongestCategory = sortedCategories[0];
        const weakestCategory = sortedCategories[sortedCategories.length - 1];
        
        if (strongestCategory.averageGrowth > 0) {
          insightSummary += `The ${strongestCategory.category} category showed the strongest growth. `;
        }
        
        if (weakestCategory.averageGrowth < 0) {
          insightSummary += `The ${weakestCategory.category} category showed the most decline and may need attention.`;
        }
      }
      
      return {
        overallGrowth: evolutionData.overallGrowth,
        topGrowingTraits,
        topDecliningTraits,
        categoryTrends,
        insightSummary
      };
    } catch (error) {
      logger.error('Error generating development trends report', { error, profileId });
      throw new Error(`Failed to generate development trends report: ${error.message}`);
    }
  }
}