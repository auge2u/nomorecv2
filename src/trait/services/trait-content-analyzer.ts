/**
 * Trait Content Analyzer
 * 
 * Analyzes various content sources to derive trait assessments
 * Part of the WP9 Persona Trait System implementation
 */

import { Trait, TraitAssessment } from '../models/trait.model';
import logger from '../../utils/logger';

export class TraitContentAnalyzer {
  private keywordMappings: Record<string, string[]>;
  private phraseMappings: Record<string, string[]>;
  private categoryPatterns: Record<string, RegExp[]>;
  private confidenceThresholds: {
    text: number;
    structured: number;
    mixed: number;
  };
  
  constructor() {
    // Initialize mappings of keywords and phrases to traits
    this.keywordMappings = this.initializeKeywordMappings();
    this.phraseMappings = this.initializePhraseMappings();
    this.categoryPatterns = this.initializeCategoryPatterns();
    
    // Confidence thresholds for different content types
    this.confidenceThresholds = {
      text: 0.65,        // Plain text requires more evidence
      structured: 0.80,  // Structured data has higher confidence
      mixed: 0.72        // Mixed content types
    };
  }
  
  /**
   * Initialize keyword to trait mappings
   */
  private initializeKeywordMappings(): Record<string, string[]> {
    return {
      // Leadership traits
      'leadership': ['strategic thinking', 'vision', 'delegation', 'motivation', 'team building'],
      'management': ['organization', 'planning', 'coordination', 'supervision', 'resource allocation'],
      
      // Technical traits
      'development': ['coding', 'programming', 'implementation', 'debugging', 'software development'],
      'architecture': ['system design', 'solution architecture', 'technical planning', 'infrastructure'],
      'analysis': ['data analysis', 'research', 'critical thinking', 'problem solving'],
      
      // Interpersonal traits
      'communication': ['articulation', 'clarity', 'persuasion', 'presentation', 'writing'],
      'collaboration': ['teamwork', 'cooperation', 'partnership', 'shared responsibility'],
      
      // Innovation traits
      'innovation': ['creativity', 'ideation', 'experimentation', 'novel solutions', 'originality'],
      'entrepreneurship': ['initiative', 'risk-taking', 'business acumen', 'market awareness'],
      
      // Problem solving traits
      'problem solving': ['analytical thinking', 'debugging', 'troubleshooting', 'solution finding'],
      'decision making': ['judgment', 'evaluation', 'risk assessment', 'prioritization'],
      
      // Project management traits
      'project management': ['planning', 'scheduling', 'coordination', 'execution', 'monitoring'],
      'agile': ['adaptability', 'iteration', 'continuous improvement', 'sprint planning']
    };
  }
  
  /**
   * Initialize phrase to trait mappings
   */
  private initializePhraseMappings(): Record<string, string[]> {
    return {
      // Leadership phrases
      'led a team': ['leadership', 'team building'],
      'managed project': ['project management', 'leadership'],
      'delivered results': ['execution', 'achievement orientation'],
      'strategic direction': ['strategic thinking', 'vision'],
      
      // Technical phrases
      'implemented solution': ['technical implementation', 'problem solving'],
      'designed architecture': ['system design', 'technical planning'],
      'analyzed data': ['data analysis', 'analytical thinking'],
      
      // Collaboration phrases
      'worked closely with': ['collaboration', 'teamwork'],
      'partnered with': ['partnership', 'relationship building'],
      'cross-functional': ['cross-functional leadership', 'collaboration'],
      
      // Innovation phrases
      'new approach': ['innovation', 'creativity'],
      'pioneered': ['innovation', 'leadership'],
      'first to market': ['innovation', 'competitiveness'],
      
      // Achievement phrases
      'increased by': ['achievement orientation', 'results focus'],
      'reduced costs': ['efficiency', 'cost management'],
      'improved quality': ['quality focus', 'continuous improvement']
    };
  }
  
