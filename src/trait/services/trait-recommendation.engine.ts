import logger from '../../logger';
import { TraitRecommendation, TraitBenchmark } from '../models/trait.model';
import { TraitAnalyticsEngine } from './trait-analytics.engine';

/**
 * Engine for generating trait-based recommendations and insights
 * Provides personalized development recommendations and benchmark comparisons
 */
export class TraitRecommendationEngine {
  private analyticsEngine: TraitAnalyticsEngine;
  
  // Industry benchmark data by trait and industry
  private readonly industryBenchmarks: Record<string, Record<string, TraitBenchmark>> = {
    'Technology': {
      'Analytical Thinking': { minimum: 65, target: 80, exceptional: 90, importance: 'critical' },
      'Systems Thinking': { minimum: 70, target: 85, exceptional: 95, importance: 'critical' },
      'Problem Solving': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Communication': { minimum: 65, target: 75, exceptional: 90, importance: 'high' },
      'Leadership': { minimum: 60, target: 75, exceptional: 85, importance: 'medium' }
    },
    'Finance': {
      'Analytical Thinking': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Problem Solving': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Communication': { minimum: 65, target: 75, exceptional: 85, importance: 'high' },
      'Leadership': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Efficiency': { minimum: 70, target: 80, exceptional: 90, importance: 'critical' }
    },
    'Healthcare': {
      'Communication': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Problem Solving': { minimum: 70, target: 80, exceptional: 90, importance: 'critical' },
      'Resilience': { minimum: 70, target: 85, exceptional: 95, importance: 'critical' },
      'Collaboration': { minimum: 75, target: 85, exceptional: 95, importance: 'high' },
      'Adaptability': { minimum: 70, target: 80, exceptional: 90, importance: 'high' }
    },
    'Consulting': {
      'Communication': { minimum: 80, target: 90, exceptional: 95, importance: 'critical' },
      'Problem Solving': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Leadership': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Strategic Thinking': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Adaptability': { minimum: 70, target: 80, exceptional: 90, importance: 'high' }
    },
    'Manufacturing': {
      'Efficiency': { minimum: 75, target: 85, exceptional: 95, importance: 'critical' },
      'Problem Solving': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Systems Thinking': { minimum: 65, target: 75, exceptional: 85, importance: 'high' },
      'Collaboration': { minimum: 65, target: 75, exceptional: 85, importance: 'high' },
      'Leadership': { minimum: 65, target: 75, exceptional: 85, importance: 'medium' }
    },
    // Default benchmarks when no industry is specified
    'Default': {
      'Analytical Thinking': { minimum: 65, target: 75, exceptional: 90, importance: 'high' },
      'Systems Thinking': { minimum: 65, target: 75, exceptional: 85, importance: 'medium' },
      'Problem Solving': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Communication': { minimum: 70, target: 80, exceptional: 90, importance: 'critical' },
      'Leadership': { minimum: 65, target: 75, exceptional: 85, importance: 'medium' },
      'Strategic Thinking': { minimum: 65, target: 75, exceptional: 90, importance: 'high' },
      'Adaptability': { minimum: 65, target: 75, exceptional: 90, importance: 'high' },
      'Resilience': { minimum: 65, target: 75, exceptional: 85, importance: 'medium' },
      'Collaboration': { minimum: 70, target: 80, exceptional: 90, importance: 'high' },
      'Efficiency': { minimum: 65, target: 75, exceptional: 85, importance: 'medium' },
      'Initiative': { minimum: 60, target: 70, exceptional: 85, importance: 'medium' },
      'Creative Thinking': { minimum: 60, target: 70, exceptional: 85, importance: 'medium' },
      'Innovation': { minimum: 60, target: 70, exceptional: 85, importance: 'medium' }
    }
  };
  
