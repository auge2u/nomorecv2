/**
 * Trait Visualization Utilities
 * 
 * Provides algorithms and utilities for visualizing traits in different formats
 * Part of the WP9 Persona Trait System implementation
 */

import { Trait, TraitCluster, TraitRelationship } from '../models/trait.model';
import logger from '../../utils/logger';

export class TraitVisualizationUtils {
  /**
   * Generate data for constellation visualization of traits
   * @param traits List of traits to visualize
   * @param options Visualization options
   * @returns Constellation visualization data
   */
  static generateConstellationData(
    traits: Trait[],
    relationships?: TraitRelationship[],
    options?: {
      centralTrait?: string;
      maxNodes?: number;
      includeCategories?: string[];
      excludeCategories?: string[];
      relationshipThreshold?: number;
      groupByClusters?: boolean;
    }
  ): {
    nodes: Array<{
      id: string;
      name: string;
      category: string;
      score: number;
      size: number;
      x?: number;
      y?: number;
      fixed?: boolean;
      groupId?: string;
    }>;
    links: Array<{
      source: string;
      target: string;
      type: string;
      strength: number;
      distance: number;
      width: number;
    }>;
    clusters?: Array<{
      id: string;
      name: string;
      traits: string[];
      centrality: number;
      color: string;
    }>;
    metadata: {
      centerPoint?: { x: number; y: number };
      dimensions: { width: number; height: number };
      densityMetric: number;
      connectedTraits: number;
    };
  } {
    try {
      // Default options
      const defaultOptions = {
        maxNodes: 30,
        relationshipThreshold: 20,
        groupByClusters: false
      };
      
      // Merge default with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Apply filters
      let filteredTraits = traits;
      
      // Filter by categories
      if (mergedOptions.includeCategories && mergedOptions.includeCategories.length > 0) {
        filteredTraits = filteredTraits.filter(t => 
          mergedOptions.includeCategories!.includes(t.category)
        );
      }
      
      if (mergedOptions.excludeCategories && mergedOptions.excludeCategories.length > 0) {
        filteredTraits = filteredTraits.filter(t => 
          !mergedOptions.excludeCategories!.includes(t.category)
        );
      }
      
      // Limit number of nodes
      if (filteredTraits.length > mergedOptions.maxNodes) {
        // Sort by score and take top traits
        filteredTraits = filteredTraits
          .sort((a, b) => b.score - a.score)
          .slice(0, mergedOptions.maxNodes);
      }
      
      // Create nodes
      const nodes = filteredTraits.map(trait => {
        const normalizedSize = ((trait.score / 100) * 30) + 10; // Range: 10-40
        
        return {
          id: trait.id,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          size: normalizedSize,
          // Position will be calculated by force layout
        };
      });
      
      // Handle central trait if specified
      if (mergedOptions.centralTrait) {
        const centralTraitNode = nodes.find(n => n.id === mergedOptions.centralTrait);
        if (centralTraitNode) {
          centralTraitNode.fixed = true;
          centralTraitNode.x = 0;
          centralTraitNode.y = 0;
        }
      }
      
      // Create links based on relationships
      const links: Array<{
        source: string;
        target: string;
        type: string;
        strength: number;
        distance: number;
        width: number;
      }> = [];
      
      if (relationships && relationships.length > 0) {
        relationships.forEach(rel => {
          // Only create links for traits that are in our filtered set
          const sourceExists = nodes.some(n => n.id === rel.traitId1);
          const targetExists = nodes.some(n => n.id === rel.traitId2);
          
          if (sourceExists && targetExists && rel.strength >= mergedOptions.relationshipThreshold) {
            // Calculate link width based on strength
            const normalizedWidth = ((rel.strength / 100) * 8) + 1; // Range: 1-9
            
            // Calculate distance (inverse of strength)
            const distance = 400 - ((rel.strength / 100) * 300); // Range: 100-400
            
            links.push({
              source: rel.traitId1,
              target: rel.traitId2,
              type: rel.type,
              strength: rel.strength,
              distance,
              width: normalizedWidth
            });
          }
        });
      } else {
        // If no relationships are provided, create basic links based on categories
        // This ensures the visualization remains connected
        const traitsByCategory: Record<string, Trait[]> = {};
        
        // Group traits by category
        filteredTraits.forEach(trait => {
          if (!traitsByCategory[trait.category]) {
            traitsByCategory[trait.category] = [];
          }
          traitsByCategory[trait.category].push(trait);
        });
        
        // Connect traits within the same category
        Object.values(traitsByCategory).forEach(categoryTraits => {
          for (let i = 0; i < categoryTraits.length; i++) {
            for (let j = i + 1; j < categoryTraits.length; j++) {
              links.push({
                source: categoryTraits[i].id,
                target: categoryTraits[j].id,
                type: 'category',
                strength: 50, // Default strength for category links
                distance: 200, // Default distance for category links
                width: 1.5  // Default width for category links
              });
            }
          }
        });
      }
      
      // Build cluster data if grouping by clusters
      let clusters: Array<{
        id: string;
        name: string;
        traits: string[];
        centrality: number;
        color: string;
      }> | undefined = undefined;
      
      if (mergedOptions.groupByClusters) {
        // Generate pseudo-clusters based on categories
        const categoryClusters: Record<string, {
          traits: string[];
          traitScores: number[];
        }> = {};
        
        // Group traits by category
        filteredTraits.forEach(trait => {
          if (!categoryClusters[trait.category]) {
            categoryClusters[trait.category] = {
              traits: [],
              traitScores: []
            };
          }
          categoryClusters[trait.category].traits.push(trait.id);
          categoryClusters[trait.category].traitScores.push(trait.score);
          
          // Assign cluster groupId to nodes
          const node = nodes.find(n => n.id === trait.id);
          if (node) {
            node.groupId = trait.category;
          }
        });
        
        // Generate cluster colors
        const categoryColors = this.generateColorPalette(Object.keys(categoryClusters).length);
        
        // Create clusters array
        clusters = Object.entries(categoryClusters).map(([category, data], index) => {
          // Calculate centrality as average of trait scores
          const avgScore = data.traitScores.reduce((sum, score) => sum + score, 0) / 
                          (data.traitScores.length || 1);
                          
          return {
            id: `cluster-${category}`,
            name: this.formatCategoryName(category),
            traits: data.traits,
            centrality: avgScore,
            color: categoryColors[index]
          };
        });
      }
      
      // Calculate density metric (links per node)
      const densityMetric = links.length / Math.max(1, nodes.length);
      
      // Count connected traits
      const connectedTraitIds = new Set<string>();
      links.forEach(link => {
        connectedTraitIds.add(link.source);
        connectedTraitIds.add(link.target);
      });
      
      return {
        nodes,
        links,
        clusters,
        metadata: {
          dimensions: { width: 800, height: 600 },
          densityMetric,
          connectedTraits: connectedTraitIds.size
        }
      };
    } catch (error) {
      logger.error('Error generating constellation data', { error });
      return {
        nodes: [],
        links: [],
        metadata: {
          dimensions: { width: 800, height: 600 },
          densityMetric: 0,
          connectedTraits: 0
        }
      };
    }
  }
  
