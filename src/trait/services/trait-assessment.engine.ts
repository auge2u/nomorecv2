import logger from '../../utils/logger';
import { TraitContentAnalyzer } from './trait-content-analyzer';
import { TraitDataRepository } from './trait-data.repository';
import { Trait } from '../models/trait.model';

/**
 * Trait Assessment Engine
 * Core system for assessing and calculating professional traits
 */
export class TraitAssessmentEngine {
  constructor(
    private contentAnalyzer: TraitContentAnalyzer,
    private dataRepository: TraitDataRepository
  ) {}

  /**
   * Perform direct trait assessment from questionnaire responses
   */
  async performDirectAssessment(
    profileId: string,
    responses: Array<{
      questionId: string;
      response: number | string;
      traits: Array<{
        name: string;
        category: string;
        weight: number;
      }>;
    }>
  ): Promise<Trait[]> {
    try {
      logger.info('Performing direct trait assessment', { profileId });
      
      // Process and aggregate responses by trait
      const traitScores: Record<string, {
        name: string;
        category: string;
        totalScore: number;
        weightSum: number;
        responses: Array<{
          questionId: string;
          response: number | string;
          weight: number;
        }>;
      }> = {};
      
      // Process each response
      responses.forEach(response => {
        // Handle numeric responses
        const numericValue = typeof response.response === 'number' 
          ? response.response 
          : this.convertResponseToNumeric(response.response);
        
        // Update scores for each associated trait
        response.traits.forEach(trait => {
          const key = `${trait.name}:${trait.category}`;
          
          if (!traitScores[key]) {
            traitScores[key] = {
              name: trait.name,
              category: trait.category,
              totalScore: 0,
              weightSum: 0,
              responses: []
            };
          }
          
          traitScores[key].totalScore += numericValue * trait.weight;
          traitScores[key].weightSum += trait.weight;
          traitScores[key].responses.push({
            questionId: response.questionId,
            response: response.response,
            weight: trait.weight
          });
        });
      });
      
      // Calculate final scores and create trait objects
      const traits: Array<Partial<Trait>> = Object.values(traitScores).map(traitData => {
        // Calculate normalized score (0-100)
        const normalizedScore = Math.min(100, Math.max(0,
          Math.round((traitData.totalScore / traitData.weightSum) * 20)
        ));
        
        return {
          profileId,
          name: traitData.name,
          category: traitData.category,
          score: normalizedScore,
          assessmentMethod: 'self',
          assessmentDate: new Date(),
          metadata: {
            assessmentType: 'direct',
            responses: traitData.responses
          }
        };
      });
      
      // Save traits to the database
      const savedTraits = await this.dataRepository.saveTraitAssessment({
        profileId,
        traits: traits.map(t => ({
          name: t.name!,
          category: t.category!,
          score: t.score!,
          assessmentMethod: 'self',
          metadata: t.metadata
        })),
        source: 'questionnaire'
      });
      
      return savedTraits;
    } catch (error) {
      logger.error('Error performing direct trait assessment', { error, profileId });
      throw new Error(`Failed to process trait assessment: ${error.message}`);
    }
  }

  /**
   * Perform content-based trait assessment
   */
  async performContentAssessment(
    profileId: string,
    content: string,
    contentType: 'resume' | 'professional' | 'social' | 'interview' | 'feedback'
  ): Promise<Trait[]> {
    try {
      logger.info('Performing content-based trait assessment', { profileId, contentType });
      
      // Analyze content
      const traitResults = this.contentAnalyzer.analyzeTextContent(content, { contentType }).traits;
      
      // Filter out low confidence or low score results
      const validResults = traitResults.filter(result => 
        result.confidence > 0.4 && result.score > 0
      );
      
      if (validResults.length === 0) {
        logger.warn('No valid traits identified from content', { profileId });
        return [];
      }
      
      // Convert to trait objects
      const traits: Array<Partial<Trait>> = validResults.map(result => ({
        profileId,
        name: result.name,
        category: result.category,
        score: result.score,
        assessmentMethod: 'derived',
        assessmentDate: new Date(),
        metadata: {
          assessmentType: 'content',
          contentType,
          confidence: result.confidence,
          evidence: result.evidence
        }
      }));
      
      // Save traits to the database
      const savedTraits = await this.dataRepository.saveTraitAssessment({
        profileId,
        traits: traits.map(t => ({
          name: t.name!,
          category: t.category!,
          score: t.score!,
          assessmentMethod: 'derived',
          metadata: t.metadata
        })),
        source: `content:${contentType}`
      });
      
      return savedTraits;
    } catch (error) {
      logger.error('Error performing content-based trait assessment', { error, profileId });
      throw new Error(`Failed to process content assessment: ${error.message}`);
    }
  }

