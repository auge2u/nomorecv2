import { Interview } from '../interfaces/models';
import supabase from '../core/supabase';
import logger from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import config from '../config';
import contentService from './content.service';

/**
 * Service for managing career coach interviews
 */
export class InterviewService {
  /**
   * Get interview by ID
   */
  async getInterviewById(interviewId: string): Promise<Interview> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (error) {
        logger.error('Error fetching interview', { error, interviewId });
        throw new AppError(`Interview not found: ${error.message}`, 404);
      }

      return data as Interview;
    } catch (error) {
      logger.error('Error in getInterviewById', { error, interviewId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch interview', 500);
    }
  }

  /**
   * Get interviews for a profile
   */
  async getInterviewsForProfile(profileId: string): Promise<Interview[]> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('profileId', profileId)
        .order('createdAt', { ascending: false });

      if (error) {
        logger.error('Error fetching interviews for profile', { error, profileId });
        throw new AppError(`Failed to fetch interviews: ${error.message}`, 400);
      }

      return data as Interview[];
    } catch (error) {
      logger.error('Error in getInterviewsForProfile', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch interviews', 500);
    }
  }

  /**
   * Create a new interview
   */
  async createInterview(interview: Omit<Interview, 'id' | 'status' | 'contentIds' | 'createdAt' | 'updatedAt'>): Promise<Interview> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .insert([{
          ...interview,
          status: 'scheduled',
          contentIds: [],
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating interview', { error, interview });
        throw new AppError(`Failed to create interview: ${error.message}`, 400);
      }

      return data as Interview;
    } catch (error) {
      logger.error('Error in createInterview', { error, interview });
      throw error instanceof AppError ? error : new AppError('Failed to create interview', 500);
    }
  }

  /**
   * Update interview status
   */
  async updateInterviewStatus(
    interviewId: string, 
    status: 'scheduled' | 'in-progress' | 'completed',
    updates: Partial<Interview> = {}
  ): Promise<Interview> {
    try {
      const { data, error } = await supabase
        .from('interviews')
        .update({
          status,
          ...updates,
          updatedAt: new Date(),
          ...(status === 'completed' ? { completedAt: new Date() } : {})
        })
        .eq('id', interviewId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating interview status', { error, interviewId, status });
        throw new AppError(`Failed to update interview status: ${error.message}`, 400);
      }

      return data as Interview;
    } catch (error) {
      logger.error('Error in updateInterviewStatus', { error, interviewId, status });
      throw error instanceof AppError ? error : new AppError('Failed to update interview status', 500);
    }
  }

  /**
   * Generate interview questions based on profile data
   * This is a placeholder for the actual question generation logic
   */
  async generateInterviewQuestions(profileId: string, industry?: string): Promise<string[]> {
    try {
      logger.info('Generating interview questions', { profileId, industry });
      
      // This would be replaced with actual question generation logic
      // For now, we'll return mock questions
      const generalQuestions = [
        "Can you walk me through your professional journey and how it's shaped your approach to leadership?",
        "What do you consider your most significant professional achievement and why?",
        "How do you approach complex problem-solving in high-pressure situations?",
        "How do you balance technical expertise with strategic business thinking?",
        "What's your approach to building and leading high-performing teams?"
      ];
      
      const industrySpecificQuestions: Record<string, string[]> = {
        'finance': [
          "How have you implemented security measures to protect sensitive financial data?",
          "Can you describe your experience with regulatory compliance in the financial sector?",
          "How do you approach risk management in financial technology systems?",
          "What strategies have you employed to ensure high availability for critical financial systems?",
          "How do you balance innovation with stability in financial technology?"
        ],
        'technology': [
          "How do you stay current with rapidly evolving technology trends?",
          "Can you describe your approach to technical debt management?",
          "How do you balance feature development with system reliability?",
          "What's your philosophy on open source vs. proprietary technology?",
          "How do you approach technology vendor selection and management?"
        ],
        'healthcare': [
          "How have you addressed HIPAA compliance in your technical solutions?",
          "What experience do you have with healthcare interoperability standards?",
          "How do you approach patient data security and privacy?",
          "Can you describe your experience with healthcare-specific technologies?",
          "How do you balance innovation with patient safety considerations?"
        ],
        'retail': [
          "How have you leveraged technology to enhance customer experiences?",
          "What strategies have you implemented for scalable e-commerce solutions?",
          "How do you approach omnichannel technology integration?",
          "Can you describe your experience with inventory and supply chain systems?",
          "How do you balance performance with cost-effectiveness in retail systems?"
        ]
      };
      
      // Combine general questions with industry-specific ones if industry is provided
      if (industry && industry.toLowerCase() in industrySpecificQuestions) {
        return [...generalQuestions, ...industrySpecificQuestions[industry.toLowerCase()]];
      }
      
      return generalQuestions;
    } catch (error) {
      logger.error('Error generating interview questions', { error, profileId, industry });
      throw new AppError('Failed to generate interview questions', 500);
    }
  }

  /**
   * Process completed interview and generate content
   * This is a placeholder for the actual interview processing logic
   */
  async processCompletedInterview(interviewId: string): Promise<string[]> {
    try {
      const interview = await this.getInterviewById(interviewId);
      
      if (interview.status !== 'completed') {
        throw new AppError('Cannot process interview that is not completed', 400);
      }
      
      logger.info('Processing completed interview', { interviewId });
      
      // This would be replaced with actual interview processing logic
      // For now, we'll create mock content from the interview
      const contentTypes = ['article', 'video'] as const;
      const contentIds: string[] = [];
      
      for (const type of contentTypes) {
        const content = await contentService.createContent({
          profileId: interview.profileId,
          title: `${interview.title} - ${type.charAt(0).toUpperCase() + type.slice(1)}`,
          description: `Content generated from career coach interview: ${interview.description || interview.title}`,
          contentType: type,
          format: type === 'article' ? 'markdown' : 'mp4',
          url: type === 'video' ? interview.videoUrl : undefined,
          data: type === 'article' ? { content: 'This is automatically generated content from the interview.' } : undefined,
          tags: ['interview', 'career-coach', type],
          isPublic: true
        });
        
        contentIds.push(content.id);
      }
      
      // Update the interview with the generated content IDs
      await this.updateInterviewStatus(interviewId, 'completed', {
        contentIds,
        insights: {
          keyPoints: [
            'Demonstrated strong leadership capabilities',
            'Highlighted technical expertise in relevant areas',
            'Showed strategic thinking and business acumen',
            'Emphasized collaborative approach to problem-solving',
            'Articulated clear vision for future growth'
          ],
          strengths: [
            'Communication skills',
            'Technical knowledge',
            'Strategic thinking',
            'Problem-solving approach',
            'Team leadership'
          ],
          recommendations: [
            'Emphasize quantifiable achievements more',
            'Provide more specific examples of leadership challenges',
            'Highlight cross-functional collaboration experiences',
            'Elaborate on technical implementation details when appropriate',
            'Share more about personal growth and learning experiences'
          ]
        }
      });
      
      return contentIds;
    } catch (error) {
      logger.error('Error processing completed interview', { error, interviewId });
      throw error instanceof AppError ? error : new AppError('Failed to process interview', 500);
    }
  }
}

export default new InterviewService();