  // Recommendations by trait and gap level
  private readonly traitRecommendations: Record<string, Record<string, string[]>> = {
    'Analytical Thinking': {
      'large': [
        'Enroll in a formal course on data analysis or statistics',
        'Set aside time daily to practice analytical exercises',
        'Join a study group focused on analytical problem-solving',
        'Seek opportunities to analyze complex datasets in your current role'
      ],
      'medium': [
        'Read books on logical reasoning and analytical frameworks',
        'Practice breaking down problems into smaller components',
        'Subscribe to publications that emphasize analytical thinking',
        'Request projects that involve data interpretation'
      ],
      'small': [
        'Join online forums discussing analytical approaches',
        'Begin documenting your analytical processes',
        'Schedule regular reviews of your analytical work',
        'Seek feedback on your analytical outputs from peers'
      ]
    },
    'Systems Thinking': {
      'large': [
        'Take a comprehensive course on systems theory and thinking',
        'Seek mentorship from experienced systems thinkers in your field',
        'Read foundational texts on systems thinking by Peter Senge or Donella Meadows',
        'Participate in cross-functional projects to understand interconnections'
      ],
      'medium': [
        'Practice creating systems maps for complex problems',
        'Attend workshops on system dynamics and modeling',
        'Analyze case studies involving complex systems',
        'Join communities of practice focused on systems approaches'
      ],
      'small': [
        'Begin incorporating systems considerations in your daily work',
        'Look for feedback loops and unintended consequences in your projects',
        'Practice visualizing relationships between components',
        'Reflect on how changes in one area affect other areas'
      ]
    },
    'Communication': {
      'large': [
        'Join Toastmasters or a similar public speaking organization',
        'Enroll in a comprehensive communications course',
        'Work with a communication coach for personalized feedback',
        'Volunteer for roles that center heavily on communication'
      ],
      'medium': [
        'Actively practice structuring your messages for clarity',
        'Record presentations and analyze your communication style',
        'Request regular feedback on your communication effectiveness',
        'Take on projects requiring diverse communication methods'
      ],
      'small': [
        'Read books on effective communication techniques',
        'Practice active listening in your conversations',
        'Focus on simplifying complex topics when explaining them',
        'Pay attention to non-verbal cues in your interactions'
      ]
    },
    'Leadership': {
      'large': [
        'Enroll in a formal leadership development program',
        'Seek mentorship from respected leaders in your field',
        'Request to lead significant projects to gain experience',
        'Join leadership organizations or communities of practice'
      ],
      'medium': [
        'Take on leadership roles in community or volunteer organizations',
        'Read books by respected leadership thinkers',
        'Attend leadership workshops and seminars',
        'Practice delegation and effective feedback techniques'
      ],
      'small': [
        'Identify and emulate leadership behaviors you admire',
        'Request more responsibility in your current role',
        'Journal about your leadership experiences and learnings',
        'Seek feedback on your leadership approach from peers'
      ]
    },
    'Strategic Thinking': {
      'large': [
        'Enroll in courses that focus on strategic planning and analysis',
        'Participate in strategy development for your organization',
        'Practice scenario planning and long-term forecasting',
        'Study strategic case studies from your industry'
      ],
      'medium': [
        'Regularly schedule time for long-term thinking',
        'Analyze competitors and market trends in your industry',
        'Read books focused on strategic planning methods',
        'Start contributing strategic ideas in meetings'
      ],
      'small': [
        'Develop the habit of considering long-term implications',
        'Connect daily tasks to broader organizational goals',
        'Practice prioritizing based on strategic impact',
        'Subscribe to publications that discuss industry strategy'
      ]
    },
    'Problem Solving': {
      'large': [
        'Take courses in decision making and problem-solving methodologies',
        'Volunteer to solve complex problems in your organization',
        'Study design thinking and systematic problem-solving approaches',
        'Join communities that tackle challenging problems in your field'
      ],
      'medium': [
        'Practice using different problem-solving frameworks',
        'Regularly challenge yourself with problems outside your comfort zone',
        'Document your problem-solving processes and outcomes',
        'Seek feedback on your approaches to complex issues'
      ],
      'small': [
        'Allocate time for creative problem-solving exercises',
        'Read case studies about innovative problem solutions',
        'Engage in brainstorming sessions more often',
        "Reflect on problems you've solved and identify patterns"
      ]
    },
    'Adaptability': {
      'large': [
        'Deliberately seek roles that require frequent adaptation',
        'Place yourself in new environments and situations regularly',
        'Study change management strategies and techniques',
        'Practice rapid response to changing circumstances'
      ],
      'medium': [
        'Develop contingency plans for your primary activities',
        'Cross-train in different skills or domain areas',
        'Practice reframing challenges as opportunities',
        'Engage in activities with uncertain outcomes'
      ],
      'small': [
        'Reflect on your responses to changes and identify patterns',
        'Introduce small changes to your routine regularly',
        'Practice flexible thinking in everyday situations',
        'Seek feedback on how you handle unexpected situations'
      ]
    },
    'Resilience': {
      'large': [
        'Work with a coach or therapist on resilience strategies',
        'Practice stress management techniques daily',
        'Take on challenging projects with potential for setbacks',
        'Develop strong support networks for difficult times'
      ],
      'medium': [
        'Study resilience research and evidence-based practices',
        'Practice reframing negative events in constructive ways',
        'Build regular reflection time into your schedule',
        'Work on developing emotional intelligence'
      ],
      'small': [
        'Maintain a resilience journal to track responses to challenges',
        'Identify your typical reactions to setbacks',
        'Practice mindfulness and present-moment awareness',
        'Schedule regular self-care activities'
      ]
    },
    'Initiative': {
      'large': [
        'Create and implement a significant self-directed project',
        'Volunteer to lead new initiatives in your organization',
        'Seek opportunities where you must be self-starting',
        'Start a side project or business venture'
      ],
      'medium': [
        'Regularly suggest improvements in team processes',
        'Set personal goals for proactive contributions',
        'Look for problems to solve before being asked',
        'Practice making decisions without complete information'
      ],
      'small': [
        'Start speaking up more in meetings with ideas',
        'Create a personal system for identifying opportunities',
        'Take on small additional responsibilities voluntarily',
        'Challenge yourself to act without being prompted'
      ]
    },
    'Collaboration': {
      'large': [
        'Join or form cross-functional project teams',
        'Study collaborative methodologies and frameworks',
        'Request roles focused on coordination and teamwork',
        'Facilitate collaborative workshops or sessions'
      ],
      'medium': [
        'Practice active listening and constructive feedback',
        'Suggest collaborative approaches to individual tasks',
        'Build relationships across different departments',
        'Contribute to shared knowledge bases or documentation'
      ],
      'small': [
        'Seek opportunities for pair work or team problem-solving',
        'Ask for and offer help more frequently',
        'Share credit and recognize others\' contributions',
        'Practice building on others\' ideas in discussions'
      ]
    },
    'Creative Thinking': {
      'large': [
        'Take courses in creative thinking or design thinking',
        'Start a regular creative practice outside your comfort zone',
        'Join innovation teams or creative problem-solving groups',
        'Practice ideation techniques like SCAMPER or lateral thinking'
      ],
      'medium': [
        'Schedule regular time for divergent thinking',
        'Seek exposure to diverse perspectives and disciplines',
        'Keep an idea journal to capture creative thoughts',
        'Attend workshops on creativity and innovation'
      ],
      'small': [
        'Challenge assumptions in your daily work',
        'Try solving familiar problems in new ways',
        'Engage in creative hobbies to build creative muscles',
        'Regularly ask "what if" questions about your work'
      ]
    },
    'Efficiency': {
      'large': [
        'Study process improvement methodologies like Lean or Six Sigma',
        'Learn advanced productivity systems and tools',
        'Take on projects focused on optimization',
        'Measure and track your efficiency metrics'
      ],
      'medium': [
        'Conduct time audits of your regular activities',
        'Implement structured productivity methods like GTD or Pomodoro',
        'Look for and eliminate redundancies in your workflows',
        'Automate routine tasks where possible'
      ],
      'small': [
        'Start timeboxing your activities',
        'Regularly review and refine your processes',
        'Learn keyboard shortcuts for common tools',
        'Create templates for recurring work products'
      ]
    },
    'Innovation': {
      'large': [
        'Join innovation initiatives or research projects',
        'Develop proposals for new products or services',
        'Study innovation methodologies and frameworks',
        'Connect with leaders in innovative fields'
      ],
      'medium': [
        'Practice applying new technologies to existing problems',
        'Establish regular idea generation sessions',
        'Read widely outside your field for cross-pollination',
        'Experiment with prototyping and testing new concepts'
      ],
      'small': [
        'Set aside time for exploring new ideas and approaches',
        'Join innovation-focused communities or forums',
        'Practice identifying needs or pain points to address',
        'Challenge the status quo in small, constructive ways'
      ]
    }
  };

