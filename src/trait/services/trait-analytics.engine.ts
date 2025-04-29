import logger from '../../logger';
import { Trait, TraitRelationship, TraitCluster, MetaCluster } from '../models/trait.model';

/**
 * Engine for trait relationship and clustering analysis
 * Analyzes trait correlations, patterns, and clusters
 */
export class TraitAnalyticsEngine {
  /**
   * Calculate correlation between two traits using a sophisticated multi-factor approach
   * This implements a more nuanced analysis of trait relationships based on:
   * - Score proximity
   * - Category relationships (same, complementary, or contrasting)
   * - Assessment method consistency
   * - Assessment timing proximity
   */
  calculateTraitCorrelation(trait1: Trait, trait2: Trait): number {
    try {
      // Score proximity factor (inverse of difference)
      const scoreDifference = Math.abs(trait1.score - trait2.score) / 100;
      const scoreProximityFactor = 1 - scoreDifference;
      
      // Category relationship factor
      // Enhanced to recognize hierarchical relationships between categories
      const categoryRelationships: Record<string, Record<string, number>> = {
        'Cognitive': { 'Cognitive': 0.8, 'Execution': 0.4, 'Relationship': 0.2, 'Self-Management': 0.3, 'Motivation': 0.3 },
        'Execution': { 'Cognitive': 0.4, 'Execution': 0.7, 'Relationship': 0.5, 'Self-Management': 0.6, 'Motivation': 0.5 },
        'Relationship': { 'Cognitive': 0.2, 'Execution': 0.5, 'Relationship': 0.8, 'Self-Management': 0.4, 'Motivation': 0.4 },
        'Self-Management': { 'Cognitive': 0.3, 'Execution': 0.6, 'Relationship': 0.4, 'Self-Management': 0.8, 'Motivation': 0.7 },
        'Motivation': { 'Cognitive': 0.3, 'Execution': 0.5, 'Relationship': 0.4, 'Self-Management': 0.7, 'Motivation': 0.8 }
      };
      
      const categoryWeight = categoryRelationships[trait1.category]?.[trait2.category] || 0.1;
      
      // Assessment method consistency factor
      const methodConsistencyFactor = trait1.assessmentMethod === trait2.assessmentMethod ? 0.2 : 0;
      
      // Assessment timing proximity factor
      const timeDifference = Math.abs(trait1.assessmentDate.getTime() - trait2.assessmentDate.getTime());
      const daysDifference = timeDifference / (1000 * 60 * 60 * 24);
      const timingProximityFactor = Math.max(0, 0.1 - (daysDifference / 365)); // Higher for traits assessed close together
      
      // Pre-defined trait relationships based on research
      const knownRelationships: Record<string, Record<string, number>> = {
        'Leadership': { 'Communication': 0.7, 'Strategic Thinking': 0.6, 'Problem Solving': 0.5, 'Initiative': 0.5 },
        'Analytical Thinking': { 'Problem Solving': 0.8, 'Systems Thinking': 0.7, 'Strategic Thinking': 0.6 },
        'Communication': { 'Collaboration': 0.7, 'Leadership': 0.6 },
        'Initiative': { 'Adaptability': 0.5, 'Resilience': 0.4, 'Leadership': 0.5 },
        'Resilience': { 'Adaptability': 0.6, 'Problem Solving': 0.5 },
        'Creative Thinking': { 'Problem Solving': 0.6, 'Innovation': 0.8, 'Adaptability': 0.5 }
      };
      
      // Apply known relationship factor if defined
      let knownRelationshipFactor = 0;
      if (knownRelationships[trait1.name]?.[trait2.name]) {
        knownRelationshipFactor = knownRelationships[trait1.name][trait2.name];
      } else if (knownRelationships[trait2.name]?.[trait1.name]) {
        knownRelationshipFactor = knownRelationships[trait2.name][trait1.name];
      }
      
      // Combine all factors with appropriate weights
      const correlation = 
        (scoreProximityFactor * 0.35) +
        (categoryWeight * 0.25) +
        (methodConsistencyFactor * 0.10) +
        (timingProximityFactor * 0.05) +
        (knownRelationshipFactor * 0.25);
        
      // Normalize to range [-1, 1] where negative values indicate inverse relationships
      return correlation * 2 - 1;
    } catch (error) {
      logger.error('Error calculating trait correlation', { error, trait1: trait1.name, trait2: trait2.name });
      return 0; // Default to no correlation on error
    }
  }

