import logger from '../../utils/logger';
import { Trait } from '../models/trait.model';

/**
 * TraitRecommendationEngine
 * Generates recommendations based on trait analysis
 */
export class TraitRecommendationEngine {
  /**
   * Generate content emphasis recommendations
   * Suggests which content to emphasize based on trait strengths
   */
  generateContentEmphasisRecommendations(
    traits: Trait[],
    context?: {
      industry?: string;
      role?: string;
      audience?: string;
    }
  ): Array<{
    trait: string;
    score: number;
    emphasis: 'high' | 'medium' | 'low';
    contentTypes: string[];
    messagingRecommendations: string[];
    priority: number;
  }> {
    try {
      logger.info('Generating content emphasis recommendations', { context });
      
      if (!traits || traits.length === 0) {
        logger.warn('No traits provided for content recommendations');
        return [];
      }
      
      // Define content type mappings for different traits
      const traitContentMapping: Record<string, {
        contentTypes: string[];
        messagingRecommendations: string[];
        priorityMultiplier: number;
      }> = {
        'analytical thinking': {
          contentTypes: ['case studies', 'data analysis', 'research papers', 'problem solutions'],
          messagingRecommendations: [
            'Emphasize methodical problem-solving approach',
            'Highlight data-driven decision making',
            'Showcase analytical frameworks used'
          ],
          priorityMultiplier: 1.2
        },
        'problem solving': {
          contentTypes: ['case studies', 'solution demonstrations', 'before/after scenarios'],
          messagingRecommendations: [
            'Focus on challenges overcome',
            'Describe innovative solutions developed',
            'Quantify impact of problem resolution'
          ],
          priorityMultiplier: 1.3
        },
        'technical proficiency': {
          contentTypes: ['technical projects', 'code examples', 'system architectures', 'technical tutorials'],
          messagingRecommendations: [
            'Demonstrate depth of technical knowledge',
            'Showcase technical complexity handled',
            'Highlight technical certifications and specialized skills'
          ],
          priorityMultiplier: 1.1
        },
        'leadership': {
          contentTypes: ['team achievements', 'leadership stories', 'vision documents', 'strategic plans'],
          messagingRecommendations: [
            'Emphasize team development and mentoring',
            'Highlight strategic vision and execution',
            'Showcase decision-making process and outcomes'
          ],
          priorityMultiplier: 1.4
        },
        'communication': {
          contentTypes: ['presentations', 'articles', 'documentation', 'client communications'],
          messagingRecommendations: [
            'Demonstrate clear communication of complex ideas',
            'Showcase stakeholder communication successes',
            'Highlight effective knowledge transfer examples'
          ],
          priorityMultiplier: 1.2
        },
        'collaboration': {
          contentTypes: ['team projects', 'cross-functional initiatives', 'partnership outcomes'],
          messagingRecommendations: [
            'Highlight contributions to team success',
            'Showcase cross-functional collaboration',
            'Emphasize relationship building and maintenance'
          ],
          priorityMultiplier: 1.1
        },
        'innovation': {
          contentTypes: ['innovative projects', 'patents', 'novel solutions', 'creative approaches'],
          messagingRecommendations: [
            'Highlight original thinking and approaches',
            'Showcase innovative solutions developed',
            'Emphasize creative problem-solving'
          ],
          priorityMultiplier: 1.3
        },
        'strategic thinking': {
          contentTypes: ['strategic plans', 'vision documents', 'long-term impact projects'],
          messagingRecommendations: [
            'Emphasize big picture thinking',
            'Show connection between actions and long-term goals',
            'Highlight strategic insights that drove success'
          ],
          priorityMultiplier: 1.3
        },
        'adaptability': {
          contentTypes: ['change management stories', 'diverse project experience', 'technology transitions'],
          messagingRecommendations: [
            'Showcase ability to thrive in changing environments',
            'Highlight quick mastery of new skills or technologies',
            'Demonstrate successful pivots in approach when needed'
          ],
          priorityMultiplier: 1.1
        },
        'attention to detail': {
          contentTypes: ['quality assurance work', 'detailed specifications', 'precision-critical projects'],
          messagingRecommendations: [
            'Emphasize thoroughness and precision in work',
            'Highlight error prevention and quality control',
            'Showcase meticulous planning and implementation'
          ],
          priorityMultiplier: 1.0
        }
      };
      
      // Context-specific adjustments
      const industryPriorityAdjustments: Record<string, Record<string, number>> = {
        'technology': {
          'technical proficiency': 1.3,
          'innovation': 1.3,
          'problem solving': 1.2
        },
        'finance': {
          'analytical thinking': 1.3,
          'attention to detail': 1.3,
          'ethical judgment': 1.4
        },
        'healthcare': {
          'attention to detail': 1.4,
          'empathy': 1.3,
          'reliability': 1.3
        },
        'consulting': {
          'analytical thinking': 1.3,
          'communication': 1.4,
          'problem solving': 1.3
        },
        'creative': {
          'innovation': 1.5,
          'creativity': 1.5,
          'adaptability': 1.2
        }
      };
      
      // Role-specific adjustments
      const rolePriorityAdjustments: Record<string, Record<string, number>> = {
        'manager': {
          'leadership': 1.5,
          'communication': 1.3,
          'strategic thinking': 1.3
        },
        'developer': {
          'technical proficiency': 1.5,
          'problem solving': 1.3,
          'attention to detail': 1.2
        },
        'designer': {
          'creativity': 1.5,
          'user focus': 1.4,
          'visual thinking': 1.4
        },
        'analyst': {
          'analytical thinking': 1.5,
          'attention to detail': 1.3,
          'data literacy': 1.4
        },
        'executive': {
          'strategic thinking': 1.5,
          'leadership': 1.4,
          'business acumen': 1.4
        }
      };
      
      // Generate recommendations for each trait
      const recommendations: Array<{
        trait: string;
        score: number;
        emphasis: 'high' | 'medium' | 'low';
        contentTypes: string[];
        messagingRecommendations: string[];
        priority: number;
      }> = [];
      
      // Process each trait
      traits.forEach(trait => {
        // Skip traits with low scores
        if (trait.score < 40) {
          return;
        }
        
        // Get content mapping for this trait
        const mapping = traitContentMapping[trait.name.toLowerCase()];
        
        // Skip traits we don't have mappings for
        if (!mapping) {
          return;
        }
        
        // Determine emphasis level based on score
        let emphasis: 'high' | 'medium' | 'low';
        if (trait.score >= 80) {
          emphasis = 'high';
        } else if (trait.score >= 60) {
          emphasis = 'medium';
        } else {
          emphasis = 'low';
        }
        
        // Calculate base priority from score and trait mapping
        let priority = (trait.score / 100) * 10 * mapping.priorityMultiplier;
        
        // Apply context-specific adjustments
        if (context?.industry) {
          const industryAdjustments = industryPriorityAdjustments[context.industry.toLowerCase()];
          if (industryAdjustments && industryAdjustments[trait.name.toLowerCase()]) {
            priority *= industryAdjustments[trait.name.toLowerCase()];
          }
        }
        
        if (context?.role) {
          const roleAdjustments = rolePriorityAdjustments[context.role.toLowerCase()];
          if (roleAdjustments && roleAdjustments[trait.name.toLowerCase()]) {
            priority *= roleAdjustments[trait.name.toLowerCase()];
          }
        }
        
        recommendations.push({
          trait: trait.name,
          score: trait.score,
          emphasis,
          contentTypes: mapping.contentTypes,
          messagingRecommendations: mapping.messagingRecommendations,
          priority: Math.round(priority)
        });
      });
      
      // Sort by priority (highest first)
      return recommendations.sort((a, b) => b.priority - a.priority);
    } catch (error) {
      logger.error('Error generating content emphasis recommendations', { error });
      return [];
    }
  }