  /**
   * Perform project-based trait assessment
   */
  async performProjectAssessment(
    profileId: string,
    project: {
      title: string;
      description: string;
      objectives?: string[];
      outcomes?: string[];
      technologies?: string[];
      methodologies?: string[];
      role?: string;
      teamSize?: number;
    }
  ): Promise<Trait[]> {
    try {
      logger.info('Performing project-based trait assessment', { profileId });
      
      // Analyze project details
      const projectResults = this.contentAnalyzer.analyzeProjectDetails(project);
      
      // Filter out low confidence or low score results
      const validResults = projectResults.filter(result => 
        result.confidence > 0.5 && result.score > 0
      );
      
      if (validResults.length === 0) {
        logger.warn('No valid traits identified from project', { profileId });
        return [];
      }
      
      // Convert to trait objects
      const traits: Array<Partial<Trait>> = validResults.map(result => ({
        profileId,
        name: result.name,
        category: result.category,
        score: result.score,
        assessmentMethod: 'derived',
        assessmentDate: new Date(),
        metadata: {
          assessmentType: 'project',
          projectTitle: project.title,
          confidence: result.confidence,
          features: result.features,
          technologies: project.technologies,
          methodologies: project.methodologies,
          teamSize: project.teamSize
        }
      }));
      
      // Save traits to the database
      const savedTraits = await this.dataRepository.saveTraitAssessment({
        profileId,
        traits: traits.map(t => ({
          name: t.name!,
          category: t.category!,
          score: t.score!,
          assessmentMethod: 'derived',
          metadata: t.metadata
        })),
        source: 'project'
      });
      
      return savedTraits;
    } catch (error) {
      logger.error('Error performing project-based trait assessment', { error, profileId });
      throw new Error(`Failed to process project assessment: ${error.message}`);
    }
  }

  /**
   * Perform feedback-based trait assessment
   */
  async performFeedbackAssessment(
    profileId: string,
    feedback: {
      text: string;
      source: string;
      relationship?: string;
      context?: string;
      rating?: number; // 1-5 scale
    }
  ): Promise<Trait[]> {
    try {
      logger.info('Performing feedback-based trait assessment', { profileId });
      
      // Analyze feedback
      const feedbackResults = this.contentAnalyzer.analyzeFeedback(feedback);
      
      // Filter out low confidence or low score results
      const validResults = feedbackResults.filter(result => 
        result.confidence > 0.5 && result.score > 0
      );
      
      if (validResults.length === 0) {
        logger.warn('No valid traits identified from feedback', { profileId });
        return [];
      }
      
      // Convert to trait objects
      const traits: Array<Partial<Trait>> = validResults.map(result => ({
        profileId,
        name: result.name,
        category: result.category,
        score: result.score,
        assessmentMethod: 'external',
        assessmentDate: new Date(),
        metadata: {
          assessmentType: 'feedback',
          source: feedback.source,
          relationship: feedback.relationship,
          context: feedback.context,
          rating: feedback.rating,
          confidence: result.confidence
        }
      }));
      
      // Save traits to the database
      const savedTraits = await this.dataRepository.saveTraitAssessment({
        profileId,
        traits: traits.map(t => ({
          name: t.name!,
          category: t.category!,
          score: t.score!,
          assessmentMethod: 'external',
          metadata: t.metadata
        })),
        source: `feedback:${feedback.source}`
      });
      
      return savedTraits;
    } catch (error) {
      logger.error('Error performing feedback-based trait assessment', { error, profileId });
      throw new Error(`Failed to process feedback assessment: ${error.message}`);
    }
  }

