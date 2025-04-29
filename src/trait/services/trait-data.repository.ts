import supabase from '../../supabase';
import logger from '../../logger';
import { AppError } from '../../error.middleware';
import { Trait } from '../models/trait.model';

/**
 * Repository for trait data persistence operations
 * Handles CRUD operations and database interactions
 */
export class TraitDataRepository {
  /**
   * Get a trait by ID
   */
  async getTraitById(traitId: string): Promise<Trait> {
    try {
      const { data, error } = await supabase
        .from('traits')
        .select('*')
        .eq('id', traitId)
        .single();

      if (error) {
        logger.error('Error fetching trait', { error, traitId });
        throw new AppError(`Trait not found: ${error.message}`, 404);
      }

      return this.mapDbTraitToModel(data);
    } catch (error) {
      logger.error('Error in getTraitById', { error, traitId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch trait', 500);
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
        .order('score', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching traits for profile', { error, profileId, category });
        throw new AppError(`Failed to fetch traits: ${error.message}`, 400);
      }

      return (data || []).map(this.mapDbTraitToModel);
    } catch (error) {
      logger.error('Error in getTraitsForProfile', { error, profileId, category });
      throw error instanceof AppError ? error : new AppError('Failed to fetch traits', 500);
    }
  }

  /**
   * Create a new trait with proper transaction handling
   */
  async createTrait(trait: Omit<Trait, 'id' | 'createdAt' | 'updatedAt'>): Promise<Trait> {
    // Get a transaction client
    const { data: client } = await supabase.rpc('begin_transaction');
    
    try {
      const { data, error } = await supabase
        .from('traits')
        .insert([{
          profile_id: trait.profileId,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          assessment_method: trait.assessmentMethod,
          assessment_date: trait.assessmentDate || new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }])
        .select()
        .single();

      if (error) {
        // Rollback the transaction
        await supabase.rpc('rollback_transaction', { client_id: client });
        logger.error('Error creating trait', { error, trait });
        throw new AppError(`Failed to create trait: ${error.message}`, 400);
      }
      
      // Commit the transaction
      await supabase.rpc('commit_transaction', { client_id: client });
      
      const createdTrait = this.mapDbTraitToModel(data);
      
      // Store trait history for tracking evolution
      await this.storeTraitHistory(createdTrait);
      
      return createdTrait;
    } catch (error) {
      // Attempt to rollback if not already done
      try {
        await supabase.rpc('rollback_transaction', { client_id: client });
      } catch (rollbackError) {
        logger.error('Error rolling back transaction', { rollbackError });
      }
      
      logger.error('Error in createTrait', { error, trait });
      throw error instanceof AppError ? error : new AppError('Failed to create trait', 500);
    }
  }

  /**
   * Update an existing trait with proper transaction handling
   */
  async updateTrait(traitId: string, updates: Partial<Trait>): Promise<Trait> {
    // Get a transaction client
    const { data: client } = await supabase.rpc('begin_transaction');
    
    try {
      // Get the original trait to compare for history tracking
      const originalTrait = await this.getTraitById(traitId);
      
      const dbUpdates: Record<string, any> = {};
      if (updates.name) dbUpdates.name = updates.name;
      if (updates.category) dbUpdates.category = updates.category;
      if (updates.score !== undefined) {
        dbUpdates.score = updates.score;
        dbUpdates.assessment_date = new Date();
      }
      if (updates.assessmentMethod) dbUpdates.assessment_method = updates.assessmentMethod;
      
      dbUpdates.updated_at = new Date();

      // Apply the updates
      const { data, error } = await supabase
        .from('traits')
        .update(dbUpdates)
        .eq('id', traitId)
        .select()
        .single();

      if (error) {
        // Rollback the transaction
        await supabase.rpc('rollback_transaction', { client_id: client });
        logger.error('Error updating trait', { error, traitId, updates });
        throw new AppError(`Failed to update trait: ${error.message}`, 400);
      }
      
      // Commit the transaction
      await supabase.rpc('commit_transaction', { client_id: client });

      const updatedTrait = this.mapDbTraitToModel(data);
      
      // Store trait history if score was updated
      if (updates.score !== undefined && updatedTrait.score !== originalTrait.score) {
        await this.storeTraitHistory(updatedTrait);
      }
      
      return updatedTrait;
    } catch (error) {
      // Attempt to rollback if not already done
      try {
        await supabase.rpc('rollback_transaction', { client_id: client });
      } catch (rollbackError) {
        logger.error('Error rolling back transaction', { rollbackError });
      }
      
      logger.error('Error in updateTrait', { error, traitId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update trait', 500);
    }
  }

  /**
   * Delete a trait
   */
  async deleteTrait(traitId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('traits')
        .delete()
        .eq('id', traitId);

      if (error) {
        logger.error('Error deleting trait', { error, traitId });
        throw new AppError(`Failed to delete trait: ${error.message}`, 400);
      }
    } catch (error) {
      logger.error('Error in deleteTrait', { error, traitId });
      throw error instanceof AppError ? error : new AppError('Failed to delete trait', 500);
    }
  }

  /**
   * Map database trait object to Trait model
   */
  private mapDbTraitToModel(dbTrait: any): Trait {
    return {
      id: dbTrait.id,
      profileId: dbTrait.profile_id,
      name: dbTrait.name,
      category: dbTrait.category,
      score: dbTrait.score,
      assessmentMethod: dbTrait.assessment_method,
      assessmentDate: new Date(dbTrait.assessment_date),
      createdAt: new Date(dbTrait.created_at),
      updatedAt: new Date(dbTrait.updated_at)
    };
  }

  /**
   * Store trait assessment history with improved error handling and data validation
   * Implements transaction handling for data consistency
   */
  async storeTraitHistory(trait: Trait): Promise<void> {
    // Validate trait data before storing
    if (!trait.profileId || !trait.name || !trait.category || 
        trait.score === undefined || !trait.assessmentMethod) {
      logger.error('Invalid trait data for history storage', { traitId: trait.id });
      return;
    }
    
    // Use transaction to ensure data consistency
    const { data: client } = await supabase.rpc('begin_transaction');
    
    try {
      // First check if an identical entry already exists to avoid duplicates
      const { data: existingRecords } = await supabase
        .from('trait_history')
        .select('*')
        .eq('profile_id', trait.profileId)
        .eq('name', trait.name)
        .eq('score', trait.score)
        .eq('assessment_method', trait.assessmentMethod);
      
      if (existingRecords && existingRecords.length > 0) {
        // Check if the existing record was created very recently (within 5 minutes)
        const existingRecord = existingRecords[0];
        const existingDate = new Date(existingRecord.created_at);
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
        
        if (existingDate > fiveMinutesAgo) {
          logger.info('Skipping duplicate trait history entry', { 
            traitId: trait.id, 
            existingRecordId: existingRecord.id 
          });
          return; // Skip duplicate entry
        }
      }
      
      // Add the trait assessment to history
      const { error: insertError } = await supabase
        .from('trait_history')
        .insert([{
          profile_id: trait.profileId,
          name: trait.name,
          category: trait.category,
          score: trait.score,
          assessment_method: trait.assessmentMethod,
          assessment_date: trait.assessmentDate,
          created_at: new Date()
        }])
        .select();
      
      if (insertError) {
        // Rollback transaction on error
        await supabase.rpc('rollback_transaction', { client_id: client });
        throw insertError;
      }
      
      // Update aggregated trait statistics table for faster analytics
      const { error: statsError } = await supabase
        .from('trait_statistics')
        .upsert([{
          profile_id: trait.profileId,
          trait_name: trait.name,
          last_updated: new Date(),
          latest_score: trait.score,
          score_count: supabase.rpc('increment')
        }]);
      
      if (statsError) {
        // Rollback transaction on error
        await supabase.rpc('rollback_transaction', { client_id: client });
        throw statsError;
      }
      
      // Commit the transaction
      await supabase.rpc('commit_transaction', { client_id: client });
      
    } catch (error) {
      // Attempt rollback and log error
      try {
        await supabase.rpc('rollback_transaction', { client_id: client });
      } catch (rollbackError) {
        logger.error('Error rolling back transaction', { rollbackError, originalError: error });
      }
      
      logger.error('Error storing trait history', { 
        error, 
        traitId: trait.id, 
        profileId: trait.profileId, 
        traitName: trait.name 
      });
      // Don't re-throw error - we don't want trait operations to fail
      // if history storage fails, but log it comprehensively
    }
  }

  /**
   * Get trait history records for a profile
   */
  async getTraitHistory(profileId: string, traitName?: string): Promise<any[]> {
    try {
      let query = supabase
        .from('trait_history')
        .select('*')
        .eq('profile_id', profileId)
        .order('assessment_date', { ascending: true });
      
      if (traitName) {
        query = query.eq('name', traitName);
      }
      
      const { data, error } = await query;
      
      if (error) {
        logger.error('Error fetching trait history', { error, profileId, traitName });
        throw new AppError(`Failed to fetch trait history: ${error.message}`, 400);
      }
      
      return data || [];
    } catch (error) {
      logger.error('Error in getTraitHistory', { error, profileId, traitName });
      throw error instanceof AppError ? error : new AppError('Failed to fetch trait history', 500);
    }
  }

  /**
   * Get profile data for trait assessment
   */
  async getProfileData(profileId: string): Promise<any> {
    try {
      // Get profile experiences
      const { data: experiences, error: expError } = await supabase
        .from('experiences')
        .select('*')
        .eq('profile_id', profileId);
      
      if (expError) {
        throw new AppError(`Failed to fetch profile experiences: ${expError.message}`, 400);
      }
      
      // Get profile skills
      const { data: skills, error: skillsError } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', profileId);
      
      if (skillsError) {
        throw new AppError(`Failed to fetch profile skills: ${skillsError.message}`, 400);
      }
      
      // Get profile projects
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('profile_id', profileId);
      
      if (projectsError) {
        throw new AppError(`Failed to fetch profile projects: ${projectsError.message}`, 400);
      }
      
      // Get profile education
      const { data: education, error: eduError } = await supabase
        .from('education')
        .select('*')
        .eq('profile_id', profileId);
      
      if (eduError) {
        throw new AppError(`Failed to fetch profile education: ${eduError.message}`, 400);
      }
      
      return {
        experiences: experiences || [],
        skills: skills || [],
        projects: projects || [],
        education: education || [],
      };
    } catch (error) {
      logger.error('Error in getProfileData', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch profile data', 500);
    }
  }

  /**
   * Store assessor information for external trait assessments
   */
  async storeAssessorInfo(
    profileId: string,
    traitName: string,
    assessorInfo: {
      name: string;
      relationship: string;
      email?: string;
    }
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('trait_assessors')
        .insert([{
          profile_id: profileId,
          trait_name: traitName,
          assessor_name: assessorInfo.name,
          assessor_relationship: assessorInfo.relationship,
          assessor_email: assessorInfo.email,
          assessment_date: new Date()
        }])
        .select()
        .single();
        
      if (error) {
        logger.error('Error storing assessor info', { error, profileId, traitName });
        // This is non-critical, so we don't throw
      }
      
      return data;
    } catch (error) {
      logger.error('Error in storeAssessorInfo', { error, profileId, traitName });
      // Non-critical, so we don't throw
    }
  }
}