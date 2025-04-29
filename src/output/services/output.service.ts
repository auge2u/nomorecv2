import { Output } from '../interfaces/models';
import supabase from '../core/supabase';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import profileService from './profile.service';
import traitService from './trait.service';

/**
 * Service for managing output formats and presentations
 */
export class OutputService {
  /**
   * Get an output by ID
   */
  async getOutputById(outputId: string): Promise<Output> {
    try {
      const { data, error } = await supabase
        .from('outputs')
        .select('*')
        .eq('id', outputId)
        .single();

      if (error) {
        logger.error('Error fetching output', { error, outputId });
        throw new AppError(`Output not found: ${error.message}`, 404);
      }

      return data as Output;
    } catch (error) {
      logger.error('Error in getOutputById', { error, outputId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch output', 500);
    }
  }

  /**
   * Get outputs for a profile
   */
  async getOutputsForProfile(profileId: string, options: { outputType?: string; format?: string } = {}): Promise<Output[]> {
    try {
      let query = supabase
        .from('outputs')
        .select('*')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false });

      if (options.outputType) {
        query = query.eq('outputType', options.outputType);
      }

      if (options.format) {
        query = query.eq('format', options.format);
      }

      const { data, error } = await query;

      if (error) {
        logger.error('Error fetching outputs for profile', { error, profileId, options });
        throw new AppError(`Failed to fetch outputs: ${error.message}`, 400);
      }

      return data as Output[];
    } catch (error) {
      logger.error('Error in getOutputsForProfile', { error, profileId, options });
      throw error instanceof AppError ? error : new AppError('Failed to fetch outputs', 500);
    }
  }

