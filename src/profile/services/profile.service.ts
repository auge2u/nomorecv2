import { User, Profile, Experience, Education, Project, Skill, Trait, Certification } from './models';
import supabase from './supabase';
import logger from './logger';
import { AppError } from './error.middleware';

/**
 * Service for managing user profiles and related data
 */
export class ProfileService {
  /**
   * Get a user profile by ID
   */
  async getProfileById(profileId: string): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        logger.error('Error fetching profile', { error, profileId });
        throw new AppError(`Profile not found: ${error.message}`, 404);
      }

      return data as Profile;
    } catch (error) {
      logger.error('Error in getProfileById', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch profile', 500);
    }
  }

  /**
   * Get a profile by user ID
   */
  async getProfileByUserId(userId: string): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('userId', userId)
        .single();

      if (error) {
        logger.error('Error fetching profile by userId', { error, userId });
        throw new AppError(`Profile not found: ${error.message}`, 404);
      }

      return data as Profile;
    } catch (error) {
      logger.error('Error in getProfileByUserId', { error, userId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch profile', 500);
    }
  }

  /**
   * Create a new profile
   */
  async createProfile(profile: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert([{
          ...profile,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating profile', { error, profile });
        throw new AppError(`Failed to create profile: ${error.message}`, 400);
      }

      return data as Profile;
    } catch (error) {
      logger.error('Error in createProfile', { error, profile });
      throw error instanceof AppError ? error : new AppError('Failed to create profile', 500);
    }
  }

  /**
   * Update an existing profile
   */
  async updateProfile(profileId: string, updates: Partial<Profile>): Promise<Profile> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', profileId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating profile', { error, profileId, updates });
        throw new AppError(`Failed to update profile: ${error.message}`, 400);
      }

      return data as Profile;
    } catch (error) {
      logger.error('Error in updateProfile', { error, profileId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update profile', 500);
    }
  }

  /**
   * Get experiences for a profile
   */
  async getExperiences(profileId: string): Promise<Experience[]> {
    try {
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('profileId', profileId)
        .order('startDate', { ascending: false });

      if (error) {
        logger.error('Error fetching experiences', { error, profileId });
        throw new AppError(`Failed to fetch experiences: ${error.message}`, 400);
      }

      return data as Experience[];
    } catch (error) {
      logger.error('Error in getExperiences', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch experiences', 500);
    }
  }

  /**
   * Get education entries for a profile
   */
  async getEducation(profileId: string): Promise<Education[]> {
    try {
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('profileId', profileId)
        .order('startDate', { ascending: false });

      if (error) {
        logger.error('Error fetching education', { error, profileId });
        throw new AppError(`Failed to fetch education: ${error.message}`, 400);
      }

      return data as Education[];
    } catch (error) {
      logger.error('Error in getEducation', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch education', 500);
    }
  }

  /**
   * Get projects for a profile
   */
  async getProjects(profileId: string): Promise<Project[]> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('profileId', profileId)
        .order('startDate', { ascending: false });

      if (error) {
        logger.error('Error fetching projects', { error, profileId });
        throw new AppError(`Failed to fetch projects: ${error.message}`, 400);
      }

      return data as Project[];
    } catch (error) {
      logger.error('Error in getProjects', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch projects', 500);
    }
  }

  /**
   * Get skills for a profile
   */
  async getSkills(profileId: string): Promise<Skill[]> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('profileId', profileId)
        .order('level', { ascending: false });

      if (error) {
        logger.error('Error fetching skills', { error, profileId });
        throw new AppError(`Failed to fetch skills: ${error.message}`, 400);
      }

      return data as Skill[];
    } catch (error) {
      logger.error('Error in getSkills', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch skills', 500);
    }
  }

  /**
   * Get traits for a profile
   */
  async getTraits(profileId: string): Promise<Trait[]> {
    try {
      const { data, error } = await supabase
        .from('traits')
        .select('*')
        .eq('profileId', profileId)
        .order('score', { ascending: false });

      if (error) {
        logger.error('Error fetching traits', { error, profileId });
        throw new AppError(`Failed to fetch traits: ${error.message}`, 400);
      }

      return data as Trait[];
    } catch (error) {
      logger.error('Error in getTraits', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch traits', 500);
    }
  }

  /**
   * Get complete profile data including all related entities
   */
  async getCompleteProfile(profileId: string): Promise<{
    profile: Profile;
    experiences: Experience[];
    education: Education[];
    projects: Project[];
    skills: Skill[];
    traits: Trait[];
  }> {
    try {
      const profile = await this.getProfileById(profileId);
      const [experiences, education, projects, skills, traits] = await Promise.all([
        this.getExperiences(profileId),
        this.getEducation(profileId),
        this.getProjects(profileId),
        this.getSkills(profileId),
        this.getTraits(profileId)
      ]);

      return {
        profile,
        experiences,
        education,
        projects,
        skills,
        traits
      };
    } catch (error) {
      logger.error('Error in getCompleteProfile', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch complete profile', 500);
    }
  }

  /**
   * Delete a profile by ID
   */
  async deleteProfile(profileId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', profileId);

      if (error) {
        logger.error('Error deleting profile', { error, profileId });
        throw new AppError(`Failed to delete profile: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteProfile', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to delete profile', 500);
    }
  }

  /**
   * Create a new experience entry for a profile
   */
  async createExperience(experience: Omit<Experience, 'id' | 'createdAt' | 'updatedAt'>): Promise<Experience> {
    try {
      const { data, error } = await supabase
        .from('experiences')
        .insert([{
          ...experience,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating experience', { error, experience });
        throw new AppError(`Failed to create experience: ${error.message}`, 400);
      }

      return data as Experience;
    } catch (error) {
      logger.error('Error in createExperience', { error, experience });
      throw error instanceof AppError ? error : new AppError('Failed to create experience', 500);
    }
  }

  /**
   * Get an experience entry by ID
   */
  async getExperienceById(experienceId: string): Promise<Experience> {
    try {
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .single();

      if (error) {
        logger.error('Error fetching experience', { error, experienceId });
        throw new AppError(`Experience not found: ${error.message}`, 404);
      }

      return data as Experience;
    } catch (error) {
      logger.error('Error in getExperienceById', { error, experienceId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch experience', 500);
    }
  }

  /**
   * Update an existing experience entry
   */
  async updateExperience(experienceId: string, updates: Partial<Experience>): Promise<Experience> {
    try {
      const { data, error } = await supabase
        .from('experiences')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', experienceId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating experience', { error, experienceId, updates });
        throw new AppError(`Failed to update experience: ${error.message}`, 400);
      }

      return data as Experience;
    } catch (error) {
      logger.error('Error in updateExperience', { error, experienceId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update experience', 500);
    }
  }

  /**
   * Delete an experience entry by ID
   */
  async deleteExperience(experienceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', experienceId);

      if (error) {
        logger.error('Error deleting experience', { error, experienceId });
        throw new AppError(`Failed to delete experience: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteExperience', { error, experienceId });
      throw error instanceof AppError ? error : new AppError('Failed to delete experience', 500);
    }
  }

  /**
   * Create a new education entry for a profile
   */
  async createEducation(education: Omit<Education, 'id' | 'createdAt' | 'updatedAt'>): Promise<Education> {
    try {
      const { data, error } = await supabase
        .from('education')
        .insert([{
          ...education,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating education', { error, education });
        throw new AppError(`Failed to create education: ${error.message}`, 400);
      }

      return data as Education;
    } catch (error) {
      logger.error('Error in createEducation', { error, education });
      throw error instanceof AppError ? error : new AppError('Failed to create education', 500);
    }
  }

  /**
   * Get an education entry by ID
   */
  async getEducationById(educationId: string): Promise<Education> {
    try {
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('id', educationId)
        .single();

      if (error) {
        logger.error('Error fetching education', { error, educationId });
        throw new AppError(`Education not found: ${error.message}`, 404);
      }

      return data as Education;
    } catch (error) {
      logger.error('Error in getEducationById', { error, educationId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch education', 500);
    }
  }

  /**
   * Update an existing education entry
   */
  async updateEducation(educationId: string, updates: Partial<Education>): Promise<Education> {
    try {
      const { data, error } = await supabase
        .from('education')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', educationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating education', { error, educationId, updates });
        throw new AppError(`Failed to update education: ${error.message}`, 400);
      }

      return data as Education;
    } catch (error) {
      logger.error('Error in updateEducation', { error, educationId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update education', 500);
    }
  }

  /**
   * Delete an education entry by ID
   */
  async deleteEducation(educationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('education')
        .delete()
        .eq('id', educationId);

      if (error) {
        logger.error('Error deleting education', { error, educationId });
        throw new AppError(`Failed to delete education: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteEducation', { error, educationId });
      throw error instanceof AppError ? error : new AppError('Failed to delete education', 500);
    }
  }

  /**
   * Create a new project entry for a profile
   */
  async createProject(project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          ...project,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating project', { error, project });
        throw new AppError(`Failed to create project: ${error.message}`, 400);
      }

      return data as Project;
    } catch (error) {
      logger.error('Error in createProject', { error, project });
      throw error instanceof AppError ? error : new AppError('Failed to create project', 500);
    }
  }

  /**
   * Get a project entry by ID
   */
  async getProjectById(projectId: string): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) {
        logger.error('Error fetching project', { error, projectId });
        throw new AppError(`Project not found: ${error.message}`, 404);
      }

      return data as Project;
    } catch (error) {
      logger.error('Error in getProjectById', { error, projectId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch project', 500);
    }
  }

  /**
   * Update an existing project entry
   */
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project> {
    try {
      const { data, error } = await supabase
        .from('projects')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', projectId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating project', { error, projectId, updates });
        throw new AppError(`Failed to update project: ${error.message}`, 400);
      }

      return data as Project;
    } catch (error) {
      logger.error('Error in updateProject', { error, projectId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update project', 500);
    }
  }

  /**
   * Delete a project entry by ID
   */
  async deleteProject(projectId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) {
        logger.error('Error deleting project', { error, projectId });
        throw new AppError(`Failed to delete project: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteProject', { error, projectId });
      throw error instanceof AppError ? error : new AppError('Failed to delete project', 500);
    }
  }

  /**
   * Create a new skill entry for a profile
   */
  async createSkill(skill: Omit<Skill, 'id' | 'createdAt' | 'updatedAt'>): Promise<Skill> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .insert([{
          ...skill,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating skill', { error, skill });
        throw new AppError(`Failed to create skill: ${error.message}`, 400);
      }

      return data as Skill;
    } catch (error) {
      logger.error('Error in createSkill', { error, skill });
      throw error instanceof AppError ? error : new AppError('Failed to create skill', 500);
    }
  }

  /**
   * Get a skill entry by ID
   */
  async getSkillById(skillId: string): Promise<Skill> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .single();

      if (error) {
        logger.error('Error fetching skill', { error, skillId });
        throw new AppError(`Skill not found: ${error.message}`, 404);
      }

      return data as Skill;
    } catch (error) {
      logger.error('Error in getSkillById', { error, skillId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch skill', 500);
    }
  }

  /**
   * Update an existing skill entry
   */
  async updateSkill(skillId: string, updates: Partial<Skill>): Promise<Skill> {
    try {
      const { data, error } = await supabase
        .from('skills')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', skillId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating skill', { error, skillId, updates });
        throw new AppError(`Failed to update skill: ${error.message}`, 400);
      }

      return data as Skill;
    } catch (error) {
      logger.error('Error in updateSkill', { error, skillId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update skill', 500);
    }
  }

  /**
   * Delete a skill entry by ID
   */
  async deleteSkill(skillId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId);

      if (error) {
        logger.error('Error deleting skill', { error, skillId });
        throw new AppError(`Failed to delete skill: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteSkill', { error, skillId });
      throw error instanceof AppError ? error : new AppError('Failed to delete skill', 500);
    }
  }

  /**
   * Get certifications for a profile
   */
  async getCertifications(profileId: string): Promise<Certification[]> {
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('profileId', profileId)
        .order('issueDate', { ascending: false });

      if (error) {
        logger.error('Error fetching certifications', { error, profileId });
        throw new AppError(`Failed to fetch certifications: ${error.message}`, 400);
      }

      return data as Certification[];
    } catch (error) {
      logger.error('Error in getCertifications', { error, profileId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch certifications', 500);
    }
  }

  /**
   * Create a new certification entry for a profile
   */
  async createCertification(certification: Omit<Certification, 'id' | 'createdAt' | 'updatedAt'>): Promise<Certification> {
    try {
      const { data, error } = await supabase
        .from('certifications')
        .insert([{
          ...certification,
          createdAt: new Date(),
          updatedAt: new Date()
        }])
        .select()
        .single();

      if (error) {
        logger.error('Error creating certification', { error, certification });
        throw new AppError(`Failed to create certification: ${error.message}`, 400);
      }

      return data as Certification;
    } catch (error) {
      logger.error('Error in createCertification', { error, certification });
      throw error instanceof AppError ? error : new AppError('Failed to create certification', 500);
    }
  }

  /**
   * Get a certification entry by ID
   */
  async getCertificationById(certificationId: string): Promise<Certification> {
    try {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('id', certificationId)
        .single();

      if (error) {
        logger.error('Error fetching certification', { error, certificationId });
        throw new AppError(`Certification not found: ${error.message}`, 404);
      }

      return data as Certification;
    } catch (error) {
      logger.error('Error in getCertificationById', { error, certificationId });
      throw error instanceof AppError ? error : new AppError('Failed to fetch certification', 500);
    }
  }

  /**
   * Update an existing certification entry
   */
  async updateCertification(certificationId: string, updates: Partial<Certification>): Promise<Certification> {
    try {
      const { data, error } = await supabase
        .from('certifications')
        .update({
          ...updates,
          updatedAt: new Date()
        })
        .eq('id', certificationId)
        .select()
        .single();

      if (error) {
        logger.error('Error updating certification', { error, certificationId, updates });
        throw new AppError(`Failed to update certification: ${error.message}`, 400);
      }

      return data as Certification;
    } catch (error) {
      logger.error('Error in updateCertification', { error, certificationId, updates });
      throw error instanceof AppError ? error : new AppError('Failed to update certification', 500);
    }
  }

  /**
   * Delete a certification entry by ID
   */
  async deleteCertification(certificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', certificationId);

      if (error) {
        logger.error('Error deleting certification', { error, certificationId });
        throw new AppError(`Failed to delete certification: ${error.message}`, 400);
      }

      return true;
    } catch (error) {
      logger.error('Error in deleteCertification', { error, certificationId });
      throw error instanceof AppError ? error : new AppError('Failed to delete certification', 500);
    }
  }
}

export default new ProfileService();
