import logger from '../../logger';
import { AppError } from '../../error.middleware';
import { Trait } from '../models/trait.model';

/**
 * Engine for trait assessment and scoring
 * Analyzes profile data to derive trait scores
 */
export class TraitAssessmentEngine {
  /**
   * Calculate adaptability score based on profile data
   */
  calculateAdaptabilityScore(experiences: any[], skills: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Consider diversity of industries and roles
      const industries = new Set(experiences.map(exp => {
        // Extract industry from experience data
        return exp.industry || '';
      }).filter(Boolean));
      
      const roles = new Set(experiences.map(exp => {
        return exp.title || '';
      }).filter(Boolean));
      
      // Calculate base score from number of different roles and industries
      if (industries.size >= 3) score += 25;
      else if (industries.size >= 2) score += 15;
      else if (industries.size >= 1) score += 10;
      maxPossibleScore += 25;
      
      if (roles.size >= 4) score += 25;
      else if (roles.size >= 3) score += 20;
      else if (roles.size >= 2) score += 15;
      else if (roles.size >= 1) score += 10;
      maxPossibleScore += 25;
      
      // Check for adaptability-related skills
      const adaptabilitySkills = [
        'adaptability',
        'flexibility',
        'change management',
        'agile',
        'cross-functional',
        'versatile',
        'adaptable',
        'pivot'
      ];
      
      // Calculate skill score
      const skillScore = this.calculateSkillsScore(skills, adaptabilitySkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Check for adaptability in projects
      const adaptabilityKeywords = [
        'adapt',
        'flexibility',
        'pivot',
        'change',
        'agile',
        'responsive',
        'evolve'
      ];
      
      let projectAdaptabilityScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        for (const keyword of adaptabilityKeywords) {
          if (desc.includes(keyword)) {
            projectAdaptabilityScore += 5;
            break;
          }
        }
      }
      projectAdaptabilityScore = Math.min(projectAdaptabilityScore, 25);
      score += projectAdaptabilityScore;
      maxPossibleScore += 25;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating adaptability score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate communication score based on profile data
   */
  calculateCommunicationScore(experiences: any[], skills: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for communication-related roles or responsibilities
      const communicationRoles = [
        'manager',
        'leader',
        'presenter',
        'speaker',
        'trainer',
        'consultant',
        'coordinator',
        'liaison'
      ];
      
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for communication roles in title
        for (const role of communicationRoles) {
          if (title.includes(role)) {
            score += 10;
            break;
          }
        }
        
        // Check for communication keywords in description
        const commKeywords = [
          'communicate',
          'communication',
          'present',
          'presentation',
          'report',
          'document',
          'write',
          'wrote',
          'explain',
          'articulate',
          'negotiate'
        ];
        
        let keywordsFound = 0;
        for (const keyword of commKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(15, keywordsFound * 3);
      }
      
      score = Math.min(score, 50);
      maxPossibleScore += 50;
      
      // Check for communication skills
      const communicationSkills = [
        'communication',
        'presentation',
        'public speaking',
        'writing',
        'technical writing',
        'documentation',
        'reporting',
        'negotiation'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, communicationSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating communication score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate strategic thinking score based on profile data
   */
  calculateStrategicThinkingScore(experiences: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for strategic roles
      const strategicRoles = [
        'strategist',
        'director',
        'manager',
        'lead',
        'vp',
        'head',
        'chief',
        'president',
        'founder',
        'partner'
      ];
      
      // Strategic keywords to look for
      const strategicKeywords = [
        'strategy',
        'strategic',
        'vision',
        'long-term',
        'growth',
        'planning',
        'roadmap',
        'forecast',
        'analyze',
        'analysis',
        'trends',
        'direction',
        'future',
        'goal',
        'objective',
        'kpi',
        'metrics'
      ];
      
      // Check experiences for strategic roles and keywords
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for strategic roles in title
        for (const role of strategicRoles) {
          if (title.includes(role)) {
            score += 10;
            break;
          }
        }
        
        // Check for strategic keywords in description
        let keywordsFound = 0;
        for (const keyword of strategicKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(20, keywordsFound * 2);
      }
      
      score = Math.min(score, 50);
      maxPossibleScore += 50;
      
      // Check projects for strategic elements
      let projectScore = 0;
      for (const project of projects) {
        const title = (project.name || '').toLowerCase();
        const desc = (project.description || '').toLowerCase();
        
        // Higher score for projects that mention strategy or planning
        let projectStrategicScore = 0;
        
        for (const keyword of strategicKeywords) {
          if (title.includes(keyword) || desc.includes(keyword)) {
            projectStrategicScore += 5;
          }
        }
        
        projectScore += Math.min(10, projectStrategicScore);
      }
      
      projectScore = Math.min(projectScore, 30);
      score += projectScore;
      maxPossibleScore += 30;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating strategic thinking score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate leadership score based on profile data
   */
  calculateLeadershipScore(experiences: any[], skills: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for leadership roles
      const leadershipRoles = [
        'manager',
        'director',
        'lead',
        'chief',
        'head',
        'vp',
        'president',
        'executive',
        'founder',
        'chair',
        'supervisor',
        'principal'
      ];
      
      // Leadership keywords
      const leadershipKeywords = [
        'lead',
        'manage',
        'direct',
        'oversee',
        'supervise',
        'spearhead',
        'coordinate',
        'guide',
        'mentor',
        'coach',
        'team'
      ];
      
      // Check experiences for leadership roles and keywords
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for leadership roles in title
        for (const role of leadershipRoles) {
          if (title.includes(role)) {
            score += 15;
            break;
          }
        }
        
        // Check for team size mentions
        const teamSizeMatches = desc.match(/team of (\d+)|(\d+)[- ]person team|managing (\d+)|leading (\d+)/gi);
        if (teamSizeMatches) {
          // Extract numbers from the matches
          const numbers = teamSizeMatches.map(match => {
            const num = match.match(/\d+/);
            return num ? parseInt(num[0]) : 0;
          });
          
          // Add points based on maximum team size
          const maxTeamSize = Math.max(...numbers, 0);
          if (maxTeamSize >= 10) score += 15;
          else if (maxTeamSize >= 5) score += 10;
          else if (maxTeamSize >= 2) score += 5;
        }
        
        // Check for leadership keywords in description
        let keywordsFound = 0;
        for (const keyword of leadershipKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(15, keywordsFound * 2);
      }
      
      score = Math.min(score, 60);
      maxPossibleScore += 60;
      
      // Check for leadership skills
      const leadershipSkills = [
        'leadership',
        'management',
        'team building',
        'mentoring',
        'coaching',
        'delegation',
        'motivation',
        'team management',
        'supervision'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, leadershipSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Check projects for leadership elements
      let projectLeadershipScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Check for leadership keywords
        let projectKeywordsFound = 0;
        for (const keyword of leadershipKeywords) {
          if (desc.includes(keyword)) {
            projectKeywordsFound++;
          }
        }
        
        projectLeadershipScore += Math.min(5, projectKeywordsFound);
      }
      
      projectLeadershipScore = Math.min(projectLeadershipScore, 15);
      score += projectLeadershipScore;
      maxPossibleScore += 15;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating leadership score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate analytical thinking score based on profile data
   */
  calculateAnalyticalThinkingScore(experiences: any[], skills: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for analytical roles
      const analyticalRoles = [
        'analyst',
        'researcher',
        'scientist',
        'engineer',
        'data',
        'statistician',
        'quant',
        'developer'
      ];
      
      // Analytical keywords
      const analyticalKeywords = [
        'analyze',
        'analysis',
        'research',
        'data',
        'metrics',
        'statistics',
        'quantitative',
        'problem solving',
        'critical thinking',
        'evaluation',
        'assessment',
        'investigate',
        'logical'
      ];
      
      // Check experiences for analytical roles and keywords
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for analytical roles in title
        for (const role of analyticalRoles) {
          if (title.includes(role)) {
            score += 15;
            break;
          }
        }
        
        // Check for analytical keywords in description
        let keywordsFound = 0;
        for (const keyword of analyticalKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(15, keywordsFound * 2);
      }
      
      score = Math.min(score, 50);
      maxPossibleScore += 50;
      
      // Check for analytical skills
      const analyticalSkills = [
        'analytical',
        'analysis',
        'data analysis',
        'research',
        'statistics',
        'quantitative',
        'critical thinking',
        'problem solving',
        'sql',
        'python',
        'r',
        'mathematics'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, analyticalSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Check projects for analytical elements
      let projectAnalyticalScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Check for analytical keywords
        let projectKeywordsFound = 0;
        for (const keyword of analyticalKeywords) {
          if (desc.includes(keyword)) {
            projectKeywordsFound++;
          }
        }
        
        projectAnalyticalScore += Math.min(7, projectKeywordsFound);
      }
      
      projectAnalyticalScore = Math.min(projectAnalyticalScore, 20);
      score += projectAnalyticalScore;
      maxPossibleScore += 20;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating analytical thinking score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate systems thinking score based on profile data
   */
  calculateSystemsThinkingScore(experiences: any[], projects: any[], skills: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for systems thinking roles
      const systemsRoles = [
        'architect',
        'systems',
        'infrastructure',
        'solution',
        'enterprise',
        'platform',
        'integration',
        'devops',
        'sre'
      ];
      
      // Systems thinking keywords
      const systemsKeywords = [
        'system',
        'integration',
        'architecture',
        'ecosystem',
        'infrastructure',
        'platform',
        'framework',
        'holistic',
        'interconnect',
        'interdependent',
        'environment',
        'dependency',
        'lifecycle'
      ];
      
      // Check experiences for systems thinking roles and keywords
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for systems roles in title
        for (const role of systemsRoles) {
          if (title.includes(role)) {
            score += 15;
            break;
          }
        }
        
        // Check for systems thinking keywords in description
        let keywordsFound = 0;
        for (const keyword of systemsKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(15, keywordsFound * 2);
      }
      
      score = Math.min(score, 40);
      maxPossibleScore += 40;
      
      // Check projects for systems thinking elements
      let projectSystemsScore = 0;
      for (const project of projects) {
        const title = (project.name || '').toLowerCase();
        const desc = (project.description || '').toLowerCase();
        
        // Higher score for projects that mention systems or architecture
        let projectSystemsPoints = 0;
        
        // Check title for systems keywords
        for (const keyword of systemsRoles.concat(systemsKeywords)) {
          if (title.includes(keyword)) {
            projectSystemsPoints += 5;
          }
        }
        
        // Check description for systems keywords
        for (const keyword of systemsKeywords) {
          if (desc.includes(keyword)) {
            projectSystemsPoints += 3;
          }
        }
        
        projectSystemsScore += Math.min(15, projectSystemsPoints);
      }
      
      projectSystemsScore = Math.min(projectSystemsScore, 40);
      score += projectSystemsScore;
      maxPossibleScore += 40;
      
      // Check for systems thinking related skills
      const systemsSkills = [
        'systems thinking',
        'architecture',
        'system design',
        'integration',
        'systems analysis',
        'enterprise architecture',
        'solution architecture',
        'infrastructure',
        'devops',
        'platform engineering'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, systemsSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating systems thinking score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate creative thinking score based on profile data
   */
  calculateCreativeThinkingScore(projects: any[], experiences: any[], skills: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Check for creative roles
      const creativeRoles = [
        'designer',
        'creative',
        'artist',
        'writer',
        'content',
        'ux',
        'ui',
        'innovation',
        'product'
      ];
      
      // Creative keywords
      const creativeKeywords = [
        'create',
        'design',
        'innovate',
        'develop',
        'novel',
        'unique',
        'original',
        'imagination',
        'innovative',
        'creativity',
        'brainstorm',
        'ideate',
        'prototype',
        'concept'
      ];
      
      // Check projects for creative elements (weigh projects more heavily for creativity)
      let projectCreativeScore = 0;
      for (const project of projects) {
        const title = (project.name || '').toLowerCase();
        const desc = (project.description || '').toLowerCase();
        
        // Points for creative keywords in title
        for (const keyword of creativeRoles.concat(creativeKeywords)) {
          if (title.includes(keyword)) {
            projectCreativeScore += 5;
            break;
          }
        }
        
        // Points for creative keywords in description
        let keywordsFound = 0;
        for (const keyword of creativeKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        projectCreativeScore += Math.min(10, keywordsFound * 2);
      }
      
      projectCreativeScore = Math.min(projectCreativeScore, 40);
      score += projectCreativeScore;
      maxPossibleScore += 40;
      
      // Check experiences for creative roles and keywords
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for creative roles in title
        for (const role of creativeRoles) {
          if (title.includes(role)) {
            score += 10;
            break;
          }
        }
        
        // Check for creative keywords in description
        let keywordsFound = 0;
        for (const keyword of creativeKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        score += Math.min(10, keywordsFound * 2);
      }
      
      score = Math.min(score + projectCreativeScore, 60);
      maxPossibleScore += 30;
      
      // Check for creative skills
      const creativeSkills = [
        'creativity',
        'innovation',
        'design thinking',
        'creative problem solving',
        'ideation',
        'design',
        'ui design',
        'ux design',
        'content creation',
        'writing',
        'storytelling'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, creativeSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating creative thinking score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate problem solving score based on profile data
   */
  calculateProblemSolvingScore(projects: any[], experiences: any[], skills: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Problem solving keywords
      const problemSolvingKeywords = [
        'solve',
        'solution',
        'problem',
        'resolve',
        'troubleshoot',
        'debug',
        'fix',
        'address',
        'overcome',
        'challenge',
        'improve',
        'optimize',
        'enhance'
      ];
      
      // Check experiences for problem solving indicators
      for (const experience of experiences) {
        const desc = (experience.description || '').toLowerCase();
        
        // Check for problem solving keywords
        let keywordsFound = 0;
        for (const keyword of problemSolvingKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          if (matches.length > 0) {
            keywordsFound += matches.length;
          }
        }
        
        // Look for specific achievements that indicate problem solving
        if (desc.includes('reduced') || desc.includes('increased') || 
            desc.includes('improved') || desc.includes('optimized')) {
          keywordsFound += 2;
        }
        
        // Calculate a problem-solving score for this experience
        score += Math.min(15, keywordsFound * 2);
      }
      
      score = Math.min(score, 40);
      maxPossibleScore += 40;
      
      // Check projects for problem solving elements
      let projectProblemSolvingScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Check for problem solving keywords
        let keywordsFound = 0;
        for (const keyword of problemSolvingKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        // If project specifically mentions solving a problem, add more points
        if (desc.includes('solve') && desc.includes('problem')) {
          keywordsFound += 3;
        }
        
        projectProblemSolvingScore += Math.min(10, keywordsFound * 2);
      }
      
      projectProblemSolvingScore = Math.min(projectProblemSolvingScore, 30);
      score += projectProblemSolvingScore;
      maxPossibleScore += 30;
      
      // Check for problem solving skills
      const problemSolvingSkills = [
        'problem solving',
        'critical thinking',
        'analytical thinking',
        'troubleshooting',
        'debugging',
        'root cause analysis',
        'decision making',
        'conflict resolution'
      ];
      
      const skillScore = this.calculateSkillsScore(skills, problemSolvingSkills);
      score += skillScore.score;
      maxPossibleScore += skillScore.maxPossible;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating problem solving score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate initiative score based on profile data
   */
  calculateInitiativeScore(experiences: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Initiative keywords
      const initiativeKeywords = [
        'initiate',
        'launch',
        'create',
        'establish',
        'found',
        'start',
        'spearhead',
        'lead',
        'pioneer',
        'develop',
        'implement',
        'introduce'
      ];
      
      // Check experiences for initiative indicators
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for founder/creator roles
        if (title.includes('founder') || title.includes('creator') || 
            title.includes('entrepreneur') || title.includes('owner')) {
          score += 20;
        }
        
        // Check for initiative keywords at the beginning of sentences
        let keywordsFound = 0;
        for (const keyword of initiativeKeywords) {
          const regex = new RegExp(`(^|\\.|\\n)\\s*${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          if (matches.length > 0) {
            keywordsFound += matches.length;
          }
        }
        
        score += Math.min(20, keywordsFound * 3);
      }
      
      score = Math.min(score, 50);
      maxPossibleScore += 50;
      
      // Check projects for initiative
      let projectInitiativeScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Points for self-initiated/personal projects
        if (desc.includes('personal project') || desc.includes('side project') || 
            desc.includes('own project') || desc.includes('individual project') ||
            desc.includes('initiated') || desc.includes('self-directed')) {
          projectInitiativeScore += 10;
        }
        
        // Look for initiative-related keywords at beginning of sentences
        let keywordsFound = 0;
        for (const keyword of initiativeKeywords) {
          const regex = new RegExp(`(^|\\.|\\n)\\s*${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          if (matches.length > 0) {
            keywordsFound += matches.length;
          }
        }
        
        projectInitiativeScore += Math.min(10, keywordsFound * 2);
      }
      
      projectInitiativeScore = Math.min(projectInitiativeScore, 50);
      score += projectInitiativeScore;
      maxPossibleScore += 50;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating initiative score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate efficiency score based on profile data
   */
  calculateEfficiencyScore(experiences: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Efficiency keywords
      const efficiencyKeywords = [
        'efficien',
        'optimize',
        'streamline',
        'automate',
        'improve',
        'reduce time',
        'reduce cost',
        'increase productivity',
        'accelerate',
        'expedite',
        'speed up',
        'time-saving',
        'lean',
        'agile'
      ];
      
      // Quantitative improvement indicators
      const regex = /reduced.+?(\d+%|by \d+)/gi;
      const timeRegex = /reduced time.+?(\d+%|by \d+)/gi;
      const costRegex = /reduced cost.+?(\d+%|by \d+)/gi;
      const increaseRegex = /increased.+?(\d+%|by \d+)/gi;
      
      // Check experiences for efficiency indicators
      for (const experience of experiences) {
        const desc = (experience.description || '').toLowerCase();
        
        // Check for efficiency keywords
        let keywordsFound = 0;
        for (const keyword of efficiencyKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        // Extra points for quantitative improvements
        const reductions = desc.match(regex) || [];
        const timeReductions = desc.match(timeRegex) || [];
        const costReductions = desc.match(costRegex) || [];
        const increases = desc.match(increaseRegex) || [];
        
        keywordsFound += reductions.length * 2;
        keywordsFound += timeReductions.length * 2; // Count these twice as they're already counted in reductions
        keywordsFound += costReductions.length * 2; // Count these twice as they're already counted in reductions
        keywordsFound += increases.length;
        
        score += Math.min(20, keywordsFound * 3);
      }
      
      score = Math.min(score, 60);
      maxPossibleScore += 60;
      
      // Check projects for efficiency elements
      let projectEfficiencyScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Check for efficiency keywords
        let keywordsFound = 0;
        for (const keyword of efficiencyKeywords) {
          if (desc.includes(keyword)) {
            keywordsFound++;
          }
        }
        
        // Extra points for quantitative improvements
        const reductions = desc.match(regex) || [];
        const increases = desc.match(increaseRegex) || [];
        
        keywordsFound += reductions.length;
        keywordsFound += increases.length;
        
        projectEfficiencyScore += Math.min(10, keywordsFound * 2);
      }
      
      projectEfficiencyScore = Math.min(projectEfficiencyScore, 40);
      score += projectEfficiencyScore;
      maxPossibleScore += 40;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating efficiency score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate collaboration score based on profile data
   */
  calculateCollaborationScore(experiences: any[], projects: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Collaboration keywords
      const collaborationKeywords = [
        'collaborat',
        'team',
        'partner',
        'cross-functional',
        'cross functional',
        'interdisciplinary',
        'joint',
        'together',
        'coordinate',
        'stakeholder'
      ];
      
      // Check experiences for collaboration indicators
      for (const experience of experiences) {
        const desc = (experience.description || '').toLowerCase();
        
        // Check for collaboration keywords
        let keywordsFound = 0;
        for (const keyword of collaborationKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          keywordsFound += matches.length;
        }
        
        // Team size mentions earn extra points
        const teamSizeMatches = desc.match(/team of (\d+)|(\d+)[- ]person team|(\d+) member/gi);
        if (teamSizeMatches) {
          keywordsFound += 3;
        }
        
        // Points for mentions of cross-team/department collaboration
        if (desc.includes('cross-department') || desc.includes('cross department') ||
            desc.includes('cross-team') || desc.includes('cross team') ||
            desc.includes('multiple teams') || desc.includes('several departments')) {
          keywordsFound += 3;
        }
        
        score += Math.min(20, keywordsFound * 2);
      }
      
      score = Math.min(score, 60);
      maxPossibleScore += 60;
      
      // Check projects for collaboration elements
      let projectCollaborationScore = 0;
      for (const project of projects) {
        const desc = (project.description || '').toLowerCase();
        
        // Check for collaboration keywords
        let keywordsFound = 0;
        for (const keyword of collaborationKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          keywordsFound += matches.length;
        }
        
        // Points for explicitly mentioned collaboration
        if (desc.includes('collaborated with') || desc.includes('working with') || 
            desc.includes('worked alongside') || desc.includes('partnered with')) {
          keywordsFound += 3;
        }
        
        projectCollaborationScore += Math.min(10, keywordsFound * 2);
      }
      
      projectCollaborationScore = Math.min(projectCollaborationScore, 40);
      score += projectCollaborationScore;
      maxPossibleScore += 40;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating collaboration score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate resilience score based on profile data
   */
  calculateResilienceScore(experiences: any[], education: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Resilience keywords
      const resilienceKeywords = [
        'overcom',
        'challeng',
        'adversity',
        'difficult',
        'obstacle',
        'persist',
        'persever',
        'recover',
        'adapt',
        'pivot',
        'crisis',
        'problem',
        'setback',
        'hurdle',
        'bounce back'
      ];
      
      // Check experiences for resilience indicators
      for (const experience of experiences) {
        const desc = (experience.description || '').toLowerCase();
        
        // Check for resilience keywords
        let keywordsFound = 0;
        for (const keyword of resilienceKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          keywordsFound += matches.length;
        }
        
        // Extra points for specific resilience phrases
        if (desc.includes('turned around') || desc.includes('despite') || 
            desc.includes('nevertheless') || desc.includes('in spite of')) {
          keywordsFound += 2;
        }
        
        if (desc.includes('failed') && (desc.includes('learned') || desc.includes('lesson'))) {
          keywordsFound += 3;
        }
        
        score += Math.min(15, keywordsFound * 2);
      }
      
      // Check for career pivots/shifts (indicating adaptability)
      let industries = new Set();
      let roles = new Set();
      for (const exp of experiences) {
        if (exp.industry) industries.add(exp.industry.toLowerCase());
        if (exp.title) roles.add(exp.title.toLowerCase());
      }
      
      // Points for diverse industry experience (indicates adaptability)
      if (industries.size >= 3) score += 15;
      else if (industries.size >= 2) score += 10;
      
      // Points for diverse role experience (indicates adaptability)
      if (roles.size >= 4) score += 15;
      else if (roles.size >= 3) score += 10;
      else if (roles.size >= 2) score += 5;
      
      // Check for concurrent education and work (indicates resilience)
      interface DateRange {
        start: Date;
        end: Date;
      }
      
      const educationPeriods: DateRange[] = [];
      for (const edu of education) {
        if (edu.start_date && edu.end_date) {
          educationPeriods.push({
            start: new Date(edu.start_date),
            end: new Date(edu.end_date)
          });
        }
      }
      
      const workPeriods: DateRange[] = [];
      for (const exp of experiences) {
        if (exp.start_date) {
          workPeriods.push({
            start: new Date(exp.start_date),
            end: exp.end_date ? new Date(exp.end_date) : new Date()
          });
        }
      }
      
      // Check for overlapping periods
      let hasOverlap = false;
      for (const edu of educationPeriods) {
        for (const work of workPeriods) {
          if ((edu.start <= work.end && edu.end >= work.start)) {
            hasOverlap = true;
            break;
          }
        }
        if (hasOverlap) break;
      }
      
      if (hasOverlap) score += 15;
      
      // Cap the score at 70 from experiences/education analysis
      score = Math.min(score, 70);
      maxPossibleScore += 70;
      
      // Add base resilience score - everyone has some baseline resilience
      score += 30;
      maxPossibleScore += 30;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating resilience score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Calculate innovation score based on profile data
   */
  calculateInnovationScore(projects: any[], experiences: any[]): number {
    try {
      let score = 0;
      let maxPossibleScore = 0;
      
      // Innovation keywords
      const innovationKeywords = [
        'innovat',
        'new',
        'novel',
        'groundbreaking',
        'cutting-edge',
        'cutting edge',
        'pioneering',
        'revolution',
        'transform',
        'disrupt',
        'first-of-its-kind',
        'first of its kind',
        'patent',
        'invent',
        'breakthrough'
      ];
      
      // Check projects for innovation indicators
      for (const project of projects) {
        const title = (project.name || '').toLowerCase();
        const desc = (project.description || '').toLowerCase();
        
        // Check for innovation keywords in title
        for (const keyword of innovationKeywords) {
          if (title.includes(keyword)) {
            score += 5;
            break;
          }
        }
        
        // Check for innovation keywords in description
        let keywordsFound = 0;
        for (const keyword of innovationKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          keywordsFound += matches.length;
        }
        
        // Extra points for patent mentions
        if (desc.includes('patent')) {
          keywordsFound += 3;
        }
        
        score += Math.min(10, keywordsFound * 2);
      }
      
      score = Math.min(score, 50);
      maxPossibleScore += 50;
      
      // Check experiences for innovation indicators
      for (const experience of experiences) {
        const title = (experience.title || '').toLowerCase();
        const desc = (experience.description || '').toLowerCase();
        
        // Check for innovation-related roles
        if (title.includes('innovat') || title.includes('r&d') || 
            title.includes('research') || title.includes('product')) {
          score += 10;
        }
        
        // Check for innovation keywords in description
        let keywordsFound = 0;
        for (const keyword of innovationKeywords) {
          const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
          const matches = desc.match(regex) || [];
          keywordsFound += matches.length;
        }
        
        score += Math.min(15, keywordsFound * 2);
      }
      
      score = Math.min(score, 100); // Cap at 100
      maxPossibleScore += 50;
      
      // Normalize to 100 scale
      return Math.min(100, Math.round((score / Math.max(1, maxPossibleScore)) * 100));
    } catch (error) {
      logger.error('Error calculating innovation score', { error });
      return 50; // Default to middle score on error
    }
  }

  /**
   * Helper method to calculate score based on matching skills
   */
  private calculateSkillsScore(skills: any[], relevantSkills: string[]): { score: number, maxPossible: number } {
    if (!skills || skills.length === 0) {
      return { score: 0, maxPossible: 0 };
    }
    
    let score = 0;
    const maxPossible = 30; // Cap at 30 points for skills
    
    for (const skill of skills) {
      const skillName = (skill.name || '').toLowerCase();
      
      for (const relevantSkill of relevantSkills) {
        if (skillName.includes(relevantSkill.toLowerCase())) {
          // Add points based on proficiency level if available
          if (skill.proficiency) {
            const proficiency = skill.proficiency.toLowerCase();
            if (proficiency.includes('expert') || proficiency.includes('advanced')) {
              score += 7;
            } else if (proficiency.includes('intermediate')) {
              score += 5;
            } else {
              score += 3;
            }
          } else {
            score += 5; // Default points if no proficiency specified
          }
          
          break;
        }
      }
    }
    
    return { score: Math.min(score, maxPossible), maxPossible };
  }
}