  /**
   * Generate data for strength distribution visualization
   * @param traits List of traits to visualize
   * @param options Visualization options
   * @returns Strength distribution visualization data
   */
  static generateStrengthDistributionData(
    traits: Trait[],
    options?: {
      groupByCategory?: boolean;
      sortBy?: 'score' | 'name' | 'category';
      sortDirection?: 'asc' | 'desc';
      threshold?: number;
      includeCategories?: string[];
      excludeCategories?: string[];
    }
  ): {
    distributions: Array<{
      id: string;
      name: string;
      category: string;
      score: number;
      confidence: number;
      percentile?: number;
      rank?: number;
    }>;
    categoryAverages?: Record<string, number>;
    overallAverage: number;
    ranges: {
      high: number;
      medium: number;
      low: number;
    };
    metadata: {
      totalTraits: number;
      categoryCounts: Record<string, number>;
      maxScore: number;
      minScore: number;
    };
  } {
    try {
      // Default options
      const defaultOptions = {
        groupByCategory: true,
        sortBy: 'score' as const,
        sortDirection: 'desc' as const,
        threshold: 0
      };
      
      // Merge default with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Apply filters
      let filteredTraits = traits;
      
      // Filter by threshold
      if (mergedOptions.threshold > 0) {
        filteredTraits = filteredTraits.filter(t => t.score >= mergedOptions.threshold);
      }
      
      // Filter by categories
      if (mergedOptions.includeCategories && mergedOptions.includeCategories.length > 0) {
        filteredTraits = filteredTraits.filter(t => 
          mergedOptions.includeCategories!.includes(t.category)
        );
      }
      
      if (mergedOptions.excludeCategories && mergedOptions.excludeCategories.length > 0) {
        filteredTraits = filteredTraits.filter(t => 
          !mergedOptions.excludeCategories!.includes(t.category)
        );
      }
      
      // Calculate overall average score
      const overallAverage = filteredTraits.length > 0 
        ? filteredTraits.reduce((sum, t) => sum + t.score, 0) / filteredTraits.length
        : 0;
      
      // Calculate category averages if grouping by category
      let categoryAverages: Record<string, number> | undefined = undefined;
      
      if (mergedOptions.groupByCategory) {
        categoryAverages = {};
        const categoryTotals: Record<string, { sum: number; count: number }> = {};
        
        // Group traits by category and calculate totals
        filteredTraits.forEach(trait => {
          if (!categoryTotals[trait.category]) {
            categoryTotals[trait.category] = { sum: 0, count: 0 };
          }
          categoryTotals[trait.category].sum += trait.score;
          categoryTotals[trait.category].count++;
        });
        
        // Calculate averages
        Object.entries(categoryTotals).forEach(([category, data]) => {
          categoryAverages![category] = data.count > 0 ? data.sum / data.count : 0;
        });
      }
      
      // Sort traits
      const sortedTraits = [...filteredTraits].sort((a, b) => {
        let compareResult = 0;
        
        switch (mergedOptions.sortBy) {
          case 'score':
            compareResult = a.score - b.score;
            break;
          case 'name':
            compareResult = a.name.localeCompare(b.name);
            break;
          case 'category':
            compareResult = a.category.localeCompare(b.category) || a.score - b.score;
            break;
        }
        
        return mergedOptions.sortDirection === 'asc' ? compareResult : -compareResult;
      });
      
      // Create distribution objects
      const distributions = sortedTraits.map((trait, index, arr) => {
        // Calculate percentile (0-100)
        const count = arr.length;
        const rank = arr.filter(t => t.score < trait.score).length + 1;
        const percentile = Math.round((rank / count) * 100);
        
        return {
          id: trait.id,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          confidence: trait.confidence,
          percentile,
          rank
        };
      });
      
      // Calculate score ranges
      const scores = filteredTraits.map(t => t.score);
      const maxScore = Math.max(...scores, 0);
      const minScore = Math.min(...scores, 0);
      
      // Define score ranges (high, medium, low)
      const ranges = {
        high: 80,
        medium: 50,
        low: 20
      };
      
      // Count traits per category
      const categoryCounts: Record<string, number> = {};
      filteredTraits.forEach(trait => {
        categoryCounts[trait.category] = (categoryCounts[trait.category] || 0) + 1;
      });
      
      return {
        distributions,
        categoryAverages,
        overallAverage,
        ranges,
        metadata: {
          totalTraits: filteredTraits.length,
          categoryCounts,
          maxScore,
          minScore
        }
      };
    } catch (error) {
      logger.error('Error generating strength distribution data', { error });
      return {
        distributions: [],
        overallAverage: 0,
        ranges: {
          high: 80,
          medium: 50,
          low: 20
        },
        metadata: {
          totalTraits: 0,
          categoryCounts: {},
          maxScore: 0,
          minScore: 0
        }
      };
    }
  }
  