  /**
   * Perform comparative trait assessment against benchmark
   */
  async performComparativeAssessment(
    profileId: string,
    benchmarkType: 'industry' | 'role' | 'experience_level',
    benchmarkValue: string
  ): Promise<{
    traits: Trait[];
    comparison: Array<{
      traitName: string;
      profileScore: number;
      benchmarkScore: number;
      gap: number;
      percentile?: number;
    }>;
  }> {
    try {
      logger.info('Performing comparative trait assessment', { profileId, benchmarkType, benchmarkValue });
      
      // Get profile traits
      const profileTraits = await this.dataRepository.getTraitsForProfile(profileId);
      
      if (!profileTraits || profileTraits.length === 0) {
        throw new Error('No traits found for profile');
      }
      
      // Get benchmark data
      const benchmarkData = await this.getBenchmarkData(benchmarkType, benchmarkValue);
      
      // Compare each trait
      const comparison: Array<{
        traitName: string;
        profileScore: number;
        benchmarkScore: number;
        gap: number;
        percentile?: number;
      }> = [];
      
      // Get latest values for each trait
      const latestTraits = this.getLatestTraitValues(profileTraits);
      
      // Compare with benchmark data
      latestTraits.forEach(trait => {
        const benchmarkTrait = benchmarkData.find(b => 
          b.name.toLowerCase() === trait.name.toLowerCase()
        );
        
        if (benchmarkTrait) {
          comparison.push({
            traitName: trait.name,
            profileScore: trait.score,
            benchmarkScore: benchmarkTrait.score,
            gap: trait.score - benchmarkTrait.score,
            percentile: this.calculatePercentile(
              trait.score,
              benchmarkTrait.distribution
            )
          });
        }
      });
      
      // Create trait objects for storing the comparison
      const updatedTraits = comparison.map(comp => ({
        profileId,
        name: comp.traitName,
        category: latestTraits.find(t => t.name === comp.traitName)?.category || 'general',
        score: comp.profileScore, // Keep original score
        assessmentMethod: 'derived',
        assessmentDate: new Date(),
        metadata: {
          assessmentType: 'comparative',
          benchmarkType,
          benchmarkValue,
          benchmarkScore: comp.benchmarkScore,
          gap: comp.gap,
          percentile: comp.percentile
        }
      }));
      
      // Save only the comparative metadata, not new trait scores
      const savedTraits = await this.dataRepository.saveTraitAssessment({
        profileId,
        traits: updatedTraits.map(t => ({
          name: t.name,
          category: t.category,
          score: t.score,
          assessmentMethod: 'derived',
          metadata: t.metadata
        })),
        source: `comparative:${benchmarkType}:${benchmarkValue}`
      });
      
      return {
        traits: savedTraits,
        comparison
      };
    } catch (error) {
      logger.error('Error performing comparative trait assessment', { error, profileId });
      throw new Error(`Failed to process comparative assessment: ${error.message}`);
    }
  }

