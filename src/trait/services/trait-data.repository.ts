import logger from '../../utils/logger';
import supabase from '../../core/supabase';
import { Trait } from '../models/trait.model';

/**
 * Repository for trait data operations
 * Manages data persistence and retrieval for the trait system
 */
export class TraitDataRepository {
  /**
   * Save a trait to the database
   */
  async saveTrait(trait: Partial<Trait> & { assessmentMethod?: string; assessmentDate?: Date }): Promise<Trait> {
    try {
      if (!trait.profileId) {
        throw new Error('Profile ID is required');
      }

      // Create a new trait or update an existing one
      const { data, error } = await supabase
        .from('traits')
        .upsert({
          id: trait.id, // Will be ignored if null (for new traits)
          profile_id: trait.profileId,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          assessment_method: trait.assessmentMethod,
          assessment_date: trait.assessmentDate || new Date(),
          metadata: {
            ...(trait.metadata || {}),
            confidence: trait.confidence || 80,
            source: trait.source || 'system',
            description: trait.description
          }
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving trait', { error, trait });
        throw new Error(`Failed to save trait: ${error.message}`);
      }

      return this.mapTraitFromDb(data);
    } catch (error) {
      logger.error('Error in saveTrait', { error });
      throw error;
    }
  }

  /**
   * Get a trait by ID
   */
  async getTraitById(id: string): Promise<Trait | null> {
    try {
      const { data, error } = await supabase
        .from('traits')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // PGRST116 is "no rows returned" error
          return null;
        }
        logger.error('Error getting trait by ID', { error, id });
        throw new Error(`Failed to get trait: ${error.message}`);
      }

      return this.mapTraitFromDb(data);
    } catch (error) {
      logger.error('Error in getTraitById', { error });
      throw error;
    }
  }

  /**
   * Get traits for a profile
   */
  async getTraitsForProfile(profileId: string, category?: string): Promise<Trait[]> {
    try {
      let query = supabase
        .from('traits')
        .select('*')
        .eq('profile_id', profileId)
        .order('assessment_date', { ascending: false });
      
      if (category) {
        query = query.eq('category', category);
      }
      
      const { data, error } = await query;

      if (error) {
        logger.error('Error getting traits for profile', { error, profileId });
        throw new Error(`Failed to get traits: ${error.message}`);
      }

      return data.map(item => this.mapTraitFromDb(item));
    } catch (error) {
      logger.error('Error in getTraitsForProfile', { error });
      throw error;
    }
  }

  /**
   * Get trait history for a profile
   */
  async getTraitHistory(
    profileId: string,
    traitName?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Trait[]> {
    try {
      let query = supabase
        .from('traits')
        .select('*')
        .eq('profile_id', profileId)
        .order('assessment_date', { ascending: true });

      // Add optional filters
      if (traitName) {
        query = query.eq('name', traitName);
      }
      
      if (startDate) {
        query = query.gte('assessment_date', startDate.toISOString());
      }
      
      if (endDate) {
        query = query.lte('assessment_date', endDate.toISOString());
      }
      
      const { data, error } = await query;

      if (error) {
        logger.error('Error getting trait history', { error, profileId });
        throw new Error(`Failed to get trait history: ${error.message}`);
      }

      return data.map(item => this.mapTraitFromDb(item));
    } catch (error) {
      logger.error('Error in getTraitHistory', { error });
      throw error;
    }
  }

  /**
   * Save trait relationships
   */
  async saveTraitRelationship(relationship: {
    id?: string;
    traitId1: string;
    traitId2: string;
    strength: number;
    type: string;
    profileId: string;
  }): Promise<{
    id: string;
    traitId1: string;
    traitId2: string;
    strength: number;
    type: string;
    profileId: string;
  }> {
    try {
      const { data, error } = await supabase
        .from('trait_relationships')
        .upsert({
          id: relationship.id,
          trait_id_1: relationship.traitId1,
          trait_id_2: relationship.traitId2,
          profile_id: relationship.profileId,
          strength: relationship.strength,
          type: relationship.type
        })
        .select()
        .single();

      if (error) {
        logger.error('Error saving trait relationship', { error, relationship });
        throw new Error(`Failed to save trait relationship: ${error.message}`);
      }

      return {
        id: data.id,
        traitId1: data.trait_id_1,
        traitId2: data.trait_id_2,
        profileId: data.profile_id,
        strength: data.strength,
        type: data.type
      };
    } catch (error) {
      logger.error('Error in saveTraitRelationship', { error });
      throw error;
    }
  }

  /**
   * Get trait relationships for a profile
   */
  async getTraitRelationshipsForProfile(profileId: string): Promise<Array<{
    id: string;
    traitId1: string;
    traitId2: string;
    profileId: string;
    strength: number;
    type: string;
  }>> {
    try {
      // First get all traits for the profile to get their IDs
      const traits = await this.getTraitsForProfile(profileId);
      const traitIds = traits.map(t => t.id);
      
      if (traitIds.length === 0) {
        return [];
      }
      
      // Get relationships where either trait is in the profile
      const { data, error } = await supabase
        .from('trait_relationships')
        .select('*')
        .or(`trait_id_1.in.(${traitIds.join(',')}),trait_id_2.in.(${traitIds.join(',')})`);

      if (error) {
        logger.error('Error getting trait relationships', { error, profileId });
        throw new Error(`Failed to get trait relationships: ${error.message}`);
      }

      return data.map(rel => ({
        id: rel.id,
        traitId1: rel.trait_id_1,
        traitId2: rel.trait_id_2,
        profileId: rel.profile_id,
        strength: rel.strength,
        type: rel.type
      }));
    } catch (error) {
      logger.error('Error in getTraitRelationshipsForProfile', { error });
      throw error;
    }
  }

  /**
   * Save trait assessment
   */
  async saveTraitAssessment(assessment: {
    profileId: string;
    traits: Array<{
      name: string;
      category: string;
      score: number;
      confidence?: number;
      assessmentMethod: 'self' | 'external' | 'derived' | 'validated' | 'combined';
      metadata?: any;
    }>;
    source?: string;
    timestamp?: Date;
  }): Promise<Trait[]> {
    try {
      // Save each trait individually
      const savedTraits: Trait[] = [];
      
      for (const traitData of assessment.traits) {
        const trait = await this.saveTrait({
          profileId: assessment.profileId,
          name: traitData.name,
          category: traitData.category,
          score: traitData.score,
          confidence: traitData.confidence || 80, 
          source: assessment.source,
          assessmentMethod: traitData.assessmentMethod,
          assessmentDate: assessment.timestamp || new Date(),
          metadata: {
            ...(traitData.metadata || {}),
            source: assessment.source
          }
        });
        
        savedTraits.push(trait);
      }
      
      return savedTraits;
    } catch (error) {
      logger.error('Error in saveTraitAssessment', { error });
      throw error;
    }
  }

  /**
   * Map database row to Trait object
   */
  private mapTraitFromDb(data: any): Trait {
    return {
      id: data.id,
      profileId: data.profile_id,
      name: data.name,
      category: data.category,
      score: data.score,
      confidence: data.metadata?.confidence || 80, // Use metadata confidence or default to 80
      source: data.metadata?.source || 'system',
      description: data.metadata?.description,
      assessmentMethod: data.assessment_method,
      assessmentDate: new Date(data.assessment_date),
      lastUpdated: data.updated_at ? new Date(data.updated_at) : new Date(data.assessment_date),
      createdAt: data.created_at ? new Date(data.created_at) : undefined,
      updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
      metadata: data.metadata || {}
    };
  }
}