  /**
   * Create a new output
   */
  async createOutput(output: Omit<Output, 'id' | 'createdAt' | 'updatedAt'>): Promise<Output> {
    try {
      const { data, error } = await supabase
        .from('outputs')
        .insert([{
          ...output,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating output', { error, output });
        throw new AppError(`Failed to create output: ${error.message}`, 400);
      }

      return data as Output;
    } catch (error) {
      logger.error('Error in createOutput', { error, output });
      throw error instanceof AppError ? error : new AppError('Failed to create output', 500);
    }
  }

  /**
   * Update an existing output
   */
  async updateOutput(outputId: string, updates: Partial<Output>): Promise<Output> {
    try {
      const { data, error } = await supabase
        .from('outputs')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', outputId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating output', { error, outputId, updates });
        throw new AppError(`Failed to update output: ${error.message}`, 400);
      }

      return data as Output;
    } catch (error) {
      logger.error('Error in updateOutput', { error, outputId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update output', 500);
    }
  }

  /**
   * Delete an output
   */
  async deleteOutput(outputId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('outputs')
        .delete()
        .eq('id', outputId);

      if (error) {
        logger.error('Error deleting output', { error, outputId });
        throw new AppError(`Failed to delete output: ${error.message}`, 400);
      }
    } catch (error) {
      logger.error('Error in deleteOutput', { error, outputId });
      throw error instanceof AppError ? error : new AppError('Failed to delete output', 500);
    }
  }

  /**
   * Generate a multi-perspective view based on profile data and context
   */
  async generateMultiPerspectiveView(profileId: string, context: string, industry?: string): Promise<Output> {
    try {
      logger.info('Generating multi-perspective view', { profileId, context, industry });
      
      // Get complete profile data
      const profileData = await profileService.getCompleteProfile(profileId);
      
      // Get traits for the profile
      const traits = await traitService.getTraitsForProfile(profileId);
      
      // Define perspectives based on context
      const perspectives = this.getPerspectivesForContext(context);
      
      // Generate content for each perspective
      const perspectiveContent: Record<string, any> = {};
      
      for (const perspective of perspectives) {
        perspectiveContent[perspective.id] = this.generatePerspectiveContent(
          perspective, 
          profileData, 
          traits, 
          industry
        );
      }
      
      // Create the output
      const output = await this.createOutput({
        profileId,
        title: `${context} Perspective${perspectives.length > 1 ? 's' : ''}`,
        description: `Multi-perspective view of your profile for ${context}${industry ? ` in ${industry}` : ''}`,
        outputType: 'cv',
        format: 'interactive',
        context,
        industry,
        data: {
          perspectives: perspectiveContent,
          metadata: {
            generatedAt: new Date().toISOString(),
            profileVersion: profileData.profile.updatedAt,
            perspectiveCount: perspectives.length
          }
        }
      });
      
      return output;
    } catch (error) {
      logger.error('Error in generateMultiPerspectiveView', { error, profileId, context, industry });
      throw error instanceof AppError ? error : new AppError('Failed to generate multi-perspective view', 500);
    }
  }

  /**
   * Generate a narrative format based on profile data and context
   */
  async generateNarrativeFormat(profileId: string, context: string, industry?: string): Promise<Output> {
    try {
      logger.info('Generating narrative format', { profileId, context, industry });
      
      // Get complete profile data
      const profileData = await profileService.getCompleteProfile(profileId);
      
      // Get traits for the profile
      const traits = await traitService.getTraitsForProfile(profileId);
      
      // Generate narrative sections
      const narrativeSections = this.generateNarrativeSections(
        profileData, 
        traits, 
        context, 
        industry
      );
      
      // Create the output
      const output = await this.createOutput({
        profileId,
        title: `${context} Narrative`,
        description: `Narrative presentation of your profile for ${context}${industry ? ` in ${industry}` : ''}`,
        outputType: 'pitch',
        format: 'web',
        context,
        industry,
        data: {
          narrative: narrativeSections,
          metadata: {
            generatedAt: new Date().toISOString(),
            profileVersion: profileData.profile.updatedAt,
            wordCount: this.countWords(narrativeSections)
          }
        }
      });
      
      return output;
    } catch (error) {
      logger.error('Error in generateNarrativeFormat', { error, profileId, context, industry });
      throw error instanceof AppError ? error : new AppError('Failed to generate narrative format', 500);
    }
  }

  /**
   * Generate a CV format based on profile data and industry
   */
  async generateCVFormat(profileId: string, industry: string): Promise<Output> {
    try {
      logger.info('Generating CV format', { profileId, industry });
      
      // Get complete profile data
      const profileData = await profileService.getCompleteProfile(profileId);
      
      // Get traits for the profile
      const traits = await traitService.getTraitsForProfile(profileId);
      
      // Get industry-specific requirements
      const industryRequirements = this.getIndustryRequirements(industry);
      
      // Filter and prioritize experiences based on industry
      const prioritizedExperiences = this.prioritizeExperiencesForIndustry(
        profileData.experiences, 
        industryRequirements
      );
      
      // Filter and prioritize skills based on industry
      const prioritizedSkills = this.prioritizeSkillsForIndustry(
        profileData.skills, 
        industryRequirements
      );
      
      // Filter and prioritize projects based on industry
      const prioritizedProjects = this.prioritizeProjectsForIndustry(
        profileData.projects, 
        industryRequirements
      );
      
      // Generate industry-specific summary
      const industrySummary = this.generateIndustrySummary(
        profileData.profile, 
        traits, 
        industry
      );
      
      // Create the output
      const output = await this.createOutput({
        profileId,
        title: `${industry} CV`,
        description: `Tailored CV for the ${industry} industry`,
        outputType: 'cv',
        format: 'pdf',
        context: 'industry-specific',
        industry,
        data: {
          profile: {
            ...profileData.profile,
            summary: industrySummary
          },
          experiences: prioritizedExperiences,
          skills: prioritizedSkills,
          projects: prioritizedProjects,
          education: profileData.education,
          traits: traits.filter(t => t.score >= 70), // Only include high-scoring traits
          metadata: {
            generatedAt: new Date().toISOString(),
            profileVersion: profileData.profile.updatedAt,
            tailoredFor: industry
          }
        }
      });
      
      return output;
    } catch (error) {
      logger.error('Error in generateCVFormat', { error, profileId, industry });
      throw error instanceof AppError ? error : new AppError('Failed to generate CV format', 500);
    }
  }

  /**
   * Get perspectives for a given context
   */
  private getPerspectivesForContext(context: string): Array<{id: string, name: string, description: string}> {
    // Define perspectives based on context
    const perspectivesByContext: Record<string, Array<{id: string, name: string, description: string}>> = {
      'leadership': [
        {
          id: 'strategic',
          name: 'Strategic Leader',
          description: 'Focuses on vision, direction-setting, and long-term planning'
        },
        {
          id: 'operational',
          name: 'Operational Leader',
          description: 'Emphasizes execution, efficiency, and process optimization'
        },
        {
          id: 'transformational',
          name: 'Transformational Leader',
          description: 'Highlights change management, innovation, and organizational development'
        },
        {
          id: 'team',
          name: 'Team Leader',
          description: 'Focuses on team building, talent development, and collaboration'
        }
      ],
      'technical': [
        {
          id: 'architect',
          name: 'System Architect',
          description: 'Emphasizes design thinking, system integration, and technical vision'
        },
        {
          id: 'specialist',
          name: 'Technical Specialist',
          description: 'Focuses on deep expertise in specific technologies or domains'
        },
        {
          id: 'innovator',
          name: 'Technical Innovator',
          description: 'Highlights creative problem-solving and cutting-edge solutions'
        },
        {
          id: 'implementer',
          name: 'Implementation Expert',
          description: 'Emphasizes practical execution, reliability, and technical delivery'
        }
      ],
      'business': [
        {
          id: 'strategist',
          name: 'Business Strategist',
          description: 'Focuses on market positioning, competitive advantage, and growth strategies'
        },
        {
          id: 'operator',
          name: 'Business Operator',
          description: 'Emphasizes operational efficiency, process optimization, and business metrics'
        },
        {
          id: 'innovator',
          name: 'Business Innovator',
          description: 'Highlights business model innovation, new market development, and disruption'
        },
        {
          id: 'relationship',
          name: 'Relationship Builder',
          description: 'Focuses on stakeholder management, partnerships, and client relationships'
        }
      ],
      'project': [
        {
          id: 'manager',
          name: 'Project Manager',
          description: 'Emphasizes planning, coordination, and delivery of successful projects'
        },
        {
          id: 'technical',
          name: 'Technical Lead',
          description: 'Focuses on technical direction, architecture, and implementation'
        },
        {
          id: 'stakeholder',
          name: 'Stakeholder Manager',
          description: 'Highlights communication, expectation management, and relationship building'
        },
        {
          id: 'innovator',
          name: 'Project Innovator',
          description: 'Emphasizes creative approaches, problem-solving, and continuous improvement'
        }
      ],
      'consulting': [
        {
          id: 'advisor',
          name: 'Strategic Advisor',
          description: 'Focuses on providing high-level guidance and strategic recommendations'
        },
        {
          id: 'specialist',
          name: 'Domain Specialist',
          description: 'Emphasizes deep expertise in specific industries or functional areas'
        },
        {
          id: 'implementer',
          name: 'Implementation Consultant',
          description: 'Highlights practical execution, change management, and solution delivery'
        },
        {
          id: 'facilitator',
          name: 'Process Facilitator',
          description: 'Focuses on guiding clients through complex processes and decision-making'
        }
      ]
    };
    
    // Return perspectives for the given context, or default to leadership if not found
    return perspectivesByContext[context.toLowerCase()] || perspectivesByContext['leadership'];
  }

  /**
   * Generate content for a specific perspective
   */
  private generatePerspectiveContent(
    perspective: {id: string, name: string, description: string},
    profileData: any,
    traits: any[],
    industry?: string
  ): any {
    // Select and prioritize experiences based on perspective
    const relevantExperiences = this.filterExperiencesForPerspective(
      profileData.experiences,
      perspective.id
    );
    
    // Select and prioritize skills based on perspective
    const relevantSkills = this.filterSkillsForPerspective(
      profileData.skills,
      perspective.id
    );
    
    // Select and prioritize projects based on perspective
    const relevantProjects = this.filterProjectsForPerspective(
      profileData.projects,
      perspective.id
    );
    
    // Generate perspective-specific summary
    const summary = this.generatePerspectiveSummary(
      profileData.profile,
      traits,
      perspective,
      industry
    );
    
    // Generate key achievements for this perspective
    const achievements = this.generateKeyAchievements(
      relevantExperiences,
      relevantProjects,
      perspective
    );
    
    // Generate value proposition for this perspective
    const valueProposition = this.generateValueProposition(
      profileData.profile,
      traits,
      perspective,
      industry
    );
    
    return {
      name: perspective.name,
      description: perspective.description,
      summary,
      valueProposition,
      experiences: relevantExperiences,
     
(Content truncated due to size limit. Use line ranges to read in chunks)