  constructor() {
    this.analyticsEngine = new TraitAnalyticsEngine();
  }

  /**
   * Generate personalized recommendations based on trait scores, industry, and career goals
   */
  generateRecommendations(
    traits: Array<{name: string; category: string; score: number;}>,
    industry?: string,
    careerGoal?: string
  ): TraitRecommendation[] {
    try {
      if (!traits || traits.length === 0) {
        return [];
      }
      
      const recommendations: TraitRecommendation[] = [];
      const effectiveIndustry = industry || 'Default';
      
      // Get benchmarks for the industry
      const benchmarks = this.industryBenchmarks[effectiveIndustry] || 
                         this.industryBenchmarks['Default'];
      
      // Determine which traits need improvement based on benchmarks
      for (const trait of traits) {
        const benchmark = benchmarks[trait.name] || {
          minimum: 65,  // Default values if trait-specific benchmark not found
          target: 75,
          exceptional: 90,
          importance: 'medium' as 'critical' | 'high' | 'medium' | 'low'
        };
        
        const gap = benchmark.target - trait.score;
        const needsImprovement = gap > 0;
        
        // Only generate recommendations for traits that need improvement
        if (needsImprovement) {
          // Determine gap level for recommendation specificity
          let gapLevel: 'large' | 'medium' | 'small';
          if (gap >= 15) gapLevel = 'large';
          else if (gap >= 7) gapLevel = 'medium';
          else gapLevel = 'small';
          
          // Get recommendations for this trait and gap level
          const traitRecs = this.traitRecommendations[trait.name]?.[gapLevel] || 
                          this.getGenericRecommendations(trait.name, gapLevel);
          
          // Adjust recommendations based on career goals if provided
          const tailoredRecs = careerGoal ? 
                             this.tailorRecommendationsToCareerGoal(traitRecs, trait.name, careerGoal) : 
                             traitRecs;
          
          recommendations.push({
            trait: trait.name,
            currentScore: trait.score,
            industryBenchmark: benchmark.target,
            gap,
            needsImprovement,
            recommendations: tailoredRecs
          });
        }
      }
      
      // Sort recommendations by importance and gap size
      return recommendations.sort((a, b) => {
        const aImportance = benchmarks[a.trait]?.importance || 'medium';
        const bImportance = benchmarks[b.trait]?.importance || 'medium';
        
        const importanceOrder: Record<string, number> = {
          'critical': 3,
          'high': 2,
          'medium': 1,
          'low': 0
        };
        
        // Sort first by importance, then by gap size
        return importanceOrder[bImportance] - importanceOrder[aImportance] || 
               b.gap - a.gap;
      });
    } catch (error) {
      logger.error('Error generating trait recommendations', { error });
      return [];
    }
  }