  /**
   * Generate data for trait comparison visualization
   * @param traits List of traits to visualize
   * @param benchmarks Benchmark data to compare against
   * @param options Visualization options
   * @returns Trait comparison visualization data
   */
  static generateTraitComparisonData(
    traits: Trait[],
    benchmarks: Array<{
      id: string;
      name: string;
      type: string;
      traits: Array<{
        name: string;
        score: number;
      }>;
    }>,
    options?: {
      highlightGaps?: boolean;
      gapThreshold?: number;
      includeCategories?: string[];
      groupByCategory?: boolean;
      limitTraits?: number;
    }
  ): {
    comparisons: Array<{
      traitName: string;
      category: string;
      userScore: number;
      benchmarkScores: Array<{
        benchmarkId: string;
        benchmarkName: string;
        score: number;
        gap: number;
        isSignificant: boolean;
      }>;
      averageGap: number;
    }>;
    benchmarkInfo: Array<{
      id: string;
      name: string;
      type: string;
      averageScore: number;
      matchPercentage: number;
    }>;
    categoryComparisons?: Array<{
      category: string;
      userAverage: number;
      benchmarkAverages: Array<{
        benchmarkId: string;
        average: number;
        gap: number;
      }>;
    }>;
    metadata: {
      gapThreshold: number;
      significantGaps: number;
      matchingTraits: number;
      missingTraits: number;
    };
  } {
    try {
      // Default options
      const defaultOptions = {
        highlightGaps: true,
        gapThreshold: 20,
        groupByCategory: true,
        limitTraits: 0 // 0 means no limit
      };
      
      // Merge default with provided options
      const mergedOptions = { ...defaultOptions, ...options };
      
      // Convert traits to a map for easy lookup
      const traitMap = new Map(traits.map(trait => [trait.name.toLowerCase(), trait]));
      
      // Find all unique trait names across user traits and all benchmarks
      const allTraitNames = new Set<string>();
      
      // Add user traits
      traits.forEach(trait => allTraitNames.add(trait.name.toLowerCase()));
      
      // Add benchmark traits
      benchmarks.forEach(benchmark => {
        benchmark.traits.forEach(trait => {
          allTraitNames.add(trait.name.toLowerCase());
        });
      });
      
      // Create comparisons for each trait
      let comparisons = Array.from(allTraitNames).map(traitNameLower => {
        const userTrait = traitMap.get(traitNameLower);
        const traitName = userTrait ? userTrait.name : 
          benchmarks.find(b => b.traits.some(t => t.name.toLowerCase() === traitNameLower))
            ?.traits.find(t => t.name.toLowerCase() === traitNameLower)?.name || traitNameLower;
        
        const userScore = userTrait ? userTrait.score : 0;
        const category = userTrait ? userTrait.category : 'unknown';
        
        // Calculate benchmark scores for this trait
        const benchmarkScores = benchmarks.map(benchmark => {
          const benchmarkTrait = benchmark.traits.find(
            t => t.name.toLowerCase() === traitNameLower
          );
          
          const benchmarkScore = benchmarkTrait ? benchmarkTrait.score : 0;
          const gap = userScore - benchmarkScore;
          const isSignificant = Math.abs(gap) >= mergedOptions.gapThreshold;
          
          return {
            benchmarkId: benchmark.id,
            benchmarkName: benchmark.name,
            score: benchmarkScore,
            gap,
            isSignificant
          };
        });
        
        // Calculate average gap across all benchmarks
        const gapSum = benchmarkScores.reduce((sum, b) => sum + b.gap, 0);
        const averageGap = benchmarkScores.length > 0 ? gapSum / benchmarkScores.length : 0;
        
        return {
          traitName,
          category,
          userScore,
          benchmarkScores,
          averageGap
        };
      });
      
      // Filter by categories if specified
      if (mergedOptions.includeCategories && mergedOptions.includeCategories.length > 0) {
        comparisons = comparisons.filter(c => 
          mergedOptions.includeCategories!.includes(c.category)
        );
      }
      
      // Limit number of traits if specified
      if (mergedOptions.limitTraits > 0 && comparisons.length > mergedOptions.limitTraits) {
        // Sort by absolute gap value (largest gaps first) and take top N
        comparisons = comparisons
          .sort((a, b) => Math.abs(b.averageGap) - Math.abs(a.averageGap))
          .slice(0, mergedOptions.limitTraits);
      }
      
      // Calculate benchmark information
      const benchmarkInfo = benchmarks.map(benchmark => {
        const benchmarkTraits = benchmark.traits;
        const benchmarkScoreSum = benchmarkTraits.reduce((sum, t) => sum + t.score, 0);
        const averageScore = benchmarkTraits.length > 0 ? benchmarkScoreSum / benchmarkTraits.length : 0;
        
        // Calculate match percentage (percentage of user traits that are also in benchmark)
        const matchingTraits = benchmarkTraits.filter(bt => 
          traits.some(ut => ut.name.toLowerCase() === bt.name.toLowerCase())
        ).length;
        
        const matchPercentage = Math.round((matchingTraits / Math.max(1, benchmarkTraits.length)) * 100);
        
        return {
          id: benchmark.id,
          name: benchmark.name,
          type: benchmark.type,
          averageScore,
          matchPercentage
        };
      });
      
      // Generate category comparisons if needed
      let categoryComparisons: Array<{
        category: string;
        userAverage: number;
        benchmarkAverages: Array<{
          benchmarkId: string;
          average: number;
          gap: number;
        }>;
      }> | undefined = undefined;
      
      if (mergedOptions.groupByCategory) {
        // Group traits by category
        const categories = new Set(traits.map(t => t.category));
        
        categoryComparisons = Array.from(categories).map(category => {
          // Calculate user average for this category
          const categoryTraits = traits.filter(t => t.category === category);
          const userAverage = categoryTraits.length > 0
            ? categoryTraits.reduce((sum, t) => sum + t.score, 0) / categoryTraits.length
            : 0;
          
          // Calculate benchmark averages for this category
          const benchmarkAverages = benchmarks.map(benchmark => {
            // Find benchmark traits that match user traits in this category
            const matchingTraits = categoryTraits
              .map(ut => benchmark.traits.find(bt => bt.name.toLowerCase() === ut.name.toLowerCase()))
              .filter(bt => bt !== undefined) as Array<{ name: string; score: number }>;
              
            const benchmarkAverage = matchingTraits.length > 0
              ? matchingTraits.reduce((sum, t) => sum + t.score, 0) / matchingTraits.length
              : 0;
              
            return {
              benchmarkId: benchmark.id,
              average: benchmarkAverage,
              gap: userAverage - benchmarkAverage
            };
          });
          
          return {
            category,
            userAverage,
            benchmarkAverages
          };
        });
      }
      
      // Calculate metadata
      const significantGaps = comparisons.reduce(
        (count, c) => count + c.benchmarkScores.filter(b => b.isSignificant).length,
        0
      );
      
      const matchingTraits = traits.filter(ut => 
        benchmarks.some(b => b.traits.some(bt => bt.name.toLowerCase() === ut.name.toLowerCase()))
      ).length;
      
      const missingTraits = allTraitNames.size - matchingTraits;
      
      return {
        comparisons,
        benchmarkInfo,
        categoryComparisons,
        metadata: {
          gapThreshold: mergedOptions.gapThreshold,
          significantGaps,
          matchingTraits,
          missingTraits
        }
      };
    } catch (error) {
      logger.error('Error generating trait comparison data', { error });
      return {
        comparisons: [],
        benchmarkInfo: [],
        metadata: {
          gapThreshold: 20,
          significantGaps: 0,
          matchingTraits: 0,
          missingTraits: 0
        }
      };
    }
  }
  
