import { z } from 'zod';
import { Env } from '../types';
import { Trait } from '../models';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';
import { TraitService } from '../trait';
import { AppError } from '../error.middleware';

// Interface for trait comparison
interface TraitComparison {
  traitName: string;
  category: string;
  sourceScore: number | null;
  targetScore: number | null;
  difference: number | null;
  percentageDifference: number | null;
  status?: 'only_in_source' | 'only_in_target' | 'matched';
}

// Define interfaces for batch operations
interface BatchTraitRequestBody {
  traits: z.infer<typeof traitSchema>[];
}

interface BatchTraitResult extends Trait {
  operation: 'created' | 'updated';
}

interface BatchTraitError {
  trait: z.infer<typeof traitSchema>;
  error: string;
}

// Constants for error messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Authentication required. Please provide a valid authorization token.',
  FORBIDDEN: 'You do not have permission to access this profile\'s traits.',
  NOT_FOUND: 'The requested trait or resource was not found.',
  VALIDATION_ERROR: 'Invalid request data. Please check your input and try again.',
  SERVER_ERROR: 'An unexpected server error occurred. Please try again later.',
  TRAIT_CREATION_ERROR: 'Failed to create trait. Please check your input and try again.',
  TRAIT_UPDATE_ERROR: 'Failed to update trait. Please verify the trait exists and your input is valid.',
  TRAIT_DELETE_ERROR: 'Failed to delete trait. Please verify the trait exists.',
  TRAIT_FETCH_ERROR: 'Failed to fetch traits. Please try again later.',
  ASSESSMENT_ERROR: 'Failed to process trait assessment. Please try again later.'
};

// Categories for trait validation
const VALID_TRAIT_CATEGORIES = [
  'Cognitive',
  'Execution',
  'Relationship',
  'Motivation',
  'Self-Management'
];

// Enhanced schemas for request validation
const traitSchema = z.object({
  name: z.string().min(2, 'Trait name must be at least 2 characters').max(100, 'Trait name cannot exceed 100 characters'),
  score: z.number().int().min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100'),
  category: z.string().refine(val => VALID_TRAIT_CATEGORIES.includes(val), {
    message: `Category must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`
  }),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional()
});

const selfAssessedTraitSchema = z.object({
  name: z.string().min(2, 'Trait name must be at least 2 characters').max(100, 'Trait name cannot exceed 100 characters'),
  score: z.number().int().min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100'),
  category: z.string().refine(val => VALID_TRAIT_CATEGORIES.includes(val), {
    message: `Category must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`
  }),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional()
});

const externalAssessedTraitSchema = z.object({
  name: z.string().min(2, 'Trait name must be at least 2 characters').max(100, 'Trait name cannot exceed 100 characters'),
  score: z.number().int().min(0, 'Score must be between 0 and 100').max(100, 'Score must be between 0 and 100'),
  category: z.string().refine(val => VALID_TRAIT_CATEGORIES.includes(val), {
    message: `Category must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`
  }),
  assessor: z.object({
    name: z.string().min(2, 'Assessor name must be at least 2 characters').max(100, 'Assessor name cannot exceed 100 characters'),
    relationship: z.string().min(2, 'Relationship description must be at least 2 characters').max(100, 'Relationship description cannot exceed 100 characters'),
    email: z.string().email('Invalid email format').optional()
  }),
  description: z.string().max(500, 'Description cannot exceed 500 characters').optional()
});

const derivedAssessmentSchema = z.object({
  forceRefresh: z.boolean().optional(),
  categories: z.array(z.string().refine(val => VALID_TRAIT_CATEGORIES.includes(val), {
    message: `Category must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`
  })).optional()
});

const recommendationSchema = z.object({
  industry: z.string().min(2, 'Industry name must be at least 2 characters').max(100, 'Industry name cannot exceed 100 characters'),
  limit: z.number().int().min(1).max(50).optional()
});

