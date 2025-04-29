import { Content, Distribution } from '../interfaces/models';
import supabase from '../core/supabase';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import config from '../config';

/**
 * Service for managing content and distribution
 */
export class ContentService {
  /**
   * Get content by ID
   */
  async getContentById(contentId: string): Promise<Content> {
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('id', contentId)
        .single();

      if (error) {
        logger.error('Error fetching content', { error, contentId });
        throw new AppError(`Content not found: ${error.message}`, 404);
      }

      return data as Content;
    } catch (error) {
      logger.error('Error in getContentById', { error, contentId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch content', 500);
    }
  }

  /**
   * Get content for a profile
   */
  async getContentForProfile(profileId: string, options: { limit?: number; contentType?: string } = {}): Promise<Content[]> {
    try {
      let query = supabase
        .from('content')
        .select('*')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false });

      if (options.contentType) {
        query = query.eq('contentType', options.contentType);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching content for profile', { error, profileId, options });
        throw new AppError(`Failed to fetch content: ${error.message}`, 400);
      }

      return data as Content[];
    } catch (error) {
      logger.error('Error in getContentForProfile', { error, profileId, options });
      throw error instanceof AppError ? error : new AppError('Failed to fetch content', 500);
    }
  }

  /**
   * Create new content
   */
  async createContent(content: Omit<Content, 'id' | 'createdAt' | 'updatedAt'>): Promise<Content> {
    try {
      const { data, error } = await supabase
        .from('content')
        .insert([{
          ...content,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating content', { error, content });
        throw new AppError(`Failed to create content: ${error.message}`, 400);
      }

      return data as Content;
    } catch (error) {
      logger.error('Error in createContent', { error, content });
      throw error instanceof AppError ? error : new AppError('Failed to create content', 500);
    }
  }

  /**
   * Update existing content
   */
  async updateContent(contentId: string, updates: Partial<Content>): Promise<Content> {
    try {
      const { data, error } = await supabase
        .from('content')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', contentId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating content', { error, contentId, updates });
        throw new AppError(`Failed to update content: ${error.message}`, 400);
      }

      return data as Content;
    } catch (error) {
      logger.error('Error in updateContent', { error, contentId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update content', 500);
    }
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', contentId);

      if (error) {
        logger.error('Error deleting content', { error, contentId });
        throw new AppError(`Failed to delete content: ${error.message}`, 400);
      }
    } catch (error) {
      logger.error('Error in deleteContent', { error, contentId });
      throw error instanceof AppError ? error : new AppError('Failed to delete content', 500);
    }
  }

  /**
   * Create distribution for content
   */
  async createDistribution(distribution: Omit<Distribution, 'id' | 'createdAt' | 'updatedAt'>): Promise<Distribution> {
    try {
      // Verify content exists
      await this.getContentById(distribution.contentId);

      const { data, error } = await supabase
        .from('distributions')
        .insert([{
          ...distribution,
          status: distribution.status || 'scheduled',
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating distribution', { error, distribution });
        throw new AppError(`Failed to create distribution: ${error.message}`, 400);
      }

      // If distribution is scheduled, set up the distribution process
      if (data.status === 'scheduled' && data.scheduledAt) {
        this.scheduleDistribution(data.id, data);
      }

      return data as Distribution;
    } catch (error) {
      logger.error('Error in createDistribution', { error, distribution });
      throw error instanceof AppError ? error : new AppError('Failed to create distribution', 500);
    }
  }

  /**
   * Get distributions for content
   */
  async getDistributionsForContent(contentId: string): Promise<Distribution[]> {
    try {
      const { data, error } = await supabase
        .from('distributions')
        .select('*')
        .eq('contentId', contentId)
        .order('createdAt', { ascending: false });

      if (error) {
        logger.error('Error fetching distributions for content', { error, contentId });
        throw new AppError(`Failed to fetch distributions: ${error.message}`, 400);
      }

      return data as Distribution[];
    } catch (error) {
      logger.error('Error in getDistributionsForContent', { error, contentId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch distributions', 500);
    }
  }

  /**
   * Update distribution status
   */
  async updateDistributionStatus(distributionId: string, status: 'scheduled' | 'published' | 'failed', metrics?: any): Promise<Distribution> {
    try {
      const updates: any = {
        status,
        updatedAt: new Date()
      };

      if (status === 'published') {
        updates.publishedAt = new Date();
      }

      if (metrics) {
        updates.metrics = metrics;
      }

      const { data, error } = await supabase
        .from('distributions')
        .update(updates)
        .eq('id', distributionId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating distribution status', { error, distributionId, status });
        throw new AppError(`Failed to update distribution status: ${error.message}`, 400);
      }

      return data as Distribution;
    } catch (error) {
      logger.error('Error in updateDistributionStatus', { error, distributionId, status });
      throw error instanceof AppError ? error : new AppError('Failed to update distribution status', 500);
    }
  }

  /**
   * Schedule content distribution
   * This is a placeholder for the actual distribution scheduling
   */
  private scheduleDistribution(distributionId: string, distribution: Partial<Distribution>): void {
    try {
      logger.info('Scheduling content distribution', { 
        distributionId, 
        channelType: distribution.channelType,
        scheduledAt: distribution.scheduledAt 
      });
      
      // This would be replaced with actual scheduling logic
      // For now, we'll just simulate a successful distribution after a delay
      const now = new Date();
      const scheduledAt = distribution.scheduledAt ? new Date(distribution.scheduledAt) : now;
      const delayMs = Math.max(0, scheduledAt.getTime() - now.getTime());
      
      setTimeout(async () => {
        try {
          // Generate mock metrics
          const mockMetrics = {
            impressions: Math.floor(Math.random() * 1000),
            clicks: Math.floor(Math.random() * 100),
            engagements: Math.floor(Math.random() * 50),
            timestamp: new Date().toISOString()
          };
          
          await this.updateDistributionStatus(distributionId, 'published', mockMetrics);
          logger.info('Content distribution completed successfully', { distributionId });
        } catch (error) {
          logger.error('Error completing content distribution', { error, distributionId });
        }
      }, delayMs);
    } catch (error) {
      logger.error('Error scheduling content distribution', { error, distributionId });
    }
  }
}

export default new ContentService();