  /**
   * Aggregate traits from multiple assessments
   */
  async aggregateTraitAssessments(
    profileId: string,
    options?: {
      timeframe?: 'recent' | 'all';
      assessmentTypes?: ('self' | 'external' | 'derived')[];
      weightMap?: {
        self?: number;
        external?: number;
        derived?: number;
      };
    }
  ): Promise<Trait[]> {
    try {
      logger.info('Aggregating trait assessments', { profileId, options });
      
      // Get all traits for the profile
      const allTraits = await this.dataRepository.getTraitsForProfile(profileId);
      
      if (!allTraits || allTraits.length === 0) {
        logger.warn('No traits found for profile', { profileId });
        return [];
      }
      
      // Apply time filter if specified
      let filteredTraits = allTraits;
      if (options?.timeframe === 'recent') {
        const recentDate = new Date();
        recentDate.setMonth(recentDate.getMonth() - 3); // Last 3 months
        
        filteredTraits = allTraits.filter(trait => 
          trait.assessmentDate >= recentDate
        );
      }
      
      // Apply assessment type filter if specified
      if (options?.assessmentTypes && options.assessmentTypes.length > 0) {
        filteredTraits = filteredTraits.filter(trait =>
          options.assessmentTypes!.includes(trait.assessmentMethod as any)
        );
      }
      
      if (filteredTraits.length === 0) {
        logger.warn('No traits match the filter criteria', { profileId, options });
        return [];
      }
      
      // Group traits by name
      const traitGroups: Record<string, Trait[]> = {};
      
      filteredTraits.forEach(trait => {
        const key = trait.name.toLowerCase();
        
        if (!traitGroups[key]) {
          traitGroups[key] = [];
        }
        
        traitGroups[key].push(trait);
      });
      
      // Set default weights if not provided
      const weights = options?.weightMap || {
        self: 1.0,
        external: 1.5,
        derived: 0.8
      };
      
      // Aggregate each trait group
      const aggregatedTraits: Trait[] = [];
      
      Object.entries(traitGroups).forEach(([traitName, traits]) => {
        // Use latest category for consistency
        const category = traits[0].category;
        
        // Calculate weighted average score
        let totalWeightedScore = 0;
        let totalWeight = 0;
        
        traits.forEach(trait => {
          const weight = weights[trait.assessmentMethod as keyof typeof weights] || 1.0;
          
          totalWeightedScore += trait.score * weight;
          totalWeight += weight;
        });
        
        const aggregatedScore = Math.round(totalWeightedScore / totalWeight);
        
        // Create aggregated trait
        const aggregatedTrait: Partial<Trait> = {
          profileId,
          name: traits[0].name, // Use proper case from original
          category,
          score: aggregatedScore,
          assessmentMethod: 'derived',
          assessmentDate: new Date(),
          metadata: {
            assessmentType: 'aggregated',
            sourceTraits: traits.map(t => ({
              id: t.id,
              assessmentMethod: t.assessmentMethod,
              assessmentDate: t.assessmentDate,
              score: t.score
            })),
            weights
          }
        };
        
        // Add to result
        aggregatedTraits.push(aggregatedTrait as Trait);
      });
      
      return aggregatedTraits;
    } catch (error) {
      logger.error('Error aggregating trait assessments', { error, profileId });
      throw new Error(`Failed to aggregate trait assessments: ${error.message}`);
    }
  }

  /**
   * Convert string response to numeric value for assessment
   */
  private convertResponseToNumeric(response: string): number {
    // Normalize response
    const normalized = response.trim().toLowerCase();
    
    // Map common responses to 1-5 scale
    if (['strongly agree', 'always', 'excellent', 'definitely'].includes(normalized)) {
      return 5;
    } else if (['agree', 'often', 'good', 'yes', 'very well'].includes(normalized)) {
      return 4;
    } else if (['neutral', 'sometimes', 'average', 'occasionally', 'somewhat'].includes(normalized)) {
      return 3;
    } else if (['disagree', 'rarely', 'poor', 'not really'].includes(normalized)) {
      return 2;
    } else if (['strongly disagree', 'never', 'very poor', 'not at all'].includes(normalized)) {
      return 1;
    }
    
    // Default
    return 3;
  }

  /**
   * Get latest value for each trait from the history
   */
  private getLatestTraitValues(traits: Trait[]): Trait[] {
    const latestTraits: Record<string, Trait> = {};
    
    traits.forEach(trait => {
      const key = trait.name.toLowerCase();
      
      if (!latestTraits[key] || trait.assessmentDate > latestTraits[key].assessmentDate) {
        latestTraits[key] = trait;
      }
    });
    
    return Object.values(latestTraits);
  }

