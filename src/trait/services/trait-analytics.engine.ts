/**
 * Trait Analytics Engine
 * 
 * This service provides advanced analytics for traits, including:
 * - Relationship analysis between traits
 * - Trait clustering algorithms
 * - Pattern detection in trait data
 * - Trait significance analysis
 * - Comparative trait analytics
 */

import logger from '../../utils/logger';
import { Trait, TraitRelationship, TraitCluster, MetaCluster } from '../models/trait.model';

/**
 * Trait Analytics Engine class
 * Provides advanced analytics capabilities for trait data
 */
export class TraitAnalyticsEngine {
  private static readonly CORRELATION_THRESHOLD = 0.6;
  private static readonly CLUSTER_SIMILARITY_THRESHOLD = 0.7;
  private static readonly SIGNIFICANT_TRAIT_THRESHOLD = 80;
  
  /**
   * Analyze relationships between traits
   * Identifies correlations, complementary traits, and conflicting traits
   * 
   * @param traits - Array of traits to analyze
   * @returns Array of trait relationships
   */
  public analyzeTraitRelationships(traits: Trait[]): TraitRelationship[] {
    try {
      const relationships: TraitRelationship[] = [];
      
      // For each pair of traits, analyze their relationship
      for (let i = 0; i < traits.length; i++) {
        for (let j = i + 1; j < traits.length; j++) {
          const trait1 = traits[i];
          const trait2 = traits[j];
          
          // Skip if traits are in different categories (optional, depends on requirements)
          // if (trait1.category !== trait2.category) continue;
          
          // Calculate relationship strength based on trait data
          const relationshipType = this.determineRelationshipType(trait1, trait2);
          const strength = this.calculateRelationshipStrength(trait1, trait2, relationshipType);
          
          // Only include meaningful relationships
          if (strength > TraitAnalyticsEngine.CORRELATION_THRESHOLD) {
            relationships.push({
              id: `rel_${trait1.id}_${trait2.id}`,
              profileId: trait1.profileId,
              traitId1: trait1.id,
              traitId2: trait2.id,
              trait1, // Linked trait object for convenience
              trait2, // Linked trait object for convenience
              type: relationshipType,
              strength,
              description: this.generateRelationshipDescription(trait1, trait2, relationshipType, strength),
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      return relationships;
    } catch (error) {
      logger.error('Error analyzing trait relationships', { error });
      return [];
    }
  }

  /**
   * Identify trait clusters based on relationships and similarity
   * 
   * @param traits - Array of traits
   * @param relationships - Array of trait relationships
   * @returns Array of trait clusters
   */
  public identifyTraitClusters(traits: Trait[], relationships: TraitRelationship[]): TraitCluster[] {
    try {
      // Implementation of clustering algorithm
      // This is a simplified approach - production code might use more sophisticated algorithms
      
      const visitedTraits = new Set<string>();
      const clusters: TraitCluster[] = [];
      
      // Find clusters based on relationship network
      for (const trait of traits) {
        if (visitedTraits.has(trait.id)) continue;
        
        const clusterTraits = this.findConnectedTraits(trait, traits, relationships);
        const clusterTraitIds = clusterTraits.map(t => t.id);
        
        // Mark all these traits as visited
        clusterTraits.forEach(t => visitedTraits.add(t.id));
        
        // Only create clusters with at least 2 traits
        if (clusterTraits.length >= 2) {
          const category = this.identifyDominantCategory(clusterTraits);
          
          clusters.push({
            id: `cluster_${cluster.length + 1}`,
            name: this.generateClusterName(clusterTraits, category),
            category, // Dominant category
            description: this.generateClusterDescription(clusterTraits, category),
            traits: clusterTraits.map(t => ({
              id: t.id,
              name: t.name, // Include name for convenience
              weight: this.calculateTraitWeightInCluster(t, clusterTraits, relationships)
            })),
            centrality: this.calculateClusterCentrality(clusterTraits, relationships),
            metadata: {
              averageScore: this.calculateAverageScore(clusterTraits),
              cohesion: this.calculateClusterCohesion(clusterTraits, relationships)
            }
          });
        }
      }
      
      return clusters;
    } catch (error) {
      logger.error('Error identifying trait clusters', { error });
      return [];
    }
  }

  /**
   * Group related clusters into meta-clusters
   * 
   * @param clusters Array of trait clusters
   * @param traits Array of all traits
   * @returns Array of meta-clusters
   */
  public identifyMetaClusters(clusters: TraitCluster[], traits: Trait[]): MetaCluster[] {
    try {
      // Implementation of meta-clustering algorithm
      // Simplified approach for demonstration
      
      const metaClusters: MetaCluster[] = [];
      const clusterCategories = new Map<string, TraitCluster[]>();
      
      // Group clusters by category
      for (const cluster of clusters) {
        const category = cluster.category;
        if (!clusterCategories.has(category)) {
          clusterCategories.set(category, []);
        }
        clusterCategories.get(category)!.push(cluster);
      }
      
      // Create meta-clusters from category groups
      Array.from(clusterCategories.entries()).forEach(([category, categoryClusters]) => {
        const relevantTraits = this.identifyKeyTraitsForMetaCluster(categoryClusters, traits);
        
        metaClusters.push({
          id: `meta_${metaClusters.length + 1}`,
          name: this.generateMetaClusterName(category, categoryClusters),
          description: this.generateMetaClusterDescription(category, categoryClusters),
          clusters: categoryClusters.map(c => c.id),
          traits: relevantTraits.map(t => ({
            id: t.id,
            relevance: this.calculateTraitRelevanceInMetaCluster(t, categoryClusters)
          })),
          metadata: {
            strength: this.calculateMetaClusterStrength(categoryClusters),
            significance: this.calculateMetaClusterSignificance(categoryClusters, traits)
          }
        });
      });
      
      return metaClusters;
    } catch (error) {
      logger.error('Error identifying meta-clusters', { error });
      return [];
    }
  }

  /**
   * Analyze comparative trait data against benchmarks or other profiles
   * 
   * @param traits Array of traits to analyze
   * @param benchmarkTraits Array of benchmark traits for comparison
   * @returns Comparative analysis results
   */
  public analyzeComparativeTraitData(
    traits: Trait[], 
    benchmarkTraits: { name: string; score: number; importance: number; }[]
  ): Array<{
    traitName: string;
    userScore: number;
    benchmarkScore: number;
    gap: number;
    significance: number;
  }> {
    try {
      const results = [];
      
      // Create maps for efficient lookup
      const traitMap = new Map<string, Trait>();
      traits.forEach(t => traitMap.set(t.name.toLowerCase(), t));
      
      const benchmarkMap = new Map<string, { score: number; importance: number; }>();
      benchmarkTraits.forEach(b => benchmarkMap.set(b.name.toLowerCase(), b));
      
      // Analyze each trait that exists in both sets
      for (const [name, trait] of traitMap.entries()) {
        const benchmark = benchmarkMap.get(name);
        if (benchmark) {
          const gap = trait.score - benchmark.score;
          
          results.push({
            traitName: trait.name,
            userScore: trait.score,
            benchmarkScore: benchmark.score,
            gap,
            significance: benchmark.importance
          });
        }
      }
      
      // Sort by significance (most significant first)
      return results.sort((a, b) => b.significance - a.significance);
    } catch (error) {
      logger.error('Error analyzing comparative trait data', { error });
      return [];
    }
  }

  /**
   * Find traits that need attention based on analysis
   * 
   * @param traits Array of traits
   * @param relationships Array of trait relationships
   * @returns Array of traits needing attention with reasons
   */
  public identifyTraitsNeedingAttention(
    traits: Trait[],
    relationships: TraitRelationship[]
  ): Array<{
    trait: Trait;
    reason: string;
    priority: number;
  }> {
    try {
      const results = [];
      
      // Find low-scoring traits with high confidence
      for (const trait of traits) {
        if (trait.score < 50 && trait.confidence > 70) {
          results.push({
            trait,
            reason: `Low score (${trait.score}) with high assessment confidence`,
            priority: this.calculateAttentionPriority(trait, relationships)
          });
        }
      }
      
      // Find traits with conflicting relationships
      for (const relationship of relationships) {
        if (relationship.type === 'conflicting' && relationship.strength > 0.8) {
          const trait1 = traits.find(t => t.id === relationship.traitId1);
          const trait2 = traits.find(t => t.id === relationship.traitId2);
          
          if (trait1 && trait2) {
            // Lower scoring trait needs more attention
            const lowerScoringTrait = trait1.score < trait2.score ? trait1 : trait2;
            
            results.push({
              trait: lowerScoringTrait,
              reason: `Strong conflict with ${
                lowerScoringTrait.id === trait1.id ? trait2.name : trait1.name
              }`,
              priority: this.calculateAttentionPriority(lowerScoringTrait, relationships)
            });
          }
        }
      }
      
      // Sort by priority (highest first)
      return results.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Error identifying traits needing attention', { error });
      return [];
    }
  }

  // Helper methods

  private determineRelationshipType(
    trait1: Trait, 
    trait2: Trait
  ): 'complementary' | 'reinforcing' | 'conflicting' {
    // Simplified logic - in a real system this would be more sophisticated
    // using data science techniques, domain knowledge, or pre-defined matrices
    
    // Traits in same category tend to be reinforcing
    if (trait1.category === trait2.category) {
      return 'reinforcing';
    }
    
    // Some pre-defined complementary pairs (simplified example)
    const complementaryPairs = [
      ['analytical', 'creative'],
      ['leadership', 'empathy'],
      ['technical', 'communication'],
      ['detail', 'big picture'],
      ['execution', 'planning']
    ];
    
    for (const [trait1Name, trait2Name] of complementaryPairs) {
      if (
        (trait1.name.toLowerCase().includes(trait1Name) && 
         trait2.name.toLowerCase().includes(trait2Name)) ||
        (trait1.name.toLowerCase().includes(trait2Name) && 
         trait2.name.toLowerCase().includes(trait1Name))
      ) {
        return 'complementary';
      }
    }
    
    // Some pre-defined conflicting pairs (simplified example)
    const conflictingPairs = [
      ['risk-taking', 'caution'],
      ['independent', 'collaborative'],
      ['specialized', 'generalist'],
      ['analytical', 'intuitive']
    ];
    
    for (const [trait1Name, trait2Name] of conflictingPairs) {
      if (
        (trait1.name.toLowerCase().includes(trait1Name) && 
         trait2.name.toLowerCase().includes(trait2Name)) ||
        (trait1.name.toLowerCase().includes(trait2Name) && 
         trait2.name.toLowerCase().includes(trait1Name))
      ) {
        return 'conflicting';
      }
    }
    
    // Default to complementary if nothing else matches
    return 'complementary';
  }

  private calculateRelationshipStrength(
    trait1: Trait,
    trait2: Trait,
    relationshipType: 'complementary' | 'reinforcing' | 'conflicting'
  ): number {
    // Base strength influenced by scores
    let strength = 0.5;
    
    // Higher scores on both traits strengthen the relationship
    if (trait1.score > 70 && trait2.score > 70) {
      strength += 0.2;
    }
    
    // Same category traits have stronger relationships
    if (trait1.category === trait2.category) {
      strength += 0.15;
    }
    
    // Higher confidence in assessments increases strength
    if (trait1.confidence > 80 && trait2.confidence > 80) {
      strength += 0.1;
    }
    
    // Normalize to range [0, 1]
    return Math.min(1, Math.max(0, strength));
  }

  private generateRelationshipDescription(
    trait1: Trait,
    trait2: Trait,
    type: 'complementary' | 'reinforcing' | 'conflicting',
    strength: number
  ): string {
    switch (type) {
      case 'complementary':
        return `${trait1.name} and ${trait2.name} complement each other, creating a balanced skill set.`;
      case 'reinforcing':
        return `${trait1.name} and ${trait2.name} reinforce each other, creating a compounding effect.`;
      case 'conflicting':
        return `${trait1.name} and ${trait2.name} may create tension when applied simultaneously.`;
      default:
        return `${trait1.name} and ${trait2.name} have a relationship with strength ${Math.round(strength * 100)}%.`;
    }
  }

  private findConnectedTraits(
    startTrait: Trait,
    allTraits: Trait[],
    relationships: TraitRelationship[]
  ): Trait[] {
    const visited = new Set<string>();
    const connected: Trait[] = [startTrait];
    visited.add(startTrait.id);
    
    const queue = [startTrait.id];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      
      // Find relationships involving this trait
      for (const rel of relationships) {
        let otherTraitId: string | null = null;
        
        if (rel.traitId1 === currentId) {
          otherTraitId = rel.traitId2;
        } else if (rel.traitId2 === currentId) {
          otherTraitId = rel.traitId1;
        }
        
        if (otherTraitId && !visited.has(otherTraitId) && 
            rel.type !== 'conflicting' && rel.strength >= TraitAnalyticsEngine.CORRELATION_THRESHOLD) {
          visited.add(otherTraitId);
          const otherTrait = allTraits.find(t => t.id === otherTraitId);
          if (otherTrait) {
            connected.push(otherTrait);
            queue.push(otherTraitId);
          }
        }
      }
    }
    
    return connected;
  }

  private identifyDominantCategory(traits: Trait[]): string {
    const categoryCount = new Map<string, number>();
    
    for (const trait of traits) {
      const count = categoryCount.get(trait.category) || 0;
      categoryCount.set(trait.category, count + 1);
    }
    
    let dominantCategory = '';
    let maxCount = 0;
    
    for (const [category, count] of categoryCount.entries()) {
      if (count > maxCount) {
        maxCount = count;
        dominantCategory = category;
      }
    }
    
    return dominantCategory;
  }

  private generateClusterName(traits: Trait[], category: string): string {
    // Find highest scoring traits
    const topTraits = [...traits]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2);
      
    // Use top trait names to form cluster name
    if (topTraits.length >= 2) {
      return `${topTraits[0].name}-${topTraits[1].name} ${category} Cluster`;
    } else if (topTraits.length === 1) {
      return `${topTraits[0].name} ${category} Cluster`;
    } else {
      return `${category} Trait Cluster`;
    }
  }

  private generateClusterDescription(traits: Trait[], category: string): string {
    const traitNames = traits.map(t => t.name).join(', ');
    return `A cluster of related ${category.toLowerCase()} traits including ${traitNames}.`;
  }

  private calculateTraitWeightInCluster(
    trait: Trait,
    clusterTraits: Trait[],
    relationships: TraitRelationship[]
  ): number {
    // Base weight on trait score
    let weight = trait.score / 100 * 0.4;
    
    // Add weight based on relationships
    const relatedTraits = relationships
      .filter(r => (r.traitId1 === trait.id || r.traitId2 === trait.id) && 
                   (clusterTraits.some(ct => ct.id === r.traitId1) && 
                    clusterTraits.some(ct => ct.id === r.traitId2)));
                    
    const relationshipWeight = relatedTraits.reduce((sum, r) => sum + r.strength, 0) / 
                              Math.max(1, relatedTraits.length) * 0.6;
                              
    weight += relationshipWeight;
    
    // Normalize to range [0, 100]
    return Math.min(100, Math.max(0, weight * 100));
  }

  private calculateClusterCentrality(
    traits: Trait[],
    relationships: TraitRelationship[]
  ): number {
    // Calculate the average relationship strength within the cluster
    let totalStrength = 0;
    let relationshipCount = 0;
    
    for (const rel of relationships) {
      if (traits.some(t => t.id === rel.traitId1) && traits.some(t => t.id === rel.traitId2)) {
        totalStrength += rel.strength;
        relationshipCount++;
      }
    }
    
    // Normalize to range [0, 100]
    return relationshipCount > 0 ? 
           Math.round((totalStrength / relationshipCount) * 100) : 0;
  }

  private calculateAverageScore(traits: Trait[]): number {
    const sum = traits.reduce((total, trait) => total + trait.score, 0);
    return Math.round(sum / traits.length);
  }

  private calculateClusterCohesion(
    traits: Trait[],
    relationships: TraitRelationship[]
  ): number {
    // Calculate cohesion based on relationship density and strength
    const maxPossibleRelationships = (traits.length * (traits.length - 1)) / 2;
    
    let actualRelationships = 0;
    let totalStrength = 0;
    
    for (const rel of relationships) {
      if (traits.some(t => t.id === rel.traitId1) && traits.some(t => t.id === rel.traitId2)) {
        actualRelationships++;
        totalStrength += rel.strength;
      }
    }
    
    const density = maxPossibleRelationships > 0 ? 
                   actualRelationships / maxPossibleRelationships : 0;
                   
    const avgStrength = actualRelationships > 0 ? 
                       totalStrength / actualRelationships : 0;
                       
    // Cohesion combines density and average strength
    return Math.round((density * 0.4 + avgStrength * 0.6) * 100);
  }

  private generateMetaClusterName(
    category: string,
    clusters: TraitCluster[]
  ): string {
    return `${category} Meta-Cluster`;
  }

  private generateMetaClusterDescription(
    category: string,
    clusters: TraitCluster[]
  ): string {
    const clusterNames = clusters.map(c => c.name).join(', ');
    return `A meta-cluster of ${category.toLowerCase()} traits including clusters: ${clusterNames}.`;
  }

  private identifyKeyTraitsForMetaCluster(
    clusters: TraitCluster[],
    allTraits: Trait[]
  ): Trait[] {
    const traitIds = new Set<string>();
    
    // Collect all trait IDs from clusters
    for (const cluster of clusters) {
      for (const traitInfo of cluster.traits) {
        traitIds.add(traitInfo.id);
      }
    }
    
    // Find traits with IDs in the set
    return allTraits.filter(t => traitIds.has(t.id));
  }

  private calculateTraitRelevanceInMetaCluster(
    trait: Trait,
    clusters: TraitCluster[]
  ): number {
    let relevance = 0;
    let count = 0;
    
    // Calculate relevance based on weight in each cluster
    for (const cluster of clusters) {
      const traitInCluster = cluster.traits.find(t => t.id === trait.id);
      
      if (traitInCluster) {
        relevance += traitInCluster.weight;
        count++;
      }
    }
    
    // Average across clusters where the trait appears
    return count > 0 ? Math.round(relevance / count) : 0;
  }

  private calculateMetaClusterStrength(clusters: TraitCluster[]): number {
    // Average of cluster centrality scores
    const sum = clusters.reduce((total, cluster) => total + cluster.centrality, 0);
    return Math.round(sum / clusters.length);
  }

  private calculateMetaClusterSignificance(
    clusters: TraitCluster[],
    allTraits: Trait[]
  ): number {
    // Significance based on proportion of total traits and average scores
    const uniqueTraitIds = new Set<string>();
    
    for (const cluster of clusters) {
      for (const traitInfo of cluster.traits) {
        uniqueTraitIds.add(traitInfo.id);
      }
    }
    
    const coverageRatio = uniqueTraitIds.size / allTraits.length;
    
    const significantTraits = allTraits
      .filter(t => uniqueTraitIds.has(t.id) && t.score >= TraitAnalyticsEngine.SIGNIFICANT_TRAIT_THRESHOLD)
      .length;
    
    const significanceRatio = allTraits.length > 0 ? 
                             significantTraits / allTraits.length : 0;
    
    // Combine coverage and significance
    return Math.round((coverageRatio * 0.4 + significanceRatio * 0.6) * 100);
  }

  private calculateAttentionPriority(
    trait: Trait,
    relationships: TraitRelationship[]
  ): number {
    // Base priority on inverse of trait score (lower score = higher priority)
    let priority = (100 - trait.score) / 100 * 5;
    
    // Increase priority for traits with many relationships (more connected = more important)
    const relatedTraits = relationships.filter(r => r.traitId1 === trait.id || r.traitId2 === trait.id);
    priority += Math.min(3, relatedTraits.length * 0.5);
    
    // Increase priority for high confidence assessments
    priority += trait.confidence / 100 * 2;
    
    // Scale to 0-10 range
    return Math.min(10, Math.max(0, priority));
  }
}