const traitComparisonSchema = z.object({
  targetProfileId: z.string().uuid('Target profile ID must be a valid UUID')
});

// Types for validated bodies
type TraitBody = z.infer<typeof traitSchema>;
type SelfAssessedTraitBody = z.infer<typeof selfAssessedTraitSchema>;
type ExternalAssessedTraitBody = z.infer<typeof externalAssessedTraitSchema>;
type DerivedAssessmentBody = z.infer<typeof derivedAssessmentSchema>;
type RecommendationBody = z.infer<typeof recommendationSchema>;
type TraitComparisonBody = z.infer<typeof traitComparisonSchema>;

// Standard response format
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

/**
 * Creates a standardized successful response
 */
function createSuccessResponse<T>(data: T, meta?: ApiResponse['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    meta
  };
}

/**
 * Creates a standardized error response
 */
function createErrorResponse(error: string): ApiResponse {
  return {
    success: false,
    error
  };
}

/**
 * Handler for trait-related API endpoints
 * Implements the Persona Trait System (WP9) API
 */
export async function handleTraitsApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
  try {
    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return createCorsResponse({});
    }
    
    // Get user ID from request
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return createCorsResponse(createErrorResponse(ERROR_MESSAGES.UNAUTHORIZED), 401);
    }
    
    // Check if user has access to this profile
    const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
    if (!hasAccess) {
      return createCorsResponse(createErrorResponse(ERROR_MESSAGES.FORBIDDEN), 403);
    }
    
    // Initialize trait service
    const traitService = new TraitService();
    
    // Parse query parameters for pagination and filtering
    const url = new URL(request.url);
    const queryParams = {
      category: url.searchParams.get('category') || undefined,
      limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50,
      page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!, 10) : 1,
      sort: url.searchParams.get('sort') || 'score',
      order: url.searchParams.get('order') as 'asc' | 'desc' || 'desc'
    };
    
    // Handle different endpoint patterns
    
    // 1. Base trait management endpoints
    
    // GET /traits - Get all traits for a profile
    if (path.length === 0 && request.method === 'GET') {
      try {
        // Validate query parameters
        if (queryParams.category && !VALID_TRAIT_CATEGORIES.includes(queryParams.category)) {
          return createCorsResponse(
            createErrorResponse(`Invalid category. Must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`),
            400
          );
        }
        
        if (queryParams.limit < 1 || queryParams.limit > 100) {
          return createCorsResponse(
            createErrorResponse('Limit must be between 1 and 100'),
            400
          );
        }
        
        if (queryParams.page < 1) {
          return createCorsResponse(
            createErrorResponse('Page must be greater than 0'),
            400
          );
        }
        
        // Get traits with pagination
        const traits = await traitService.getTraitsForProfile(profileId, queryParams.category);
        
        // Apply manual pagination
        const startIdx = (queryParams.page - 1) * queryParams.limit;
        const endIdx = startIdx + queryParams.limit;
        const paginatedTraits = traits.slice(startIdx, endIdx);
        
        return createCorsResponse(createSuccessResponse(
          paginatedTraits,
          {
            total: traits.length,
            page: queryParams.page,
            limit: queryParams.limit,
            totalPages: Math.ceil(traits.length / queryParams.limit)
          }
        ));
      } catch (error) {
        console.error('Error fetching traits:', error);
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.TRAIT_FETCH_ERROR),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // GET /traits/{id} - Get trait by ID
    if (path.length === 1 && path[0] !== 'assessment' && path[0] !== 'relationships' &&
        path[0] !== 'evolution' && path[0] !== 'recommendations' &&
        path[0] !== 'compare' && request.method === 'GET') {
      const traitId = path[0];
      
      try {
        // Validate traitId format
        if (!traitId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return createCorsResponse(
            createErrorResponse('Invalid trait ID format. Must be a valid UUID.'),
            400
          );
        }
        
        const trait = await traitService.getTraitById(traitId);
        
        // Check if trait belongs to requested profile
        if (!trait) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.NOT_FOUND), 404);
        }
        
        if (trait.profileId !== profileId) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.FORBIDDEN), 403);
        }
        
        return createCorsResponse(createSuccessResponse(trait));
      } catch (error) {
        console.error('Error fetching trait:', error);
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.NOT_FOUND),
          error instanceof AppError ? error.statusCode : 404
        );
      }
    }
    
    // POST /traits - Create trait (direct API creation)
    if (path.length === 0 && request.method === 'POST') {
      try {
        // Validate request body
        const body: TraitBody = await validateRequestBody(request, traitSchema);
        
        const trait = await traitService.createTrait({
          profileId,
          name: body.name,
          score: body.score,
          category: body.category,
          assessmentMethod: 'self', // Default to self-assessment for direct API creation
          assessmentDate: new Date()
        });
        
        return createCorsResponse(createSuccessResponse(trait), 201);
      } catch (error) {
        console.error('Error creating trait:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.TRAIT_CREATION_ERROR),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // PUT /traits/{id} - Update trait
    if (path.length === 1 && path[0] !== 'assessment' && path[0] !== 'relationships' &&
        path[0] !== 'evolution' && path[0] !== 'recommendations' &&
        path[0] !== 'compare' && request.method === 'PUT') {
      const traitId = path[0];
      
      try {
        // Validate traitId format
        if (!traitId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return createCorsResponse(
            createErrorResponse('Invalid trait ID format. Must be a valid UUID.'),
            400
          );
        }
        
        // Verify trait exists and belongs to this profile
        const existingTrait = await traitService.getTraitById(traitId);
        if (!existingTrait) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.NOT_FOUND), 404);
        }
        
        if (existingTrait.profileId !== profileId) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.FORBIDDEN), 403);
        }
        
        // Validate request body
        const body: TraitBody = await validateRequestBody(request, traitSchema);
        
        const updateData: Partial<Trait> = {
          name: body.name,
          score: body.score,
          category: body.category
        };
        
        const trait = await traitService.updateTrait(traitId, updateData);
        
        return createCorsResponse(createSuccessResponse(trait));
      } catch (error) {
        console.error('Error updating trait:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        
        if (error instanceof AppError && error.statusCode === 404) {
          return createCorsResponse(
            createErrorResponse(ERROR_MESSAGES.NOT_FOUND),
            404
          );
        }
        
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.TRAIT_UPDATE_ERROR),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // DELETE /traits/{id} - Delete trait
    if (path.length === 1 && path[0] !== 'assessment' && path[0] !== 'relationships' &&
        path[0] !== 'evolution' && path[0] !== 'recommendations' &&
        path[0] !== 'compare' && request.method === 'DELETE') {
      const traitId = path[0];
      
      try {
        // Validate traitId format
        if (!traitId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
          return createCorsResponse(
            createErrorResponse('Invalid trait ID format. Must be a valid UUID.'),
            400
          );
        }
        
        // Verify trait exists and belongs to this profile
        const existingTrait = await traitService.getTraitById(traitId);
        if (!existingTrait) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.NOT_FOUND), 404);
        }
        
        if (existingTrait.profileId !== profileId) {
          return createCorsResponse(createErrorResponse(ERROR_MESSAGES.FORBIDDEN), 403);
        }
        
        await traitService.deleteTrait(traitId);
        return createCorsResponse(createSuccessResponse({
          id: traitId,
          deleted: true,
          deletedAt: new Date().toISOString()
        }));
      } catch (error) {
        console.error('Error deleting trait:', error);
        
        if (error instanceof AppError && error.statusCode === 404) {
          return createCorsResponse(
            createErrorResponse(ERROR_MESSAGES.NOT_FOUND),
            404
          );
        }
        
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.TRAIT_DELETE_ERROR),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // 2. Assessment endpoints
    
    // POST /traits/assessment/self - Add self-assessed trait
    if (path.length === 2 && path[0] === 'assessment' && path[1] === 'self' && request.method === 'POST') {
      try {
        const body: SelfAssessedTraitBody = await validateRequestBody(request, selfAssessedTraitSchema);
        
        const trait = await traitService.addSelfAssessedTrait(
          profileId,
          body.name,
          body.category,
          body.score
        );
        
        return createCorsResponse(createSuccessResponse(trait), 201);
      } catch (error) {
        console.error('Error adding self-assessed trait:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse('Failed to add self-assessed trait. Please check your input and try again.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // POST /traits/assessment/external - Add externally assessed trait
    if (path.length === 2 && path[0] === 'assessment' && path[1] === 'external' && request.method === 'POST') {
      try {
        const body: ExternalAssessedTraitBody = await validateRequestBody(request, externalAssessedTraitSchema);
        
        const trait = await traitService.addExternalAssessedTrait(
          profileId,
          body.name,
          body.category,
          body.score,
          body.assessor.name
        );
        
        return createCorsResponse(createSuccessResponse(trait), 201);
      } catch (error) {
        console.error('Error adding externally-assessed trait:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse('Failed to add externally-assessed trait. Please check your input and try again.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // POST /traits/assessment/derived - Run derived trait assessment
    if (path.length === 2 && path[0] === 'assessment' && path[1] === 'derived' && request.method === 'POST') {
      try {
        const body: DerivedAssessmentBody = await validateRequestBody(request, derivedAssessmentSchema);
        
        const traits = await traitService.assessTraitsFromProfile(profileId);
        
        // Filter by categories if specified
        const filteredTraits = body.categories && body.categories.length > 0
          ? traits.filter(trait => body.categories!.includes(trait.category))
          : traits;
        
        return createCorsResponse(createSuccessResponse({
          traits: filteredTraits,
          count: filteredTraits.length,
          assessedAt: new Date().toISOString()
        }), 201);
      } catch (error) {
        console.error('Error deriving traits from profile:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse(ERROR_MESSAGES.ASSESSMENT_ERROR),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // 3. Analysis and insight endpoints
    
    // GET /traits/relationships - Get trait relationships
    if (path.length === 1 && path[0] === 'relationships' && request.method === 'GET') {
      try {
        // Parse query parameters for filtering
        const category = url.searchParams.get('category') || undefined;
        const threshold = url.searchParams.get('threshold')
          ? parseFloat(url.searchParams.get('threshold')!)
          : 0.5;
        
        // Validate parameters
        if (category && !VALID_TRAIT_CATEGORIES.includes(category)) {
          return createCorsResponse(
            createErrorResponse(`Invalid category. Must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`),
            400
          );
        }
        
        if (threshold < 0 || threshold > 1) {
          return createCorsResponse(
            createErrorResponse('Threshold must be between 0 and 1'),
            400
          );
        }
        
        const relationships = await traitService.getTraitRelationships(profileId);
        
        // If category is specified, filter relationships
        const filteredRelationships = category
          ? {
              ...relationships,
              relationships: relationships.relationships.filter(r =>
                r.trait1.category === category || r.trait2.category === category
              ).filter(r => Math.abs(r.correlation) >= threshold)
            }
          : {
              ...relationships,
              relationships: relationships.relationships.filter(r =>
                Math.abs(r.correlation) >= threshold
              )
            };
        
        return createCorsResponse(createSuccessResponse(filteredRelationships));
      } catch (error) {
        console.error('Error getting trait relationships:', error);
        return createCorsResponse(
          createErrorResponse('Failed to analyze trait relationships. Please try again later.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // GET /traits/evolution - Get trait evolution over time (all traits)
    if (path.length === 1 && path[0] === 'evolution' && request.method === 'GET') {
      try {
        // Parse query parameters for filtering
        const category = url.searchParams.get('category') || undefined;
        const startDate = url.searchParams.get('startDate')
          ? new Date(url.searchParams.get('startDate')!)
          : undefined;
        const endDate = url.searchParams.get('endDate')
          ? new Date(url.searchParams.get('endDate')!)
          : undefined;
        
        // Validate parameters
        if (category && !VALID_TRAIT_CATEGORIES.includes(category)) {
          return createCorsResponse(
            createErrorResponse(`Invalid category. Must be one of: ${VALID_TRAIT_CATEGORIES.join(', ')}`),
            400
          );
        }
        
        if (startDate && isNaN(startDate.getTime())) {
          return createCorsResponse(
            createErrorResponse('Invalid startDate format. Use ISO 8601 format (e.g., "2023-01-15T00:00:00Z")'),
            400
          );
        }
        
        if (endDate && isNaN(endDate.getTime())) {
          return createCorsResponse(
            createErrorResponse('Invalid endDate format. Use ISO 8601 format (e.g., "2023-01-15T00:00:00Z")'),
            400
          );
        }
        
        // Get evolution data
        const evolutionResult = await traitService.getTraitEvolution(profileId, {});
        
        // Ensure evolution is always an array
        let evolutionArray = Array.isArray(evolutionResult) ? evolutionResult : [evolutionResult];
        
        // Apply filters if provided
        if (category || startDate || endDate) {
          // Filter traits by category if specified
          if (category) {
            evolutionArray = evolutionArray.filter(e => e.category === category);
          }
          
          // Filter data points by date range if specified
          if (startDate || endDate) {
            evolutionArray = evolutionArray.map(e => ({
              ...e,
              dataPoints: e.dataPoints.filter(dp => {
                const dpDate = new Date(dp.date);
                if (startDate && dpDate < startDate) return false;
                if (endDate && dpDate > endDate) return false;
                return true;
              })
            }));
          }
        }
        
        return createCorsResponse(createSuccessResponse({
          evolution: evolutionArray,
          count: evolutionArray.length
        }));
      } catch (error) {
        console.error('Error getting trait evolution:', error);
        return createCorsResponse(
          createErrorResponse('Failed to retrieve trait evolution data. Please try again later.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // GET /traits/evolution/{traitName} - Get evolution for a specific trait
    if (path.length === 2 && path[0] === 'evolution' && request.method === 'GET') {
      const traitName = decodeURIComponent(path[1]);
      
      try {
        // Validate traitName
        if (!traitName || traitName.trim().length < 2) {
          return createCorsResponse(
            createErrorResponse('Invalid trait name. Must be at least 2 characters.'),
            400
          );
        }
        
        // Parse query parameters for filtering
        const startDate = url.searchParams.get('startDate')
          ? new Date(url.searchParams.get('startDate')!)
          : undefined;
        const endDate = url.searchParams.get('endDate')
          ? new Date(url.searchParams.get('endDate')!)
          : undefined;
        
        // Validate parameters
        if (startDate && isNaN(startDate.getTime())) {
          return createCorsResponse(
            createErrorResponse('Invalid startDate format. Use ISO 8601 format (e.g., "2023-01-15T00:00:00Z")'),
            400
          );
        }
        
        if (endDate && isNaN(endDate.getTime())) {
          return createCorsResponse(
            createErrorResponse('Invalid endDate format. Use ISO 8601 format (e.g., "2023-01-15T00:00:00Z")'),
            400
          );
        }
        
        // Get evolution data for specific trait
        const params = {
          traitNames: [traitName]
        };
        
        const evolutionResult = await traitService.getTraitEvolution(profileId, params);
        
        // Ensure evolution is an array
        const evolutionArray = Array.isArray(evolutionResult) ? evolutionResult : [evolutionResult];
        
        // Create a new filtered array
        let filteredEvolution = [...evolutionArray];
        
        // Filter data points by date range if specified
        if (startDate || endDate) {
          filteredEvolution = filteredEvolution.map(e => ({
            ...e,
            dataPoints: e.dataPoints.filter(dp => {
              const dpDate = new Date(dp.date);
              if (startDate && dpDate < startDate) return false;
              if (endDate && dpDate > endDate) return false;
              return true;
            })
          }));
        }
        
        if (filteredEvolution.length === 0) {
          return createCorsResponse(
            createErrorResponse(`No evolution data found for trait: ${traitName}`),
            404
          );
        }
        
        return createCorsResponse(createSuccessResponse(filteredEvolution[0]));
      } catch (error) {
        console.error('Error getting trait evolution:', error);
        return createCorsResponse(
          createErrorResponse('Failed to retrieve trait evolution data. Please try again later.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // POST /traits/recommendations - Get trait recommendations
    if (path.length === 1 && path[0] === 'recommendations' && request.method === 'POST') {
      try {
        const body: RecommendationBody = await validateRequestBody(request, recommendationSchema);
        
        const recommendationsResult = await traitService.getTraitRecommendations(
          profileId,
          body.industry
        );
        
        // Extract recommendations from the result
        const recommendations = recommendationsResult.recommendations || [];
        
        // Apply limit if specified
        const limitedRecommendations = body.limit
          ? recommendations.slice(0, body.limit)
          : recommendations;
        
        return createCorsResponse(createSuccessResponse({
          recommendations: limitedRecommendations,
          count: limitedRecommendations.length,
          industry: body.industry,
          generatedAt: new Date().toISOString(),
          clusterRecommendations: recommendationsResult.clusterRecommendations,
          contextualInsights: recommendationsResult.contextualInsights,
          developmentSuggestions: recommendationsResult.developmentSuggestions
        }));
      } catch (error) {
        console.error('Error getting trait recommendations:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse('Failed to generate trait recommendations. Please check your input and try again.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // 4. Comparison endpoints (new endpoint)
    
    // POST /traits/compare - Compare traits with another profile
    if (path.length === 1 && path[0] === 'compare' && request.method === 'POST') {
      try {
        const body: TraitComparisonBody = await validateRequestBody(request, traitComparisonSchema);
        
        // Check if user has access to target profile
        const hasTargetAccess = await checkResourceAccess(env, userId, 'profiles', body.targetProfileId);
        if (!hasTargetAccess) {
          return createCorsResponse(createErrorResponse('You do not have permission to access the target profile.'), 403);
        }
        
        // Get traits for both profiles
        const sourceTraits = await traitService.getTraitsForProfile(profileId);
        const targetTraits = await traitService.getTraitsForProfile(body.targetProfileId);
        
        // Perform comparison
        const comparison = {
          sourceProfileId: profileId,
          targetProfileId: body.targetProfileId,
          comparisonDate: new Date(),
          traitComparisons: [] as TraitComparison[]
        };
        
        // For each source trait, find matching target trait
        for (const sourceTrait of sourceTraits) {
          const matchingTargetTrait = targetTraits.find(t => t.name === sourceTrait.name);
          if (matchingTargetTrait) {
            comparison.traitComparisons.push({
              traitName: sourceTrait.name,
              category: sourceTrait.category,
              sourceScore: sourceTrait.score,
              targetScore: matchingTargetTrait.score,
              difference: sourceTrait.score - matchingTargetTrait.score,
              percentageDifference: ((sourceTrait.score - matchingTargetTrait.score) / matchingTargetTrait.score) * 100,
              status: 'matched'
            });
          } else {
            comparison.traitComparisons.push({
              traitName: sourceTrait.name,
              category: sourceTrait.category,
              sourceScore: sourceTrait.score,
              targetScore: null,
              difference: null,
              percentageDifference: null,
              status: 'only_in_source'
            });
          }
        }
        
        // Add target traits that don't exist in source
        for (const targetTrait of targetTraits) {
          if (!sourceTraits.some(t => t.name === targetTrait.name)) {
            comparison.traitComparisons.push({
              traitName: targetTrait.name,
              category: targetTrait.category,
              sourceScore: null,
              targetScore: targetTrait.score,
              difference: null,
              percentageDifference: null,
              status: 'only_in_target'
            });
          }
        }
        
        // Calculate summary statistics
        const matchingTraits = comparison.traitComparisons.filter(t =>
          t.sourceScore !== null && t.targetScore !== null
        );
        
        const summary = {
          matchingTraitCount: matchingTraits.length,
          sourceOnlyCount: comparison.traitComparisons.filter(t => t.status === 'only_in_source').length,
          targetOnlyCount: comparison.traitComparisons.filter(t => t.status === 'only_in_target').length,
          averageDifference: matchingTraits.length > 0
            ? matchingTraits.reduce((sum, t) => sum + (t.difference || 0), 0) / matchingTraits.length
            : 0,
          categorySummary: {}
        };
        
        return createCorsResponse(createSuccessResponse({
          comparison,
          summary
        }));
      } catch (error) {
        console.error('Error comparing traits:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse('Failed to compare traits. Please check your input and try again.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // 5. Batch operations endpoint (new endpoint)
    
    // POST /traits/batch - Batch create or update traits
    if (path.length === 1 && path[0] === 'batch' && request.method === 'POST') {
      try {
        // Define batch schema
        const batchSchema = z.object({
          traits: z.array(traitSchema).min(1, 'Must provide at least one trait').max(50, 'Cannot process more than 50 traits at once')
        });
        
        // Validate request body
        const body = await validateRequestBody(request, batchSchema) as BatchTraitRequestBody;
        
        // Process each trait
        const results: BatchTraitResult[] = [];
        const errors: BatchTraitError[] = [];
        
        for (const traitData of body.traits) {
          try {
            // Check if trait with this name already exists
            const existingTraits = await traitService.getTraitsForProfile(profileId);
            const existingTrait = existingTraits.find(t => t.name === traitData.name);
            
            let trait;
            if (existingTrait) {
              // Update
              const updateData: Partial<Trait> = {
                name: traitData.name,
                score: traitData.score,
                category: traitData.category
              };
              
              trait = await traitService.updateTrait(existingTrait.id, updateData);
              results.push({ ...trait, operation: 'updated' as const });
            } else {
              // Create
              trait = await traitService.createTrait({
                profileId,
                name: traitData.name,
                score: traitData.score,
                category: traitData.category,
                assessmentMethod: 'self',
                assessmentDate: new Date()
              });
              results.push({ ...trait, operation: 'created' as const });
            }
          } catch (err) {
            // Handle individual trait error
            errors.push({
              trait: traitData,
              error: err instanceof Error ? err.message : 'Unknown error'
            });
          }
        }
        
        return createCorsResponse(createSuccessResponse({
          results,
          errors,
          summary: {
            total: body.traits.length,
            succeeded: results.length,
            failed: errors.length,
            created: results.filter(r => r.operation === 'created').length,
            updated: results.filter(r => r.operation === 'updated').length
          }
        }), errors.length > 0 ? 207 : 200); // 207 Multi-Status for partial success
      } catch (error) {
        console.error('Error processing batch operation:', error);
        if (error instanceof z.ZodError) {
          return createCorsResponse(
            createErrorResponse(`${ERROR_MESSAGES.VALIDATION_ERROR}: ${error.errors.map(err => err.message).join(', ')}`),
            400
          );
        }
        return createCorsResponse(
          createErrorResponse('Failed to process batch operation. Please check your input and try again.'),
          error instanceof AppError ? error.statusCode : 500
        );
      }
    }
    
    // If we reach here, the endpoint wasn't found
    return createCorsResponse(createErrorResponse('Endpoint not found'), 404);
  } catch (error) {
    console.error('Unhandled error in traits API:', error);
    return handleError(error);
  }
}