  /**
   * Generate data for context-adapted visualization
   * @param traits List of traits to visualize
   * @param context Context information for adaptation
   * @returns Context-adapted visualization data
   */
  static generateContextAdaptedData(
    traits: Trait[],
    context: {
      type: 'role' | 'industry' | 'project' | 'team' | 'audience';
      value: string;
      requirements?: Array<{
        name: string;
        importance: number;
      }>;
      emphasisCategories?: string[];
    }
  ): {
    adaptedTraits: Array<{
      id: string;
      name: string;
      category: string;
      score: number;
      contextualRelevance: number;
      emphasis: number;
      gap?: number;
    }>;
    contextSummary: {
      type: string;
      value: string;
      matchScore: number;
      keyStrengths: string[];
      developmentAreas: string[];
    };
    visualization: {
      primaryTraits: string[];
      secondaryTraits: string[];
      backgroundTraits: string[];
      layout: 'focus' | 'balanced' | 'comprehensive';
    };
    insights: string[];
  } {
    try {
      // Get contextual requirements
      const requirements = context.requirements || [];
      
      // Create a map of required trait names to importance
      const requirementMap = new Map<string, number>();
      requirements.forEach(req => {
        requirementMap.set(req.name.toLowerCase(), req.importance);
      });
      
      // Calculate contextual relevance for each trait
      const adaptedTraits = traits.map(trait => {
        const traitName = trait.name.toLowerCase();
        
        // Calculate contextual relevance
        let contextualRelevance = 50; // Default middle relevance
        
        // If trait is explicitly required, use its importance
        if (requirementMap.has(traitName)) {
          contextualRelevance = requirementMap.get(traitName)!;
        } else {
          // Otherwise try to infer relevance based on category emphasis
          if (context.emphasisCategories && context.emphasisCategories.includes(trait.category)) {
            contextualRelevance = 80; // Higher relevance for emphasized categories
          }
        }
        
        // Calculate emphasis level (combines score and relevance)
        const emphasis = Math.round((trait.score * 0.6) + (contextualRelevance * 0.4));
        
        // Calculate gap if requirement exists
        const gap = requirementMap.has(traitName) 
          ? trait.score - contextualRelevance
          : undefined;
        
        return {
          id: trait.id,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          contextualRelevance,
          emphasis,
          gap
        };
      });
      
      // Sort by emphasis (higher first)
      const sortedTraits = [...adaptedTraits].sort((a, b) => b.emphasis - a.emphasis);
      
      // Calculate overall match score
      let matchScore = 0;
      let totalImportance = 0;
      
      // Sum weighted scores for matching requirements
      requirements.forEach(req => {
        const matchingTrait = traits.find(t => t.name.toLowerCase() === req.name.toLowerCase());
        if (matchingTrait) {
          matchScore += (matchingTrait.score / 100) * req.importance;
        }
        totalImportance += req.importance;
      });
      
      // Normalize match score
      matchScore = totalImportance > 0 
        ? Math.round((matchScore / totalImportance) * 100)
        : 75; // Default to 75% if no requirements
      
      // Identify key strengths and development areas
      const keyStrengths = sortedTraits
        .filter(t => t.score >= 75 && t.contextualRelevance >= 70)
        .map(t => t.name);
      
      const developmentAreas = sortedTraits
        .filter(t => t.score < 60 && t.contextualRelevance >= 70)
        .map(t => t.name);
      
      // Create visualization categories
      // Primary traits are high emphasis
      const primaryTraits = sortedTraits
        .filter(t => t.emphasis >= 80)
        .map(t => t.name);
      
      // Secondary traits are medium emphasis
      const secondaryTraits = sortedTraits
        .filter(t => t.emphasis >= 60 && t.emphasis < 80)
        .map(t => t.name);
      
      // Background traits are lower emphasis
      const backgroundTraits = sortedTraits
        .filter(t => t.emphasis < 60)
        .map(t => t.name);
      
      // Determine overall layout approach
      let layout: 'focus' | 'balanced' | 'comprehensive';
      
      if (primaryTraits.length <= 5) {
        layout = 'focus';
      } else if (primaryTraits.length > 12) {
        layout = 'comprehensive';
      } else {
        layout = 'balanced';
      }
      
      // Generate contextual insights
      const insights: string[] = [];
      
      // Add match insights
      if (matchScore >= 85) {
        insights.push(`Your profile shows excellent alignment with ${context.type} "${context.value}".`);
      } else if (matchScore >= 70) {
        insights.push(`Your profile shows good overall alignment with ${context.type} "${context.value}".`);
      } else if (matchScore >= 50) {
        insights.push(`Your profile shows moderate alignment with ${context.type} "${context.value}".`);
      } else {
        insights.push(`Your profile may need development for optimal alignment with ${context.type} "${context.value}".`);
      }
      
      // Add strength insights
      if (keyStrengths.length > 0) {
        if (keyStrengths.length <= 3) {
          insights.push(`Key strengths for this context: ${keyStrengths.join(', ')}.`);
        } else {
          insights.push(`You have ${keyStrengths.length} strong traits relevant to this context.`);
        }
      }
      
      // Add development insights
      if (developmentAreas.length > 0) {
        if (developmentAreas.length <= 3) {
          insights.push(`Consider developing: ${developmentAreas.join(', ')}.`);
        } else {
          insights.push(`There are ${developmentAreas.length} areas that could benefit from focused development.`);
        }
      }
      
      return {
        adaptedTraits,
        contextSummary: {
          type: context.type,
          value: context.value,
          matchScore,
          keyStrengths,
          developmentAreas
        },
        visualization: {
          primaryTraits,
          secondaryTraits,
          backgroundTraits,
          layout
        },
        insights
      };
    } catch (error) {
      logger.error('Error generating context-adapted data', { error, context });
      return {
        adaptedTraits: [],
        contextSummary: {
          type: context.type,
          value: context.value,
          matchScore: 0,
          keyStrengths: [],
          developmentAreas: []
        },
        visualization: {
          primaryTraits: [],
          secondaryTraits: [],
          backgroundTraits: [],
          layout: 'balanced'
        },
        insights: ['Unable to generate context-adapted visualization.']
      };
    }
  }
  