  /**
   * Initialize category pattern detection
   */
  private initializeCategoryPatterns(): Record<string, RegExp[]> {
    return {
      'technical': [
        /\b(coding|programming|development|software|technical|engineering|architecture|infrastructure)\b/i,
        /\b(java|python|javascript|typescript|react|angular|vue|node|sql|database|cloud|aws|azure)\b/i
      ],
      'leadership': [
        /\b(lead|leader|leadership|manage|manager|management|direct|director|executive|C-level)\b/i,
        /\b(team|strategy|vision|direction|inspiration|motivation)\b/i
      ],
      'communication': [
        /\b(communicate|communication|present|presentation|write|writing|articulate|express)\b/i,
        /\b(document|documentation|report|reporting|brief|briefing|message|messaging)\b/i
      ],
      'interpersonal': [
        /\b(collaborate|collaboration|teamwork|relationship|interpersonal|social|emotional intelligence)\b/i,
        /\b(empathy|understand|understanding|listen|listening|connect|connection)\b/i
      ],
      'analytical': [
        /\b(analyze|analysis|research|investigate|investigation|evaluate|evaluation)\b/i,
        /\b(data|metrics|measurement|quantitative|qualitative|insight|insights)\b/i
      ],
      'innovation': [
        /\b(innovate|innovation|create|creation|creative|ideate|ideation|invent|invention)\b/i,
        /\b(novel|new|original|disrupt|disruption|transform|transformation)\b/i
      ],
      'project management': [
        /\b(project|manage|management|coordinate|coordination|organize|organization)\b/i,
        /\b(plan|planning|schedule|scheduling|timeline|deadline|milestone|deliverable)\b/i
      ]
    };
  }
  