  /**
   * Generate recommendations for a specific focus trait
   */
  generateFocusRecommendations(
    traits: Array<{name: string; category: string; score: number;}>,
    focusTrait: string,
    industry?: string,
    careerGoal?: string
  ): {
    primaryRecommendations: string[];
    relatedTraitRecommendations: Array<{trait: string; recommendations: string[]}>;
    resources: string[];
  } {
    try {
      // Find the specific trait
      const trait = traits.find(t => t.name === focusTrait);
      if (!trait) {
        throw new Error(`Trait ${focusTrait} not found`);
      }
      
      // Get general recommendations for this trait
      const recommendations = this.generateRecommendations([trait], industry, careerGoal);
      const primaryRecommendations = recommendations.length > 0 ? 
                                   recommendations[0].recommendations : 
                                   this.getGenericRecommendations(focusTrait, 'medium');
      
      // Find related traits based on trait relationships
      const relatedTraits: string[] = this.getRelatedTraits(focusTrait);
      const relatedTraitObjects = traits.filter(t => relatedTraits.includes(t.name));
      
      // Generate recommendations for related traits
      const relatedRecommendations = relatedTraitObjects.map(relatedTrait => {
        const recs = this.generateRecommendations([relatedTrait], industry, careerGoal);
        return {
          trait: relatedTrait.name,
          recommendations: recs.length > 0 ? 
                          recs[0].recommendations.slice(0, 2) : // Just take top 2 recommendations
                          this.getGenericRecommendations(relatedTrait.name, 'small').slice(0, 2)
        };
      });
      
      // Suggest resources specific to this trait
      const resources = this.getTraitResources(focusTrait);
      
      return {
        primaryRecommendations,
        relatedTraitRecommendations: relatedRecommendations,
        resources
      };
    } catch (error) {
      logger.error('Error generating focus recommendations', { error, focusTrait });
      return { 
        primaryRecommendations: [], 
        relatedTraitRecommendations: [], 
        resources: [] 
      };
    }
  }