  /**
   * Analyze trait relationships for a profile's traits
   * Returns detailed relationship information with correlation metrics
   */
  analyzeTraitRelationships(traits: Trait[]): {
    relationships: TraitRelationship[];
    clusters: any;
  } {
    try {
      if (!traits || traits.length < 2) {
        return { relationships: [], clusters: { categoryClusters: [], metaClusters: [] } };
      }
      
      const relationships: TraitRelationship[] = [];
      
      // Calculate correlations between traits
      for (let i = 0; i < traits.length; i++) {
        for (let j = i + 1; j < traits.length; j++) {
          // Calculate correlation using enhanced method with multiple factors
          const correlation = this.calculateTraitCorrelation(traits[i], traits[j]);
          
          // Include correlations above significance threshold
          if (Math.abs(correlation) > 0.2) { // Lowered threshold to capture more meaningful relationships
            relationships.push({
              trait1: {
                name: traits[i].name,
                category: traits[i].category
              },
              trait2: {
                name: traits[j].name,
                category: traits[j].category
              },
              correlation,
              strength: this.determineCorrelationStrength(correlation),
              direction: this.determineCorrelationDirection(correlation)
            });
          }
        }
      }
      
      // Cluster traits
      const clusters = this.clusterTraits(traits);
      
      return {
        relationships,
        clusters
      };
    } catch (error) {
      logger.error('Error analyzing trait relationships', { error });
      return { relationships: [], clusters: { categoryClusters: [], metaClusters: [] } };
    }
  }