  /**
   * Analyzes text content to identify traits
   * @param content Text content to analyze
   * @param options Additional context or options for analysis
   * @returns Identified traits with confidence scores
   */
  public analyzeTextContent(content: string, options?: {
    context?: string;
    profileId?: string;
    contentType?: 'resume' | 'professional' | 'social' | 'interview' | 'feedback';
  }): {
    traits: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }>;
    metadata: {
      wordCount: number;
      keyPhrases: string[];
      contentType?: string;
      analysisTime: Date;
    };
  } {
    try {
      // Default content type if not specified
      const contentType = options?.contentType || 'professional';
      
      // Normalize and prepare content
      const normalizedContent = this.normalizeContent(content);
      const paragraphs = this.splitIntoParagraphs(normalizedContent);
      const sentences = this.splitIntoSentences(normalizedContent);
      
      // Extract keywords and phrases
      const extractedKeywords = this.extractKeywords(normalizedContent);
      const extractedPhrases = this.extractPhrases(normalizedContent, sentences);
      
      // Build trait evidence
      const traitEvidence = this.buildTraitEvidence(extractedKeywords, extractedPhrases, sentences);
      
      // Score traits based on evidence
      const traits = this.scoreTraits(traitEvidence, contentType);
      
      // Categorize traits
      const categorizedTraits = this.categorizeTraits(traits);
      
      // Calculate confidence scores
      const traitsWithConfidence = this.calculateConfidence(categorizedTraits, contentType);
      
      // Extract key phrases for metadata
      const keyPhrases = this.extractKeyPhrases(sentences);
      
      return {
        traits: traitsWithConfidence,
        metadata: {
          wordCount: this.countWords(normalizedContent),
          keyPhrases: keyPhrases.slice(0, 5), // Top 5 key phrases
          contentType,
          analysisTime: new Date()
        }
      };
    } catch (error) {
      logger.error('Error analyzing text content', { error });
      return {
        traits: [],
        metadata: {
          wordCount: 0,
          keyPhrases: [],
          analysisTime: new Date()
        }
      };
    }
  }
  
  /**
   * Analyzes structured content like JSON data, LinkedIn profiles, etc.
   * @param content Structured content to analyze
   * @param schema Schema type for parsing
   * @returns Identified traits with confidence scores
   */
  public analyzeStructuredContent(content: any, schema: 'linkedin' | 'github' | 'custom'= 'custom'): {
    traits: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }>;
    metadata: any;
  } {
    try {
      // Parse based on schema
      let parsedContent: any;
      
      switch (schema) {
        case 'linkedin':
          parsedContent = this.parseLinkedInData(content);
          break;
        case 'github':
          parsedContent = this.parseGitHubData(content);
          break;
        case 'custom':
        default:
          parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          break;
      }
      
      // Extract relevant sections based on schema
      const extractedContent = this.extractStructuredContent(parsedContent, schema);
      
      // Convert structured data to analyzable text
      const textContent = this.structuredToText(extractedContent);
      
      // Analyze the extracted text content
      const textAnalysis = this.analyzeTextContent(textContent, { 
        contentType: 'professional',
        context: schema 
      });
      
      // Add structured-specific traits
      const structuredTraits = this.extractStructuredTraits(extractedContent, schema);
      
      // Merge text and structured traits
      const mergedTraits = this.mergeTraitResults(textAnalysis.traits, structuredTraits);
      
      return {
        traits: mergedTraits,
        metadata: {
          ...textAnalysis.metadata,
          schema,
          structuredMetadata: this.extractStructuredMetadata(extractedContent, schema)
        }
      };
    } catch (error) {
      logger.error('Error analyzing structured content', { error, schema });
      return {
        traits: [],
        metadata: {
          schema,
          analysisTime: new Date()
        }
      };
    }
  }
  
  /**
   * Normalizes content for analysis
   */
  private normalizeContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:!?'"()[\]{}]/g, ' ')
      .trim();
  }
  
  /**
   * Splits content into paragraphs
   */
  private splitIntoParagraphs(content: string): string[] {
    return content
      .split(/\n\n+/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
  }
  
  /**
   * Splits content into sentences
   */
  private splitIntoSentences(content: string): string[] {
    return content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  
  /**
   * Counts words in content
   */
  private countWords(content: string): number {
    return content.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  /**
   * Extracts keywords from content
   */
  private extractKeywords(content: string): Record<string, number> {
    const keywords: Record<string, number> = {};
    
    // Iterate through each keyword mapping
    Object.entries(this.keywordMappings).forEach(([trait, relatedKeywords]) => {
      // Count instances of the main trait keyword
      const traitRegex = new RegExp(`\\b${trait}\\b`, 'gi');
      const traitMatches = (content.match(traitRegex) || []).length;
      
      if (traitMatches > 0) {
        keywords[trait] = traitMatches;
      }
      
      // Count instances of related keywords
      relatedKeywords.forEach(keyword => {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'gi');
        const keywordMatches = (content.match(keywordRegex) || []).length;
        
        if (keywordMatches > 0) {
          // Add the related keyword counts to the main trait
          keywords[trait] = (keywords[trait] || 0) + keywordMatches * 0.5; // Related keywords count half as much
        }
      });
    });
    
    return keywords;
  }
  
  /**
   * Extracts phrases from content
   */
  private extractPhrases(content: string, sentences: string[]): Record<string, string[]> {
    const phraseMatches: Record<string, string[]> = {};
    
    // Iterate through each phrase mapping
    Object.entries(this.phraseMappings).forEach(([phrase, relatedTraits]) => {
      const phraseRegex = new RegExp(phrase, 'gi');
      
      // Find sentences containing the phrase
      const matchingSentences = sentences.filter(sentence => 
        phraseRegex.test(sentence)
      );
      
      if (matchingSentences.length > 0) {
        // Associate matching sentences with each related trait
        relatedTraits.forEach(trait => {
          if (!phraseMatches[trait]) {
            phraseMatches[trait] = [];
          }
          
          phraseMatches[trait].push(...matchingSentences);
        });
      }
    });
    
    return phraseMatches;
  }
  
  /**
   * Builds trait evidence combining keywords and phrases
   */
  private buildTraitEvidence(
    keywords: Record<string, number>,
    phrases: Record<string, string[]>,
    sentences: string[]
  ): Record<string, {
    keywordCount: number;
    phrasesEvidence: string[];
    combinedScore: number;
  }> {
    const evidence: Record<string, {
      keywordCount: number;
      phrasesEvidence: string[];
      combinedScore: number;
    }> = {};
    
    // Process keyword evidence
    Object.entries(keywords).forEach(([trait, count]) => {
      if (!evidence[trait]) {
        evidence[trait] = {
          keywordCount: 0,
          phrasesEvidence: [],
          combinedScore: 0
        };
      }
      
      evidence[trait].keywordCount = count;
      // Calculate initial score based on keywords (will be adjusted later)
      evidence[trait].combinedScore += count * 10; // Each keyword occurrence adds 10 points
    });
    
    // Process phrase evidence
    Object.entries(phrases).forEach(([trait, matchingSentences]) => {
      if (!evidence[trait]) {
        evidence[trait] = {
          keywordCount: 0,
          phrasesEvidence: [],
          combinedScore: 0
        };
      }
      
      // Add unique evidence sentences
      const uniqueSentences = Array.from(new Set(matchingSentences));
      evidence[trait].phrasesEvidence.push(...uniqueSentences);
      
      // Each unique phrase is worth 15 points
      evidence[trait].combinedScore += uniqueSentences.length * 15;
    });
    
    return evidence;
  }
  
  /**
   * Scores traits based on evidence
   */
  private scoreTraits(
    evidence: Record<string, {
      keywordCount: number;
      phrasesEvidence: string[];
      combinedScore: number;
    }>,
    contentType: string
  ): Array<{
    name: string;
    score: number;
    evidence: string[];
  }> {
    // Determine max possible score to normalize results
    const scores = Object.values(evidence).map(e => e.combinedScore);
    const maxScore = scores.length > 0 ? Math.max(...scores) : 1;
    
    // Normalize scores to 0-100 range
    return Object.entries(evidence).map(([trait, data]) => {
      // Calculate normalized score
      let normalizedScore = Math.min(100, Math.round((data.combinedScore / maxScore) * 100));
      
      // Apply adjustments based on content type
      if (contentType === 'resume') {
        // Resumes often overstate qualities, apply modest reduction
        normalizedScore = Math.floor(normalizedScore * 0.9);
      } else if (contentType === 'feedback') {
        // Feedback is generally more reliable, slight boost
        normalizedScore = Math.min(100, Math.floor(normalizedScore * 1.1));
      }
      
      // Combine all evidence
      const allEvidence = [
        ...data.phrasesEvidence,
        ...(data.keywordCount > 0 ? [`Keyword frequency: ${data.keywordCount}`] : [])
      ];
      
      return {
        name: trait,
        score: normalizedScore,
        evidence: allEvidence
      };
    });
  }
  
  /**
   * Categorizes traits based on patterns
   */
  private categorizeTraits(traits: Array<{
    name: string;
    score: number;
    evidence: string[];
  }>): Array<{
    name: string;
    category: string;
    score: number;
    evidence: string[];
  }> {
    return traits.map(trait => {
      // Find matching category
      let assignedCategory = 'other';
      
      for (const [category, patterns] of Object.entries(this.categoryPatterns)) {
        const matchesPattern = patterns.some(pattern => pattern.test(trait.name));
        if (matchesPattern) {
          assignedCategory = category;
          break;
        }
      }
      
      return {
        ...trait,
        category: assignedCategory
      };
    });
  }
  
  /**
   * Calculates confidence scores for traits
   */
  private calculateConfidence(traits: Array<{
    name: string;
    category: string;
    score: number;
    evidence: string[];
  }>, contentType: string): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    // Get base confidence threshold for this content type
    const baseConfidence = 
      contentType === 'structured' ? this.confidenceThresholds.structured :
      contentType === 'mixed' ? this.confidenceThresholds.mixed :
      this.confidenceThresholds.text;
    
    return traits.map(trait => {
      // Calculate confidence based on evidence and score
      let confidence = baseConfidence;
      
      // More evidence increases confidence
      confidence += Math.min(0.15, trait.evidence.length * 0.03);
      
      // Higher scores generally have higher confidence 
      // (but we cap this to avoid over-confidence in high scores)
      confidence += Math.min(0.1, (trait.score / 100) * 0.1);
      
      // Cap confidence at 0.95
      confidence = Math.min(0.95, confidence);
      
      return {
        ...trait,
        confidence
      };
    });
  }
  
  /**
   * Extracts key phrases from sentences for metadata
   */
  private extractKeyPhrases(sentences: string[]): string[] {
    // A simple implementation that prioritizes sentences with known trait keywords
    const keyPhrases: Array<{ sentence: string, relevance: number }> = [];
    
    // Collect all trait keywords
    const traitKeywords = Object.keys(this.keywordMappings);
    
    // Evaluate each sentence
    sentences.forEach(sentence => {
      let relevance = 0;
      
      // Check for trait keywords
      traitKeywords.forEach(keyword => {
        const keywordRegex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (keywordRegex.test(sentence)) {
          relevance += 1;
        }
      });
      
      // Check for phrases
      Object.keys(this.phraseMappings).forEach(phrase => {
        const phraseRegex = new RegExp(phrase, 'i');
        if (phraseRegex.test(sentence)) {
          relevance += 2; // Phrases are weighted more heavily
        }
      });
      
      // Add if it has some relevance
      if (relevance > 0) {
        keyPhrases.push({ sentence, relevance });
      }
    });
    
    // Sort by relevance and return sentences
    return keyPhrases
      .sort((a, b) => b.relevance - a.relevance)
      .map(item => item.sentence);
  }
  
  /**
   * Parse LinkedIn profile data
   */
  private parseLinkedInData(content: any): any {
    // Implementation would depend on LinkedIn data structure
    // This is a placeholder implementation
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (e) {
        logger.error('Failed to parse LinkedIn data', { error: e });
        return {};
      }
    }
    return content;
  }
  
  /**
   * Parse GitHub profile data
   */
  private parseGitHubData(content: any): any {
    // Implementation would depend on GitHub data structure
    // This is a placeholder implementation
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (e) {
        logger.error('Failed to parse GitHub data', { error: e });
        return {};
      }
    }
    return content;
  }
  
  /**
   * Extract relevant sections from structured content
   */
  private extractStructuredContent(content: any, schema: string): any {
    // Extract different sections based on schema
    switch(schema) {
      case 'linkedin':
        return {
          experience: content.experience || [],
          skills: content.skills || [],
          recommendations: content.recommendations || [],
          // Extract more LinkedIn fields as needed
        };
        
      case 'github':
        return {
          repositories: content.repositories || [],
          contributions: content.contributions || [],
          languages: content.languages || [],
          // Extract more GitHub fields as needed
        };
        
      default:
        return content;
    }
  }
  
  /**
   * Convert structured data to analyzable text
   */
  private structuredToText(structuredData: any): string {
    let result = '';
    
    // Handle different types of structured data
    if (Array.isArray(structuredData)) {
      // Array of objects or values
      structuredData.forEach((item) => {
        if (typeof item === 'object' && item !== null) {
          result += this.objectToText(item) + '\n\n';
        } else {
          result += String(item) + '\n';
        }
      });
    } else if (typeof structuredData === 'object' && structuredData !== null) {
      // Single object
      result = this.objectToText(structuredData);
    } else {
      // Simple value
      result = String(structuredData);
    }
    
    return result;
  }
  
  /**
   * Convert an object to text
   */
  private objectToText(obj: any): string {
    let result = '';
    
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        
        if (typeof value === 'object' && value !== null) {
          if (Array.isArray(value)) {
            // Handle array values
            result += `${key}: \n`;
            value.forEach((item, index) => {
              if (typeof item === 'object' && item !== null) {
                result += `${index + 1}. ${this.objectToText(item)}\n`;
              } else {
                result += `${index + 1}. ${String(item)}\n`;
              }
            });
          } else {
            // Handle nested objects
            result += `${key}: ${this.objectToText(value)}\n`;
          }
        } else {
          // Handle simple values
          result += `${key}: ${String(value)}\n`;
        }
      }
    }
    
    return result;
  }
  
  /**
   * Extract traits specific to structured data
   */
  private extractStructuredTraits(content: any, schema: string): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    const structuredTraits: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }> = [];
    
    switch(schema) {
      case 'linkedin':
        // Handle LinkedIn-specific trait extraction
        if (content.skills && Array.isArray(content.skills)) {
          // Extract endorsed skills
          const endorsedSkills = this.extractLinkedInSkills(content.skills);
          structuredTraits.push(...endorsedSkills);
        }
        
        // Extract traits from recommendations
        if (content.recommendations && Array.isArray(content.recommendations)) {
          const recommendationTraits = this.extractRecommendationTraits(content.recommendations);
          structuredTraits.push(...recommendationTraits);
        }
        break;
        
      case 'github':
        // Handle GitHub-specific trait extraction
        if (content.repositories && Array.isArray(content.repositories)) {
          const repoTraits = this.extractGitHubRepoTraits(content.repositories);
          structuredTraits.push(...repoTraits);
        }
        
        if (content.languages && typeof content.languages === 'object') {
          const languageTraits = this.extractGitHubLanguageTraits(content.languages);
          structuredTraits.push(...languageTraits);
        }
        break;
    }
    
    return structuredTraits;
  }
  
  /**
   * Extract endorsed skills from LinkedIn data
   */
  private extractLinkedInSkills(skills: any[]): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    const result: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }> = [];
    
    // This is a simplified implementation
    skills.forEach(skill => {
      // Normalize skill name
      const skillName = typeof skill === 'string' ? skill.toLowerCase() : 
        (skill.name ? skill.name.toLowerCase() : '');
      
      if (!skillName) return;
      
      // Calculate endorsement-based score
      const endorsements = skill.endorsements || skill.endorsementCount || 0;
      const endorsementScore = Math.min(100, Math.round(Math.log2(endorsements + 1) * 20));
      
      // Determine category
      let category = 'technical';
      for (const [cat, patterns] of Object.entries(this.categoryPatterns)) {
        if (patterns.some(pattern => pattern.test(skillName))) {
          category = cat;
          break;
        }
      }
      
      // Higher confidence for endorsed skills
      const confidence = 0.7 + Math.min(0.25, (endorsements / 100) * 0.25);
      
      result.push({
        name: skillName,
        category,
        score: endorsementScore,
        confidence,
        evidence: [`LinkedIn skill: ${endorsements} endorsements`]
      });
    });
    
    return result;
  }
  
  /**
   * Extract traits from LinkedIn recommendations
   */
  private extractRecommendationTraits(recommendations: any[]): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    // Combine all recommendation text
    const combinedText = recommendations
      .map(rec => rec.text || rec.recommendation || '')
      .join('\n\n');
    
    // Use text analysis on the combined text
    const analysis = this.analyzeTextContent(combinedText, {
      contentType: 'feedback'
    });
    
    // Boost confidence for recommendation-based traits
    return analysis.traits.map(trait => ({
      ...trait,
      confidence: Math.min(0.9, trait.confidence + 0.1),
      evidence: [
        ...trait.evidence,
        `Derived from ${recommendations.length} LinkedIn recommendations`
      ]
    }));
  }
  
  /**
   * Extract traits from GitHub repositories
   */
  private extractGitHubRepoTraits(repositories: any[]): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    const result: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }> = [];
    
    // Technical skill traits from repos
    const languageCounts: Record<string, number> = {};
    const topicCounts: Record<string, number> = {};
    
    repositories.forEach(repo => {
      // Count languages
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
      
      // Count topics
      if (repo.topics && Array.isArray(repo.topics)) {
        repo.topics.forEach((topic: string) => {
          topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        });
      }
    });
    
    // Convert language counts to traits
    Object.entries(languageCounts).forEach(([language, count]) => {
      const languageScore = Math.min(100, Math.round(Math.log2(count + 1) * 25));
      
      result.push({
        name: `${language} programming`,
        category: 'technical',
        score: languageScore,
        confidence: 0.85,
        evidence: [`GitHub: ${count} repositories using ${language}`]
      });
    });
    
    // Convert topics to traits
    Object.entries(topicCounts)
      .filter(([topic, count]) => count > 1) // Only consider topics with multiple occurrences
      .forEach(([topic, count]) => {
        // Standardize topic name
        const topicName = topic
          .replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        let category = 'technical';
        for (const [cat, patterns] of Object.entries(this.categoryPatterns)) {
          if (patterns.some(pattern => pattern.test(topicName))) {
            category = cat;
            break;
          }
        }
        
        result.push({
          name: topicName,
          category,
          score: Math.min(100, Math.round(Math.log2(count + 1) * 20)),
          confidence: 0.75,
          evidence: [`GitHub: ${count} repositories with topic ${topicName}`]
        });
      });
    
    return result;
  }
  
  /**
   * Extract traits from GitHub languages
   */
  private extractGitHubLanguageTraits(languages: Record<string, number>): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    const result: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
    }> = [];
    
    // Total bytes across all languages
    const totalBytes = Object.values(languages).reduce((sum, bytes) => sum + bytes, 0);
    
    // Convert language usage to traits
    Object.entries(languages).forEach(([language, bytes]) => {
      if (totalBytes === 0) return; // Avoid division by zero
      
      const percentage = (bytes / totalBytes) * 100;
      
      // Score based on percentage of code
      const languageScore = Math.min(100, Math.round(percentage * 1.5));
      
      result.push({
        name: `${language} programming`,
        category: 'technical',
        score: languageScore,
        confidence: 0.8,
        evidence: [`GitHub: ${Math.round(percentage)}% of code in ${language}`]
      });
    });
    
    return result;
  }
  
  /**
   * Extract metadata from structured content
   */
  private extractStructuredMetadata(content: any, schema: string): any {
    switch(schema) {
      case 'linkedin':
        return {
          connectionCount: content.connectionCount || 0,
          profileCompleteness: content.profileCompleteness || 0,
          industryName: content.industryName || '',
          locationName: content.locationName || '',
          // Other LinkedIn metadata
        };
        
      case 'github':
        return {
          repositoryCount: Array.isArray(content.repositories) ? content.repositories.length : 0,
          followersCount: content.followersCount || 0,
          contributionCount: content.contributionCount || 0,
          // Other GitHub metadata
        };
        
      default:
        return {};
    }
  }
  
  /**
   * Merge trait results from different analysis methods
   */
  private mergeTraitResults(...traitArrays: Array<Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }>>): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    // Flatten and group by trait name
    const traitMap: Record<string, {
      name: string;
      category: string;
      scores: number[];
      confidences: number[];
      allEvidence: string[];
    }> = {};
    
    // Flatten and collect traits
    traitArrays.forEach(traitArray => {
      traitArray.forEach(trait => {
        const normalizedName = trait.name.toLowerCase();
        
        if (!traitMap[normalizedName]) {
          traitMap[normalizedName] = {
            name: trait.name,
            category: trait.category,
            scores: [],
            confidences: [],
            allEvidence: []
          };
        }
        
        traitMap[normalizedName].scores.push(trait.score);
        traitMap[normalizedName].confidences.push(trait.confidence);
        traitMap[normalizedName].allEvidence.push(...trait.evidence);
      });
    });
    
    // Merge and calculate combined scores
    return Object.values(traitMap).map(data => {
      // Calculate weighted average of scores based on confidence
      const totalWeightedScore = data.scores.reduce((sum, score, index) => {
        return sum + score * data.confidences[index];
      }, 0);
      
      const totalConfidence = data.confidences.reduce((sum, conf) => sum + conf, 0);
      const averageScore = totalWeightedScore / totalConfidence;
      
      // Calculate combined confidence
      // Higher confidence with more evidence sources
      const sourceCount = data.confidences.length;
      const combinedConfidence = Math.min(0.95, 
        data.confidences.reduce((sum, conf) => sum + conf, 0) / sourceCount + 
        Math.min(0.15, sourceCount * 0.05) // Bonus for multiple sources
      );
      
      // De-duplicate evidence
      const uniqueEvidence = Array.from(new Set(data.allEvidence));
      
      return {
        name: data.name,
        category: data.category,
        score: Math.round(averageScore),
        confidence: combinedConfidence,
        evidence: uniqueEvidence
      };
    });
  }

  /**
   * Analyzes project details to identify traits
   * @param project Project data to analyze
   * @returns Identified traits with confidence scores
   */
  public analyzeProjectDetails(project: {
    title: string;
    description: string;
    objectives?: string[];
    outcomes?: string[];
    technologies?: string[];
    methodologies?: string[];
    role?: string;
    teamSize?: number;
  }): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
    features?: string[];
  }> {
    try {
      // Create combined text from project fields
      let combinedText = `${project.title}. ${project.description}.`;
      
      if (project.objectives && project.objectives.length > 0) {
        combinedText += ` Objectives: ${project.objectives.join(', ')}.`;
      }
      
      if (project.outcomes && project.outcomes.length > 0) {
        combinedText += ` Outcomes: ${project.outcomes.join(', ')}.`;
      }
      
      if (project.technologies && project.technologies.length > 0) {
        combinedText += ` Technologies: ${project.technologies.join(', ')}.`;
      }
      
      if (project.methodologies && project.methodologies.length > 0) {
        combinedText += ` Methodologies: ${project.methodologies.join(', ')}.`;
      }
      
      if (project.role) {
        combinedText += ` Role: ${project.role}.`;
      }
      
      // Analyze text content first
      const textAnalysis = this.analyzeTextContent(combinedText, { contentType: 'professional' }).traits;
      
      // Add project-specific traits based on technologies, methodologies, etc.
      const projectSpecificTraits = this.deriveProjectSpecificTraits(project);
      
      // Merge results
      return this.mergeTraitResults(textAnalysis, projectSpecificTraits);
      
    } catch (error) {
      logger.error('Error analyzing project details', { error });
      return [];
    }
  }

  /**
   * Derive project-specific traits based on project details
   */
  private deriveProjectSpecificTraits(project: {
    title: string;
    description: string;
    objectives?: string[];
    outcomes?: string[];
    technologies?: string[];
    methodologies?: string[];
    role?: string;
    teamSize?: number;
  }): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
    features: string[];
  }> {
    const traits: Array<{
      name: string;
      category: string;
      score: number;
      confidence: number;
      evidence: string[];
      features: string[];
    }> = [];

    // Check for leadership traits
    if (project.role?.toLowerCase().includes('lead') ||
        project.role?.toLowerCase().includes('manager') ||
        project.teamSize && project.teamSize > 3) {
      traits.push({
        name: 'leadership',
        category: 'leadership',
        score: project.teamSize ? Math.min(85, 60 + project.teamSize * 5) : 70,
        confidence: 0.75,
        evidence: [`Role: ${project.role}`, `Team size: ${project.teamSize}`],
        features: ['Team management', 'Project leadership']
      });
    }

    // Check for technical expertise based on technologies
    if (project.technologies && project.technologies.length > 0) {
      const techScore = Math.min(90, 60 + project.technologies.length * 5);
      traits.push({
        name: 'technical expertise',
        category: 'technical',
        score: techScore,
        confidence: 0.8,
        evidence: [`Technologies: ${project.technologies.join(', ')}`],
        features: project.technologies
      });
    }

    // Check for methodology expertise
    if (project.methodologies && project.methodologies.length > 0) {
      const agileMethodologies = project.methodologies.filter(m =>
        m.toLowerCase().includes('agile') ||
        m.toLowerCase().includes('scrum') ||
        m.toLowerCase().includes('kanban')
      );
      
      if (agileMethodologies.length > 0) {
        traits.push({
          name: 'agile methodology',
          category: 'process',
          score: 80,
          confidence: 0.75,
          evidence: [`Methodologies: ${agileMethodologies.join(', ')}`],
          features: agileMethodologies
        });
      }
    }

    return traits;
  }

  /**
   * Analyzes feedback to identify traits
   * @param feedback Feedback data to analyze
   * @returns Identified traits with confidence scores
   */
  public analyzeFeedback(feedback: {
    text: string;
    source: string;
    relationship?: string;
    context?: string;
    rating?: number; // 1-5 scale
  }): Array<{
    name: string;
    category: string;
    score: number;
    confidence: number;
    evidence: string[];
  }> {
    try {
      // Create context-enhanced text
      let enhancedText = feedback.text;
      
      if (feedback.context) {
        enhancedText = `Context: ${feedback.context}. ${enhancedText}`;
      }
      
      if (feedback.relationship) {
        enhancedText += ` (Feedback from ${feedback.relationship})`;
      }
      
      // Analyze the text
      const textAnalysis = this.analyzeTextContent(enhancedText, {
        contentType: 'feedback'
      }).traits;
      
      // Adjust confidence based on source and relationship
      return textAnalysis.map(trait => {
        let adjustedConfidence = trait.confidence;
        
        // Adjust confidence based on relationship
        if (feedback.relationship === 'manager' || feedback.relationship === 'supervisor') {
          adjustedConfidence = Math.min(1.0, adjustedConfidence * 1.2); // 20% boost for manager feedback
        } else if (feedback.relationship === 'peer') {
          adjustedConfidence = Math.min(1.0, adjustedConfidence * 1.1); // 10% boost for peer feedback
        }
        
        // Adjust confidence based on rating if available
        if (feedback.rating) {
          // Higher ratings (4-5) boost confidence, lower ratings (1-2) reduce it
          const ratingFactor = feedback.rating > 3 ? 1.1 : (feedback.rating < 3 ? 0.9 : 1.0);
          adjustedConfidence = Math.min(1.0, adjustedConfidence * ratingFactor);
        }
        
        return {
          ...trait,
          confidence: adjustedConfidence
        };
      });
      
    } catch (error) {
      logger.error('Error analyzing feedback', { error });
      return [];
    }
  }
}