  /**
   * Generate recommendations based on clusters of traits
   */
  generateClusterRecommendations(
    traits: Array<{name: string; category: string; score: number;}>,
    industry?: string,
    careerGoal?: string
  ): Array<{
    clusterName: string;
    traits: string[];
    overallScore: number;
    recommendations: string[];
  }> {
    try {
      if (traits.length < 3) {
        return [];
      }
      
      // Use the analytics engine to cluster traits
      const clusters = this.analyticsEngine.clusterTraits(
        traits.map(t => ({
          id: '',
          profileId: '',
          name: t.name,
          category: t.category,
          score: t.score,
          assessmentMethod: 'derived' as const,  // Use 'derived' which is part of the allowed values
          assessmentDate: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      );
      
      const results: Array<{
        clusterName: string;
        traits: string[];
        overallScore: number;
        recommendations: string[];
      }> = [];
      
      // Generate recommendations for each cluster
      for (const cluster of clusters.metaClusters) {
        const clusterTraits = traits.filter(t => cluster.traits.includes(t.name));
        
        // Get average score for this cluster
        const avgScore = cluster.averageScore;
        
        // Generate overall recommendations for the cluster
        const recommendations = this.generateClusterFocusedRecommendations(
          clusterTraits,
          cluster.name,
          industry,
          careerGoal
        );
        
        results.push({
          clusterName: cluster.name,
          traits: cluster.traits,
          overallScore: avgScore,
          recommendations
        });
      }
      
      return results;
    } catch (error) {
      logger.error('Error generating cluster recommendations', { error });
      return [];
    }
  }

  /**
   * Generate recommendations focused on a specific cluster of traits
   */
  private generateClusterFocusedRecommendations(
    traits: Array<{name: string; category: string; score: number;}>,
    clusterName: string,
    industry?: string,
    careerGoal?: string
  ): string[] {
    // General recommendations by cluster
    const clusterRecommendations: Record<string, string[]> = {
      'Leadership Competency': [
        'Seek integrated leadership experiences that combine strategic thinking and communication',
        'Build a personal leadership development plan that includes regular reflection',
        'Find mentors who excel in multiple leadership dimensions',
        'Join leadership communities or networks for peer learning',
        'Practice balancing strategic vision with tactical execution'
      ],
      'Innovation Profile': [
        'Create an innovation portfolio with different types of projects',
        'Establish regular time for creative exploration and problem-solving',
        'Build cross-functional connections to enhance systems thinking',
        'Study design thinking methodologies that combine creativity with analysis',
        'Practice prototyping and testing ideas quickly'
      ],
      'Resilience Indicators': [
        'Develop holistic resilience practices combining mental and emotional strategies',
        'Create systems to track problems and solutions for faster adaptation',
        'Build routines that support sustained energy and recovery',
        'Practice scenario planning to prepare for various challenges',
        'Study how others have navigated significant changes successfully'
      ],
      'Strategic Execution': [
        'Develop frameworks that connect strategic thinking to tactical implementation',
        'Create mechanisms to measure effectiveness of execution against strategy',
        'Practice organizing complex initiatives into manageable components',
        'Study cases of successful strategic implementation in your industry',
        'Balance time between strategic thinking and execution activities'
      ],
      'Team Effectiveness': [
        'Build skills in both team leadership and collaborative participation',
        'Practice techniques for enhancing psychological safety in teams',
        'Develop methods for constructive conflict resolution',
        'Create frameworks for team decision-making and accountability',
        'Study high-performing teams in contexts similar to yours'
      ]
    };
    
    let recommendations = clusterRecommendations[clusterName] || [];
    
    // If we have specific recommendations, return them
    if (recommendations.length > 0) {
      // Tailor to career goals if provided
      if (careerGoal) {
        recommendations = this.tailorRecommendationsToCareerGoal(recommendations, clusterName, careerGoal);
      }
      
      return recommendations;
    }
    
    // Otherwise, build composite recommendations from individual traits
    const allRecs: string[] = [];
    
    for (const trait of traits) {
      const traitRecs = this.traitRecommendations[trait.name]?.['medium'] || 
                      this.getGenericRecommendations(trait.name, 'medium');
      
      // Take one recommendation from each trait to create a balanced set
      if (traitRecs.length > 0) {
        allRecs.push(traitRecs[0]);
      }
    }
    
    // Ensure we have at least 3 recommendations
    while (allRecs.length < 3) {
      // Add more recommendations from available traits
      for (const trait of traits) {
        if (allRecs.length >= 5) break; // Cap at 5 recommendations
        
        const traitRecs = this.traitRecommendations[trait.name]?.['medium'] || 
                        this.getGenericRecommendations(trait.name, 'medium');
        
        // Take additional recommendations if available
        if (traitRecs.length > 1) {
          allRecs.push(traitRecs[1]);
        }
      }
      
      // If we still don't have enough, add generic cluster recommendations
      if (allRecs.length < 3) {
        allRecs.push(`Focus on developing ${traits.map(t => t.name).join(', ')} together as they reinforce each other`);
        allRecs.push('Seek opportunities that allow you to practice multiple skills in this cluster simultaneously');
      }
    }
    
    return allRecs;
  }

  /**
   * Tailor recommendations based on career goals
   */
  private tailorRecommendationsToCareerGoal(
    recommendations: string[],
    trait: string,
    careerGoal: string
  ): string[] {
    // Clone the array to avoid modifying the original
    const tailored = [...recommendations];
    
    // Customize based on career goal
    const careerGoalLower = careerGoal.toLowerCase();
    
    // Add career-specific recommendation
    if (careerGoalLower.includes('leadership') || careerGoalLower.includes('management')) {
      tailored.unshift(`Focus on developing ${trait} specifically in leadership contexts`);
    } else if (careerGoalLower.includes('technical') || careerGoalLower.includes('specialist')) {
      tailored.unshift(`Apply ${trait} development to deepening technical expertise`);
    } else if (careerGoalLower.includes('entrepreneur')) {
      tailored.unshift(`Strengthen ${trait} with a focus on entrepreneurial applications`);
    } else {
      // Add a generic career-focused recommendation
      tailored.unshift(`Develop ${trait} in alignment with your ${careerGoal} aspirations`);
    }
    
    return tailored.slice(0, 5); // Keep array size reasonable
  }

  /**
   * Get related traits to a focus trait
   */
  private getRelatedTraits(traitName: string): string[] {
    // Map of trait relationships for recommendations
    const traitRelationships: Record<string, string[]> = {
      'Leadership': ['Communication', 'Strategic Thinking', 'Initiative'],
      'Analytical Thinking': ['Problem Solving', 'Systems Thinking'],
      'Communication': ['Collaboration', 'Leadership'],
      'Strategic Thinking': ['Systems Thinking', 'Analytical Thinking', 'Leadership'],
      'Problem Solving': ['Analytical Thinking', 'Creative Thinking', 'Innovation'],
      'Adaptability': ['Resilience', 'Innovation'],
      'Resilience': ['Adaptability', 'Problem Solving'],
      'Initiative': ['Leadership', 'Innovation'],
      'Collaboration': ['Communication', 'Adaptability'],
      'Creative Thinking': ['Problem Solving', 'Innovation'],
      'Efficiency': ['Systems Thinking', 'Problem Solving'],
      'Systems Thinking': ['Analytical Thinking', 'Strategic Thinking'],
      'Innovation': ['Creative Thinking', 'Initiative', 'Problem Solving']
    };
    
    return traitRelationships[traitName] || [];
  }

  /**
   * Get generic recommendations when specific ones aren't available
   */
  private getGenericRecommendations(traitName: string, gapLevel: 'large' | 'medium' | 'small'): string[] {
    const intensity = gapLevel === 'large' ? 'significant' : 
                      gapLevel === 'medium' ? 'moderate' : 'small';
    
    return [
      `Work with a mentor or coach to develop a ${intensity} improvement plan for ${traitName}`,
      `Read books and articles specifically focused on ${traitName} development`,
      `Take a course or workshop designed to enhance ${traitName}`,
      `Create practice opportunities in your current role to exercise ${traitName}`
    ];
  }

  /**
   * Get learning resources for a specific trait
   */
  private getTraitResources(traitName: string): string[] {
    // Map of trait-specific resources
    const traitResources: Record<string, string[]> = {
      'Leadership': [
        'Book: "Leadership: Theory and Practice" by Peter G. Northouse',
        'Course: Harvard\'s "Leadership Principles" online certification',
        'Podcast: "Leadership Today" for modern leadership insights',
        'Organization: International Leadership Association for networking'
      ],
      'Analytical Thinking': [
        'Book: "Super Thinking: The Big Book of Mental Models" by Gabriel Weinberg',
        'Course: "Data Analysis and Critical Thinking" on Coursera',
        'Tool: IBM\'s "Think Academy" free analytical thinking resources',
        'Practice: LeetCode or HackerRank for structured analytical challenges'
      ],
      'Communication': [
        'Book: "Crucial Conversations" by Patterson, Grenny, McMillan & Switzler',
        'Organization: Toastmasters International for public speaking practice',
        'Course: "Effective Communication" on LinkedIn Learning',
        'Podcast: "The Communication Guys" for practical communication tips'
      ],
      'Strategic Thinking': [
        'Book: "Good Strategy/Bad Strategy" by Richard Rumelt',
        'Course: Wharton\'s "Strategic Management" on Coursera',
        'Framework: "Playing to Win" strategic framework by A.G. Lafley',
        'Practice: Regular scenario planning exercises'
      ],
      'Problem Solving': [
        'Book: "Bulletproof Problem Solving" by Charles Conn and Robert McLean',
        'Course: "Creative Problem Solving" on edX',
        'Framework: TRIZ methodology for systematic innovation',
        'Tool: Mind mapping software for problem decomposition'
      ],
      'Adaptability': [
        'Book: "Adaptability: The Art of Winning in an Age of Uncertainty" by Max McKeown',
        'Course: "Developing Adaptability" on LinkedIn Learning',
        'Practice: Deliberate exposure to new situations outside comfort zone',
        'Assessment: Adaptability Quotient (AQ) test for baseline measurement'
      ],
      'Resilience': [
        'Book: "Resilience: Hard-Won Wisdom for Living a Better Life" by Eric Greitens',
        'Course: "Resilience Skills" on Coursera by University of Pennsylvania',
        'App: Headspace or Calm for mindfulness practice',
        'Framework: The American Psychological Association\'s resilience toolkit'
      ],
      'Initiative': [
        'Book: "The Art of Taking Action" by Gregg Krech',
        'Course: "Personal Initiative: An Active Approach to Work" on Coursera',
        'Practice: 30-day challenge to propose one new idea daily',
        'Tool: Action-oriented planning systems like Getting Things Done (GTD)'
      ],
      'Collaboration': [
        'Book: "Collaborative Intelligence" by Dawna Markova and Angie McArthur',
        'Course: "Collaborative Leadership and Emotional Intelligence" on edX',
        'Tool: Collaboration platforms like Miro or Figma for team projects',
        'Framework: Team Canvas for team alignment and collaboration'
      ],
      'Creative Thinking': [
        'Book: "Creative Confidence" by Tom and David Kelley',
        'Course: IDEO\'s "Foundations in Creative Problem Solving"',
        'Practice: Daily creative exercises like "30 Circles Challenge"',
        'Tool: SCAMPER technique for systematic creative thinking'
      ],
      'Efficiency': [
        'Book: "The Effective Executive" by Peter Drucker',
        'Course: "Work Smarter, Not Harder: Time Management" on LinkedIn Learning',
        'Tool: Pomodoro Technique and time tracking apps',
        'Framework: Personal Kanban for workflow management'
      ],
      'Systems Thinking': [
        'Book: "Thinking in Systems: A Primer" by Donella Meadows',
        'Course: MIT\'s "System Dynamics for Business Policy" online',
        'Tool: Kumu or Loopy for systems mapping',
        'Organization: Systems Thinking Community of Practice'
      ],
      'Innovation': [
        'Book: "The Innovator\'s Dilemma" by Clayton Christensen',
        'Course: "Innovation and Design for Global Grand Challenges" on Coursera',
        'Framework: Design Thinking methodology by Stanford d.school',
        'Community: Join innovation challenges on platforms like OpenIDEO'
      ]
    };
    
    return traitResources[traitName] || [
      `Book recommendations on ${traitName}`,
      `Online courses related to ${traitName}`,
      `Communities of practice for ${traitName}`,
      `Tools and frameworks for developing ${traitName}`
    ];
  }
}