  /**
   * Generate skill development recommendations
   * Suggests skills to develop based on trait analysis and career goals
   */
  generateSkillDevelopmentRecommendations(
    traits: Trait[],
    options: {
      careerGoal?: string;
      targetRole?: string;
      targetIndustry?: string;
      currentRole?: string;
    }
  ): Array<{
    trait: string;
    currentScore: number;
    recommendedScore: number;
    gap: number;
    developmentImportance: number;
    resources: Array<{
      type: string;
      description: string;
      url?: string;
    }>;
    actions: string[];
  }> {
    try {
      logger.info('Generating skill development recommendations', { options });
      
      if (!traits || traits.length === 0) {
        logger.warn('No traits provided for skill development recommendations');
        return [];
      }
      
      // Define target trait profiles for different roles
      const roleTraitProfiles: Record<string, Array<{
        trait: string;
        importance: number;
        targetScore: number;
      }>> = {
        'software developer': [
          { trait: 'technical proficiency', importance: 9, targetScore: 85 },
          { trait: 'problem solving', importance: 9, targetScore: 80 },
          { trait: 'attention to detail', importance: 7, targetScore: 75 },
          { trait: 'continuous learning', importance: 8, targetScore: 80 },
          { trait: 'analytical thinking', importance: 8, targetScore: 75 },
          { trait: 'collaboration', importance: 6, targetScore: 70 }
        ],
        'project manager': [
          { trait: 'leadership', importance: 8, targetScore: 80 },
          { trait: 'communication', importance: 9, targetScore: 85 },
          { trait: 'organization', importance: 8, targetScore: 80 },
          { trait: 'time management', importance: 8, targetScore: 80 },
          { trait: 'problem solving', importance: 7, targetScore: 75 },
          { trait: 'adaptability', importance: 7, targetScore: 75 }
        ],
        'data scientist': [
          { trait: 'analytical thinking', importance: 9, targetScore: 85 },
          { trait: 'technical proficiency', importance: 8, targetScore: 80 },
          { trait: 'problem solving', importance: 8, targetScore: 80 },
          { trait: 'attention to detail', importance: 7, targetScore: 75 },
          { trait: 'continuous learning', importance: 8, targetScore: 80 },
          { trait: 'communication', importance: 6, targetScore: 70 }
        ],
        'designer': [
          { trait: 'creativity', importance: 9, targetScore: 85 },
          { trait: 'user focus', importance: 8, targetScore: 80 },
          { trait: 'communication', importance: 7, targetScore: 75 },
          { trait: 'visual thinking', importance: 9, targetScore: 85 },
          { trait: 'attention to detail', importance: 7, targetScore: 75 },
          { trait: 'collaboration', importance: 6, targetScore: 70 }
        ],
        'team lead': [
          { trait: 'leadership', importance: 9, targetScore: 85 },
          { trait: 'communication', importance: 9, targetScore: 85 },
          { trait: 'decision making', importance: 8, targetScore: 80 },
          { trait: 'delegation', importance: 7, targetScore: 75 },
          { trait: 'mentoring', importance: 8, targetScore: 80 },
          { trait: 'problem solving', importance: 7, targetScore: 75 }
        ]
      };
      
      // Define development resources for different traits
      const traitDevelopmentResources: Record<string, Array<{
        type: string;
        description: string;
        url?: string;
      }>> = {
        'technical proficiency': [
          { type: 'course', description: 'Advanced technical certification in your core technology' },
          { type: 'practice', description: 'Build a complex project using advanced features' },
          { type: 'community', description: 'Join technical communities and contribute to discussions' }
        ],
        'problem solving': [
          { type: 'course', description: 'Problem-solving techniques and methodologies' },
          { type: 'practice', description: 'Solve algorithmic challenges regularly' },
          { type: 'book', description: 'Read "Thinking, Fast and Slow" by Daniel Kahneman' }
        ],
        'leadership': [
          { type: 'course', description: 'Leadership development program' },
          { type: 'mentor', description: 'Find a leadership mentor' },
          { type: 'practice', description: 'Lead a small team or project initiative' }
        ],
        'communication': [
          { type: 'course', description: 'Business communication skills' },
          { type: 'practice', description: 'Create presentations and technical documentation' },
          { type: 'workshop', description: 'Public speaking workshop' }
        ],
        'analytical thinking': [
          { type: 'course', description: 'Data analysis fundamentals' },
          { type: 'practice', description: 'Conduct analysis on real-world datasets' },
          { type: 'book', description: 'Read "The Art of Thinking Clearly" by Rolf Dobelli' }
        ],
        'attention to detail': [
          { type: 'practice', description: 'Quality assurance exercises' },
          { type: 'technique', description: 'Implement checklists for important tasks' },
          { type: 'habit', description: 'Practice regular code reviews and documentation audits' }
        ],
        'adaptability': [
          { type: 'course', description: 'Change management skills' },
          { type: 'practice', description: 'Learn a new technology or methodology' },
          { type: 'habit', description: 'Regularly take on projects outside your comfort zone' }
        ],
        'collaboration': [
          { type: 'workshop', description: 'Team dynamics and collaborative problem solving' },
          { type: 'practice', description: 'Contribute to open-source projects' },
          { type: 'technique', description: 'Facilitation and consensus-building skills' }
        ],
        'innovation': [
          { type: 'course', description: 'Creative problem-solving techniques' },
          { type: 'practice', description: 'Innovation workshops and ideation sessions' },
          { type: 'book', description: 'Read "Where Good Ideas Come From" by Steven Johnson' }
        ],
        'strategic thinking': [
          { type: 'course', description: 'Strategic planning and business strategy' },
          { type: 'practice', description: 'Create a strategic plan for a project or initiative' },
          { type: 'mentor', description: 'Find a mentor with strategic leadership experience' }
        ]
      };
      
      // Define development actions for different traits
      const traitDevelopmentActions: Record<string, string[]> = {
        'technical proficiency': [
          'Complete one advanced technical course each quarter',
          'Build a complex project using technologies you want to master',
          'Teach others to solidify your understanding'
        ],
        'problem solving': [
          'Practice algorithmic problem-solving regularly',
          'Analyze past projects to identify alternative solutions',
          'Mentor others on problem-solving approaches'
        ],
        'leadership': [
          'Volunteer to lead small projects or initiatives',
          'Seek feedback on your leadership approach',
          'Study leadership styles and adapt them to your context'
        ],
        'communication': [
          'Practice explaining complex concepts in simple terms',
          'Request opportunities to present to teams or clients',
          'Join a public speaking group like Toastmasters'
        ],
        'analytical thinking': [
          'Break down complex problems into smaller components',
          'Practice data analysis with real-world datasets',
          'Implement structured analytical frameworks in your work'
        ],
        'attention to detail': [
          'Implement personal review checklists',
          'Set up automated quality checks where possible',
          'Schedule dedicated review time for important deliverables'
        ],
        'adaptability': [
          'Regularly learn new skills outside your core expertise',
          'Volunteer for projects with unfamiliar elements',
          'Practice responding constructively to unexpected changes'
        ],
        'collaboration': [
          'Actively seek diverse perspectives on your projects',
          'Practice active listening in team settings',
          'Build relationships across different teams or departments'
        ],
        'innovation': [
          'Schedule regular time for creative thinking',
          'Implement an idea capture system',
          'Prototype and test new ideas frequently'
        ],
        'strategic thinking': [
          'Regularly connect your work to broader business goals',
          'Analyze industry trends and their implications',
          'Practice scenario planning for future challenges'
        ]
      };
      
      // Create a map of current trait scores
      const currentTraits: Record<string, number> = {};
      traits.forEach(trait => {
        currentTraits[trait.name.toLowerCase()] = trait.score;
      });
      
      // Determine target role trait profile
      const targetRole = options.targetRole?.toLowerCase() || '';
      let targetTraitProfile = roleTraitProfiles[targetRole];
      
      if (!targetTraitProfile && options.careerGoal) {
        // Try to match career goal to a role
        const careerGoal = options.careerGoal.toLowerCase();
        for (const [role, profile] of Object.entries(roleTraitProfiles)) {
          if (careerGoal.includes(role)) {
            targetTraitProfile = profile;
            break;
          }
        }
      }
      
      // If no specific target role, use a general development approach
      if (!targetTraitProfile) {
        // Create recommendations based on current trait scores
        return traits
          .filter(trait => trait.score < 70) // Focus on traits below 70
          .map(trait => {
            const traitName = trait.name.toLowerCase();
            const resources = traitDevelopmentResources[traitName] || [
              { type: 'general', description: 'Seek training and mentorship in this area' }
            ];
            
            const actions = traitDevelopmentActions[traitName] || [
              'Seek opportunities to practice this skill',
              'Request feedback specifically about this trait',
              'Set specific goals to improve this trait'
            ];
            
            return {
              trait: trait.name,
              currentScore: trait.score,
              recommendedScore: Math.min(100, trait.score + 15),
              gap: 15,
              developmentImportance: 5,
              resources,
              actions
            };
          })
          .sort((a, b) => b.gap - a.gap);
      }
      
      // Generate development recommendations based on target role
      const recommendations: Array<{
        trait: string;
        currentScore: number;
        recommendedScore: number;
        gap: number;
        developmentImportance: number;
        resources: Array<{
          type: string;
          description: string;
          url?: string;
        }>;
        actions: string[];
      }> = [];
      
      targetTraitProfile.forEach(targetTrait => {
        const traitName = targetTrait.trait.toLowerCase();
        const currentScore = currentTraits[traitName] || 0;
        const gap = targetTrait.targetScore - currentScore;
        
        // Only include if there's a meaningful gap
        if (gap > 5) {
          const resources = traitDevelopmentResources[traitName] || [
            { type: 'general', description: 'Seek training and mentorship in this area' }
          ];
          
          const actions = traitDevelopmentActions[traitName] || [
            'Seek opportunities to practice this skill',
            'Request feedback specifically about this trait',
            'Set specific goals to improve this trait'
          ];
          
          recommendations.push({
            trait: targetTrait.trait,
            currentScore,
            recommendedScore: targetTrait.targetScore,
            gap,
            developmentImportance: targetTrait.importance,
            resources,
            actions
          });
        }
      });
      
      // Sort by development importance and gap
      return recommendations.sort((a, b) => 
        (b.developmentImportance * b.gap) - (a.developmentImportance * a.gap)
      );
    } catch (error) {
      logger.error('Error generating skill development recommendations', { error });
      return [];
    }
  }