  /**
   * Get benchmark data for comparisons
   */
  private async getBenchmarkData(
    benchmarkType: string,
    benchmarkValue: string
  ): Promise<Array<{
    name: string;
    score: number;
    distribution: Array<{ score: number; frequency: number }>
  }>> {
    // This would typically come from a database or external service
    // For now, return mock data based on type and value
    
    if (benchmarkType === 'industry') {
      return this.getMockIndustryBenchmark(benchmarkValue);
    } else if (benchmarkType === 'role') {
      return this.getMockRoleBenchmark(benchmarkValue);
    } else if (benchmarkType === 'experience_level') {
      return this.getMockExperienceBenchmark(benchmarkValue);
    }
    
    return [];
  }

  /**
   * Calculate percentile for a score within a distribution
   */
  private calculatePercentile(
    score: number,
    distribution: Array<{ score: number; frequency: number }>
  ): number {
    if (!distribution || distribution.length === 0) {
      return 50; // Default to median if no distribution data
    }
    
    // Sort distribution by score
    const sortedDist = [...distribution].sort((a, b) => a.score - b.score);
    
    // Calculate total frequency
    const totalFrequency = sortedDist.reduce((sum, item) => sum + item.frequency, 0);
    
    // Calculate how many scores are below our score
    let belowFrequency = 0;
    for (const item of sortedDist) {
      if (item.score < score) {
        belowFrequency += item.frequency;
      } else if (item.score === score) {
        // For exact matches, count half of the frequency to account for distribution
        belowFrequency += item.frequency / 2;
        break;
      } else {
        break;
      }
    }
    
    // Calculate percentile
    const percentile = (belowFrequency / totalFrequency) * 100;
    
    return Math.round(percentile);
  }

  /**
   * Get mock industry benchmark data
   */
  private getMockIndustryBenchmark(industry: string): Array<{
    name: string;
    score: number;
    distribution: Array<{ score: number; frequency: number }>
  }> {
    const baseBenchmarks = [
      {
        name: 'analytical thinking',
        score: 70,
        distribution: this.generateMockDistribution(70, 15)
      },
      {
        name: 'problem solving',
        score: 75,
        distribution: this.generateMockDistribution(75, 12)
      },
      {
        name: 'leadership',
        score: 65,
        distribution: this.generateMockDistribution(65, 18)
      },
      {
        name: 'communication',
        score: 68,
        distribution: this.generateMockDistribution(68, 15)
      },
      {
        name: 'collaboration',
        score: 72,
        distribution: this.generateMockDistribution(72, 14)
      },
      {
        name: 'adaptability',
        score: 70,
        distribution: this.generateMockDistribution(70, 16)
      },
      {
        name: 'technical proficiency',
        score: 73,
        distribution: this.generateMockDistribution(73, 15)
      }
    ];
    
    // Adjust for industry
    switch (industry.toLowerCase()) {
      case 'technology':
        return baseBenchmarks.map(b => {
          if (b.name === 'technical proficiency') {
            return {
              ...b,
              score: 85, 
              distribution: this.generateMockDistribution(85, 10)
            };
          } else if (b.name === 'analytical thinking') {
            return {
              ...b,
              score: 80,
              distribution: this.generateMockDistribution(80, 12)
            };
          } else if (b.name === 'problem solving') {
            return {
              ...b,
              score: 82,
              distribution: this.generateMockDistribution(82, 11)
            };
          }
          return b;
        });
        
      case 'finance':
        return baseBenchmarks.map(b => {
          if (b.name === 'analytical thinking') {
            return {
              ...b,
              score: 85,
              distribution: this.generateMockDistribution(85, 10)
            };
          } else if (b.name === 'attention to detail') {
            return {
              ...b,
              score: 90,
              distribution: this.generateMockDistribution(90, 8)
            };
          }
          return b;
        });
        
      case 'healthcare':
        return baseBenchmarks.map(b => {
          if (b.name === 'empathy') {
            return {
              ...b,
              score: 85,
              distribution: this.generateMockDistribution(85, 10)
            };
          } else if (b.name === 'communication') {
            return {
              ...b,
              score: 80,
              distribution: this.generateMockDistribution(80, 12)
            };
          }
          return b;
        });
        
      default:
        return baseBenchmarks;
    }
  }