  /**
   * Format category name for display
   * @param category Category name to format
   * @returns Formatted category name
   */
  private static formatCategoryName(category: string): string {
    return category
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  /**
   * Generate an array of distinct colors
   * @param count Number of colors needed
   * @returns Array of hex color codes
   */
  private static generateColorPalette(count: number): string[] {
    // Define a base set of colors that work well together
    const baseColors = [
      '#4285F4', // Blue
      '#EA4335', // Red
      '#FBBC05', // Yellow
      '#34A853', // Green
      '#8E24AA', // Purple
      '#F06292', // Pink
      '#00ACC1', // Cyan
      '#FB8C00', // Orange
      '#607D8B', // Blue Grey
      '#0F9D58', // Dark Green
    ];
    
    // If we need fewer colors than base set, return a subset
    if (count <= baseColors.length) {
      return baseColors.slice(0, count);
    }
    
    // If we need more colors, generate variations of the base colors
    const result = [...baseColors];
    let currentIndex = 0;
    
    while (result.length < count) {
      const baseColor = baseColors[currentIndex % baseColors.length];
      // Create a slightly modified version of the base color
      const variation = this.adjustColorBrightness(
        baseColor,
        (result.length % 2 === 0) ? 20 : -20
      );
      result.push(variation);
      currentIndex++;
    }
    
    return result;
  }
  
  /**
   * Adjust the brightness of a hex color
   * @param hex Hex color code
   * @param percent Percent to adjust (-100 to 100)
   * @returns Adjusted hex color
   */
  private static adjustColorBrightness(hex: string, percent: number): string {
    // Convert hex to RGB
    let r = parseInt(hex.substring(1, 3), 16);
    let g = parseInt(hex.substring(3, 5), 16);
    let b = parseInt(hex.substring(5, 7), 16);
    
    // Adjust brightness
    r = Math.min(255, Math.max(0, r + Math.round(r * percent / 100)));
    g = Math.min(255, Math.max(0, g + Math.round(g * percent / 100)));
    b = Math.min(255, Math.max(0, b + Math.round(b * percent / 100)));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

export default TraitVisualizationUtils;