  /**
   * Generate career path recommendations
   * Suggests potential career paths based on trait strengths
   */
  generateCareerPathRecommendations(
    traits: Trait[],
    options?: {
      currentRole?: string;
      experience?: number; // years
      industry?: string;
      preferences?: string[];
    }
  ): Array<{
    path: string;
    description: string;
    matchScore: number;
    keyTraits: Array<{
      name: string;
      importance: number;
      userScore: number;
    }>;
    development: {
      requiredTraits: string[];
      timeline: string;
      nextSteps: string[];
    };
  }> {
    try {
      logger.info('Generating career path recommendations', { options });
      
      if (!traits || traits.length === 0) {
        logger.warn('No traits provided for career path recommendations');
        return [];
      }
      
      // Define career paths and their trait requirements
      const careerPaths: Array<{
        path: string;
        description: string;
        traitRequirements: Array<{
          trait: string;
          importance: number; // 1-10
          minimumScore: number;
        }>;
        experience: {
          min: number;
          preferred: number;
        };
        development: {
          requiredTraits: string[];
          timeline: string;
          nextSteps: string[];
        };
        industries?: string[];
      }> = [
        {
          path: 'Technical Leadership',
          description: 'Lead technical teams and projects, providing technical direction and mentoring',
          traitRequirements: [
            { trait: 'technical proficiency', importance: 9, minimumScore: 75 },
            { trait: 'leadership', importance: 8, minimumScore: 70 },
            { trait: 'communication', importance: 7, minimumScore: 65 },
            { trait: 'mentoring', importance: 7, minimumScore: 65 },
            { trait: 'strategic thinking', importance: 6, minimumScore: 60 }
          ],
          experience: { min: 3, preferred: 5 },
          development: {
            requiredTraits: ['decision making', 'delegation', 'strategic planning'],
            timeline: '1-2 years depending on leadership experience',
            nextSteps: [
              'Take on technical lead role for small projects',
              'Develop mentoring relationships with junior staff',
              'Create architectural vision for a product or feature'
            ]
          }
        },
        {
          path: 'Solutions Architecture',
          description: 'Design and implement technical solutions that address complex business needs',
          traitRequirements: [
            { trait: 'systems thinking', importance: 9, minimumScore: 75 },
            { trait: 'technical proficiency', importance: 8, minimumScore: 70 },
            { trait: 'problem solving', importance: 8, minimumScore: 70 },
            { trait: 'communication', importance: 7, minimumScore: 65 },
            { trait: 'business acumen', importance: 6, minimumScore: 60 }
          ],
          experience: { min: 4, preferred: 7 },
          development: {
            requiredTraits: ['strategic thinking', 'stakeholder management', 'technical breadth'],
            timeline: '1-3 years depending on architectural experience',
            nextSteps: [
              'Gain exposure to multiple technology domains',
              'Practice solution design documentation',
              'Develop understanding of business domain'
            ]
          }
        },
        {
          path: 'Product Management',
          description: 'Lead product development, working with customers and development teams to deliver value',
          traitRequirements: [
            { trait: 'strategic thinking', importance: 8, minimumScore: 70 },
            { trait: 'communication', importance: 8, minimumScore: 70 },
            { trait: 'user focus', importance: 8, minimumScore: 70 },
            { trait: 'business acumen', importance: 7, minimumScore: 65 },
            { trait: 'problem solving', importance: 7, minimumScore: 65 }
          ],
          experience: { min: 2, preferred: 5 },
          development: {
            requiredTraits: ['stakeholder management', 'prioritization', 'market awareness'],
            timeline: '1-2 years depending on product experience',
            nextSteps: [
              'Take product ownership of a small feature',
              'Develop user research skills',
              'Practice creating product requirements documents'
            ]
          }
        },
        {
          path: 'Data Science / AI',
          description: 'Apply advanced analytics, statistical modeling, and machine learning to solve complex problems',
          traitRequirements: [
            { trait: 'analytical thinking', importance: 9, minimumScore: 75 },
            { trait: 'technical proficiency', importance: 8, minimumScore: 70 },
            { trait: 'problem solving', importance: 8, minimumScore: 70 },
            { trait: 'attention to detail', importance: 7, minimumScore: 65 },
            { trait: 'continuous learning', importance: 7, minimumScore: 65 }
          ],
          experience: { min: 1, preferred: 3 },
          development: {
            requiredTraits: ['statistical thinking', 'data literacy', 'research methodology'],
            timeline: '1-2 years with focused study',
            nextSteps: [
              'Complete foundational courses in statistics and ML',
              'Work on practical data science projects',
              'Develop expertise in one or more ML frameworks'
            ]
          }
        },
        {
          path: 'DevOps Engineering',
          description: 'Build and maintain the infrastructure and deployment pipelines for software delivery',
          traitRequirements: [
            { trait: 'technical proficiency', importance: 8, minimumScore: 70 },
            { trait: 'systems thinking', importance: 8, minimumScore: 70 },
            { trait: 'automation focus', importance: 8, minimumScore: 70 },
            { trait: 'problem solving', importance: 7, minimumScore: 65 },
            { trait: 'reliability', importance: 7, minimumScore: 65 }
          ],
          experience: { min: 2, preferred: 4 },
          development: {
            requiredTraits: ['security awareness', 'scalability thinking', 'continuous improvement'],
            timeline: '1-2 years with infrastructure focus',
            nextSteps: [
              'Learn major cloud platforms and services',
              'Implement CI/CD pipelines for projects',
              'Develop infrastructure-as-code skills'
            ]
          }
        }
      ];
      
      // Create trait score map for easy lookup
      const traitScores: Record<string, number> = {};
      traits.forEach(trait => {
        traitScores[trait.name.toLowerCase()] = trait.score;
      });
      
      // Calculate match scores for each career path
      const recommendations = careerPaths.map(path => {
        // Check industry match if specified
        if (options?.industry && path.industries && 
            !path.industries.some(i => i.toLowerCase() === options.industry?.toLowerCase())) {
          // Skip paths that don't match the specified industry
          return null;
        }
        
        let totalWeightedScore = 0;
        let totalWeight = 0;
        let matchingTraits = 0;
        
        const keyTraits: Array<{
          name: string;
          importance: number;
          userScore: number;
        }> = [];
        
        // Calculate match score based on trait requirements
        path.traitRequirements.forEach(req => {
          const traitName = req.trait.toLowerCase();
          const userScore = traitScores[traitName] || 0;
          
          keyTraits.push({
            name: req.trait,
            importance: req.importance,
            userScore
          });
          
          // Weight the score by trait importance
          const weightedScore = userScore * req.importance;
          totalWeightedScore += weightedScore;
          totalWeight += req.importance * 100; // maximum possible score for this trait
          
          // Count traits that meet minimum requirements
          if (userScore >= req.minimumScore) {
            matchingTraits++;
          }
        });
        
        // Calculate match percentage
        let matchScore = Math.round((totalWeightedScore / totalWeight) * 100);
        
        // Adjust for experience level
        const userExperience = options?.experience || 0;
        if (userExperience < path.experience.min) {
          // Reduce match score if experience is below minimum
          matchScore -= 10;
        } else if (userExperience >= path.experience.preferred) {
          // Boost match score if experience meets preferred level
          matchScore += 5;
        }
        
        // Adjust for preferences if specified
        if (options?.preferences && options.preferences.length > 0) {
          const pathLower = path.path.toLowerCase();
          const descLower = path.description.toLowerCase();
          
          // Check if any preferences match the path
          const matchingPreferences = options.preferences.filter(pref => {
            const prefLower = pref.toLowerCase();
            return pathLower.includes(prefLower) || descLower.includes(prefLower);
          });
          
          // Boost score based on matching preferences
          if (matchingPreferences.length > 0) {
            matchScore += matchingPreferences.length * 5;
          }
        }
        
        // Cap match score at 100
        matchScore = Math.min(100, Math.max(0, matchScore));
        
        return {
          path: path.path,
          description: path.description,
          matchScore,
          keyTraits,
          development: path.development
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) // Remove null entries with type guard
      .sort((a, b) => b.matchScore - a.matchScore); // Sort by match score
      
      // Return top recommendations
      return recommendations.slice(0, 5);
    } catch (error) {
      logger.error('Error generating career path recommendations', { error });
      return [];
    }
  }

  /**
   * Generate communication style guidance
   * Suggests communication approaches based on trait profile
   */
  generateCommunicationStyleGuidance(
    traits: Trait[],
    options?: {
      audience?: string;
      context?: string;
    }
  ): {
    overallStyle: string;
    strengths: string[];
    suggestions: Array<{
      aspect: string;
      guidance: string;
      priority: number;
    }>;
    audienceSpecific?: Array<{
      audience: string;
      recommendations: string[];
    }>;
  } {
    try {
      logger.info('Generating communication style guidance', { options });
      
      if (!traits || traits.length === 0) {
        logger.warn('No traits provided for communication guidance');
        return {
          overallStyle: 'Balanced communication',
          strengths: ['General communication skills'],
          suggestions: [{
            aspect: 'General communication',
            guidance: 'Develop a clear communication style appropriate to your context',
            priority: 5
          }]
        };
      }
      
      // Create trait score map for easy lookup
      const traitScores: Record<string, number> = {};
      traits.forEach(trait => {
        traitScores[trait.name.toLowerCase()] = trait.score;
      });
      
      // Communication-related traits
      const communicationTraits = [
        'communication',
        'empathy',
        'persuasion',
        'negotiation',
        'listening',
        'clarity',
        'presentation',
        'storytelling',
        'writing',
        'emotional intelligence'
      ];
      
      // Define communication styles based on trait combinations
      const determineStyle = (): string => {
        const analytical = traitScores['analytical thinking'] || 0;
        const empathy = traitScores['empathy'] || 0;
        const leadership = traitScores['leadership'] || 0;
        const detail = traitScores['attention to detail'] || 0;
        const innovation = traitScores['innovation'] || 0;
        const communication = traitScores['communication'] || 0;
        
        if (analytical > 75 && detail > 70) {
          return 'Precise and data-driven communicator';
        } else if (empathy > 75 && communication > 70) {
          return 'Empathetic and connective communicator';
        } else if (leadership > 75 && (traitScores['persuasion'] || 0) > 70) {
          return 'Confident and persuasive communicator';
        } else if (innovation > 75 && communication > 70) {
          return 'Creative and engaging communicator';
        } else if (analytical > 70 && communication < 60) {
          return 'Analytical communicator who may benefit from more engagement';
        } else if (communication > 75) {
          return 'Skilled all-around communicator';
        } else {
          return 'Balanced communicator with mixed strengths';
        }
      };
      
      // Determine communication strengths
      const determineStrengths = (): string[] => {
        const strengths: string[] = [];
        
        if ((traitScores['communication'] || 0) > 70) {
          strengths.push('Strong general communication skills');
        }
        
        if ((traitScores['empathy'] || 0) > 70) {
          strengths.push('Ability to understand and connect with others');
        }
        
        if ((traitScores['persuasion'] || 0) > 70) {
          strengths.push('Effective at persuasive communication');
        }
        
        if ((traitScores['analytical thinking'] || 0) > 70 && (traitScores['communication'] || 0) > 60) {
          strengths.push('Clear presentation of complex information');
        }
        
        if ((traitScores['storytelling'] || 0) > 70 || (traitScores['creativity'] || 0) > 75) {
          strengths.push('Engaging narrative communication style');
        }
        
        if ((traitScores['listening'] || 0) > 70) {
          strengths.push('Strong active listening skills');
        }
        
        if ((traitScores['writing'] || 0) > 70) {
          strengths.push('Effective written communication');
        }
        
        // Default if no specific strengths found
        if (strengths.length === 0) {
          strengths.push('Balanced communication approach');
        }
        
        return strengths;
      };
      
      // Generate communication suggestions
      const generateSuggestions = (): Array<{
        aspect: string;
        guidance: string;
        priority: number;
      }> => {
        const suggestions: Array<{
          aspect: string;
          guidance: string;
          priority: number;
        }> = [];
        
        // Check for gaps and opportunities
        const communication = traitScores['communication'] || 50;
        const listening = traitScores['listening'] || communication - 10;
        const empathy = traitScores['empathy'] || 50;
        const persuasion = traitScores['persuasion'] || 50;
        const analytical = traitScores['analytical thinking'] || 50;
        const organization = traitScores['organization'] || 50;
        
        if (communication < 70) {
          suggestions.push({
            aspect: 'General Communication',
            guidance: 'Focus on developing clear and concise communication skills through practice and feedback',
            priority: 9
          });
        }
        
        if (listening < 70) {
          suggestions.push({
            aspect: 'Active Listening',
            guidance: 'Practice active listening by focusing fully on speakers, asking clarifying questions, and summarizing to confirm understanding',
            priority: 8
          });
        }
        
        if (empathy < 70 && options?.audience) {
          suggestions.push({
            aspect: 'Audience Awareness',
            guidance: 'Before communicating, consider your audience\'s perspective, knowledge level, and needs',
            priority: 8
          });
        }
        
        if (analytical > 75 && empathy < 65) {
          suggestions.push({
            aspect: 'Technical Translation',
            guidance: 'When discussing technical topics, translate complex concepts into accessible language for non-technical stakeholders',
            priority: 7
          });
        }
        
        if (persuasion < 65 && options?.context === 'leadership') {
          suggestions.push({
            aspect: 'Persuasive Communication',
            guidance: 'Enhance your ability to influence by connecting ideas to audience values and providing clear benefits',
            priority: 7
          });
        }
        
        if (organization < 65) {
          suggestions.push({
            aspect: 'Structured Communication',
            guidance: 'Use frameworks like STAR (Situation, Task, Action, Result) to organize your messages more effectively',
            priority: 6
          });
        }
        
        // Add general improvement suggestion if few specific ones
        if (suggestions.length < 2) {
          suggestions.push({
            aspect: 'Communication Versatility',
            guidance: 'Develop versatility in your communication style to adapt to different audiences and contexts',
            priority: 5
          });
        }
        
        return suggestions.sort((a, b) => b.priority - a.priority);
      };
      
      // Generate audience-specific recommendations if audience is provided
      const generateAudienceRecommendations = (): Array<{
        audience: string;
        recommendations: string[];
      }> | undefined => {
        if (!options?.audience) return undefined;
        
        const audienceMap: Record<string, Array<string>> = {
          'technical': [
            'Focus on precision and accuracy in your communication',
            'Provide sufficient technical detail while avoiding unnecessary complexity',
            'Use data and evidence to support your points'
          ],
          'executive': [
            'Focus on business impact and strategic relevance',
            'Be concise and get to the key points quickly',
            'Connect technical details to business outcomes'
          ],
          'client': [
            'Emphasize value and benefits rather than technical features',
            'Use clear language, avoiding jargon and acronyms',
            'Listen closely to understand their specific needs and concerns'
          ],
          'team': [
            'Balance clarity and detail in your communication',
            'Create space for questions and discussion',
            'Be transparent about challenges and limitations'
          ]
        };
        
        const audience = options.audience.toLowerCase();
        let audienceType: string | undefined;
        
        for (const type of Object.keys(audienceMap)) {
          if (audience.includes(type)) {
            audienceType = type;
            break;
          }
        }
        
        if (!audienceType) {
          return [{
            audience: options.audience,
            recommendations: [
              'Adapt your communication style to match their level of technical understanding',
              'Ask questions to ensure your message is being understood as intended',
              'Balance detail with clarity based on their needs'
            ]
          }];
        }
        
        return [{
          audience: audienceType,
          recommendations: audienceMap[audienceType]
        }];
      };
      
      // Generate the overall response
      return {
        overallStyle: determineStyle(),
        strengths: determineStrengths(),
        suggestions: generateSuggestions(),
        audienceSpecific: generateAudienceRecommendations()
      };
    } catch (error) {
      logger.error('Error generating communication style guidance', { error });
      return {
        overallStyle: 'Error determining communication style',
        strengths: [],
        suggestions: [{
          aspect: 'General communication',
          guidance: 'Work on developing clear and effective communication',
          priority: 5
        }]
      };
    }
  }
}