  /**
   * Get mock role benchmark data
   */
  private getMockRoleBenchmark(role: string): Array<{
    name: string;
    score: number;
    distribution: Array<{ score: number; frequency: number }>
  }> {
    const baseBenchmarks = [
      {
        name: 'analytical thinking',
        score: 70,
        distribution: this.generateMockDistribution(70, 15)
      },
      {
        name: 'problem solving',
        score: 75,
        distribution: this.generateMockDistribution(75, 12)
      },
      {
        name: 'leadership',
        score: 65,
        distribution: this.generateMockDistribution(65, 18)
      },
      {
        name: 'communication',
        score: 68,
        distribution: this.generateMockDistribution(68, 15)
      }
    ];
    
    // Adjust for role
    switch (role.toLowerCase()) {
      case 'manager':
      case 'team lead':
        return baseBenchmarks.map(b => {
          if (b.name === 'leadership') {
            return {
              ...b,
              score: 85,
              distribution: this.generateMockDistribution(85, 10)
            };
          } else if (b.name === 'communication') {
            return {
              ...b,
              score: 80,
              distribution: this.generateMockDistribution(80, 12)
            };
          }
          return b;
        });
        
      case 'developer':
      case 'engineer':
        return baseBenchmarks.map(b => {
          if (b.name === 'problem solving') {
            return {
              ...b,
              score: 85,
              distribution: this.generateMockDistribution(85, 10)
            };
          } else if (b.name === 'technical proficiency') {
            return {
              ...b,
              score: 85,
              distribution: this.generateMockDistribution(85, 10)
            };
          }
          return b;
        });
        
      case 'designer':
        return baseBenchmarks.map(b => {
          if (b.name === 'creative thinking') {
            return {
              ...b,
              score: 88,
              distribution: this.generateMockDistribution(88, 9)
            };
          } else if (b.name === 'attention to detail') {
            return {
              ...b,
              score: 82,
              distribution: this.generateMockDistribution(82, 11)
            };
          }
          return b;
        });
        
      default:
        return baseBenchmarks;
    }
  }

  /**
   * Get mock experience level benchmark data
   */
  private getMockExperienceBenchmark(experienceLevel: string): Array<{
    name: string;
    score: number;
    distribution: Array<{ score: number; frequency: number }>
  }> {
    const baseBenchmarks = [
      {
        name: 'analytical thinking',
        score: 70,
        distribution: this.generateMockDistribution(70, 15)
      },
      {
        name: 'problem solving',
        score: 75,
        distribution: this.generateMockDistribution(75, 12)
      },
      {
        name: 'leadership',
        score: 65,
        distribution: this.generateMockDistribution(65, 18)
      },
      {
        name: 'communication',
        score: 68,
        distribution: this.generateMockDistribution(68, 15)
      }
    ];
    
    // Adjust for experience level
    switch (experienceLevel.toLowerCase()) {
      case 'entry':
      case 'junior':
        return baseBenchmarks.map(b => {
          return {
            ...b,
            score: Math.max(50, b.score - 20),
            distribution: this.generateMockDistribution(Math.max(50, b.score - 20), 18)
          };
        });
        
      case 'mid':
      case 'intermediate':
        return baseBenchmarks;
        
      case 'senior':
      case 'expert':
        return baseBenchmarks.map(b => {
          return {
            ...b,
            score: Math.min(95, b.score + 15),
            distribution: this.generateMockDistribution(Math.min(95, b.score + 15), 10)
          };
        });
        
      default:
        return baseBenchmarks;
    }
  }

  /**
   * Generate mock distribution for a given mean score and standard deviation
   */
  private generateMockDistribution(
    mean: number,
    stdDev: number
  ): Array<{ score: number; frequency: number }> {
    const distribution: Array<{ score: number; frequency: number }> = [];
    
    // Generate normal distribution around the mean
    for (let score = Math.max(0, mean - 3 * stdDev); score <= Math.min(100, mean + 3 * stdDev); score += 5) {
      const z = (score - mean) / stdDev;
      const frequency = Math.round(100 * Math.exp(-0.5 * z * z));
      
      distribution.push({ score, frequency });
    }
    
    return distribution;
  }
}