  /**
   * Determine the strength of a correlation
   */
  private determineCorrelationStrength(correlation: number): 'strong' | 'moderate' | 'weak' {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) return 'strong';
    if (absCorr >= 0.4) return 'moderate';
    return 'weak';
  }

  /**
   * Determine the direction of a correlation
   */
  private determineCorrelationDirection(correlation: number): 'positive' | 'negative' | 'neutral' {
    if (correlation > 0.1) return 'positive';
    if (correlation < -0.1) return 'negative';
    return 'neutral';
  }

  /**
   * Cluster traits using hierarchical clustering algorithm
   * Implements a more sophisticated clustering approach that:
   * - Groups traits by statistical similarity rather than just category
   * - Identifies subclusters within categories
   * - Provides richer metadata about clusters
   */
  clusterTraits(traits: Trait[]): {
    categoryClusters: TraitCluster[];
    metaClusters: MetaCluster[];
  } {
    try {
      if (traits.length === 0) return { categoryClusters: [], metaClusters: [] };
      
      // First, create category-based clusters
      const categories = [...new Set(traits.map(t => t.category))];
      
      const categoryClusters: TraitCluster[] = categories.map(category => {
        const categoryTraits = traits.filter(t => t.category === category);
        const avgScore = categoryTraits.reduce((sum, t) => sum + t.score, 0) / categoryTraits.length;
        
        // Find subclusters within categories based on score similarity
        const subclusters = this.identifySubclusters(categoryTraits);
        
        // Identify traits that have strong connections to other categories
        const crossCategoryTraits = categoryTraits.filter(trait => {
          const otherCategories = categories.filter(c => c !== category);
          for (const otherCategory of otherCategories) {
            const otherTraits = traits.filter(t => t.category === otherCategory);
            for (const otherTrait of otherTraits) {
              const correlation = this.calculateTraitCorrelation(trait, otherTrait);
              if (correlation > 0.6) return true; // Strong cross-category connection
            }
          }
          return false;
        });
        
        return {
          category,
          traits: categoryTraits.map(t => t.name),
          traitObjects: categoryTraits.map(t => ({
            name: t.name,
            score: t.score,
            assessmentMethod: t.assessmentMethod
          })),
          averageScore: avgScore,
          topTrait: categoryTraits.sort((a, b) => b.score - a.score)[0].name,
          bottomTrait: categoryTraits.sort((a, b) => a.score - b.score)[0].name,
          scoreRange: {
            min: Math.min(...categoryTraits.map(t => t.score)),
            max: Math.max(...categoryTraits.map(t => t.score))
          },
          subclusters,
          crossCategoryConnections: crossCategoryTraits.map(t => t.name),
          traitCount: categoryTraits.length
        };
      });
      
      // Identify meta-clusters that span categories
      const metaClusters = this.identifyMetaClusters(traits);
      
      return {
        categoryClusters,
        metaClusters
      };
    } catch (error) {
      logger.error('Error clustering traits', { error });
      return { categoryClusters: [], metaClusters: [] };
    }
  }
  
  /**
   * Identify subclusters within a category based on trait similarities
   */
  private identifySubclusters(traits: Trait[]): Array<{
    traits: string[];
    coherence: number;
  }> {
    try {
      if (traits.length < 3) return []; // Need at least 3 traits to form meaningful subclusters
      
      // Calculate similarity matrix
      const similarityMatrix: number[][] = [];
      for (let i = 0; i < traits.length; i++) {
        similarityMatrix[i] = [];
        for (let j = 0; j < traits.length; j++) {
          if (i === j) {
            similarityMatrix[i][j] = 1; // Same trait
          } else {
            similarityMatrix[i][j] = this.calculateTraitCorrelation(traits[i], traits[j]);
          }
        }
      }
      
      // Simple agglomerative clustering
      const clusters: { traits: string[], coherence: number }[] = [];
      const clusterThreshold = 0.5; // Minimum similarity to form a cluster
      
      // Start with each trait in its own cluster
      const assigned = new Set<number>();
      
      for (let i = 0; i < traits.length; i++) {
        if (assigned.has(i)) continue;
        
        const cluster = [i];
        assigned.add(i);
        
        // Find similar traits
        for (let j = 0; j < traits.length; j++) {
          if (i !== j && !assigned.has(j) && similarityMatrix[i][j] >= clusterThreshold) {
            cluster.push(j);
            assigned.add(j);
          }
        }
        
        if (cluster.length > 1) { // Only consider as subcluster if it has at least 2 traits
          // Calculate cluster coherence (average similarity within cluster)
          let totalSimilarity = 0;
          let pairCount = 0;
          
          for (let a = 0; a < cluster.length; a++) {
            for (let b = a + 1; b < cluster.length; b++) {
              totalSimilarity += similarityMatrix[cluster[a]][cluster[b]];
              pairCount++;
            }
          }
          
          const coherence = pairCount > 0 ? totalSimilarity / pairCount : 0;
          
          clusters.push({
            traits: cluster.map(idx => traits[idx].name),
            coherence
          });
        }
      }
      
      return clusters;
    } catch (error) {
      logger.error('Error identifying subclusters', { error });
      return [];
    }
  }
  
  /**
   * Identify meta-clusters that span categories
   */
  private identifyMetaClusters(traits: Trait[]): MetaCluster[] {
    try {
      if (traits.length < 5) return []; // Need enough traits for meaningful meta-clusters
      
      // Define known meta-clusters based on research
      const metaClusterDefinitions = [
        {
          name: 'Leadership Competency',
          keyTraits: ['Leadership', 'Strategic Thinking', 'Communication', 'Initiative'],
          requiredMinimum: 2 // Need at least this many key traits to form cluster
        },
        {
          name: 'Innovation Profile',
          keyTraits: ['Creative Thinking', 'Problem Solving', 'Adaptability', 'Systems Thinking'],
          requiredMinimum: 2
        },
        {
          name: 'Resilience Indicators',
          keyTraits: ['Resilience', 'Adaptability', 'Problem Solving', 'Efficiency'],
          requiredMinimum: 2
        },
        {
          name: 'Strategic Execution',
          keyTraits: ['Strategic Thinking', 'Efficiency', 'Initiative', 'Analytical Thinking'],
          requiredMinimum: 2
        },
        {
          name: 'Team Effectiveness',
          keyTraits: ['Communication', 'Collaboration', 'Leadership', 'Adaptability'],
          requiredMinimum: 2
        }
      ];
      
      // Find which meta-clusters are present based on trait names
      const traitNames = traits.map(t => t.name);
      
      return metaClusterDefinitions
        .map(definition => {
          const presentKeyTraits = definition.keyTraits.filter(trait => 
            traitNames.includes(trait)
          );
          
          if (presentKeyTraits.length >= definition.requiredMinimum) {
            // Calculate average score of traits in this meta-cluster
            const clusterTraits = traits.filter(t => presentKeyTraits.includes(t.name));
            const avgScore = clusterTraits.reduce((sum, t) => sum + t.score, 0) / clusterTraits.length;
            
            return {
              name: definition.name,
              traits: presentKeyTraits,
              averageScore: avgScore,
              completeness: presentKeyTraits.length / definition.keyTraits.length
            };
          }
          return null;
        })
        .filter((cluster): cluster is MetaCluster => cluster !== null);
    } catch (error) {
      logger.error('Error identifying meta-clusters', { error });
      return [];
    }
  }
}