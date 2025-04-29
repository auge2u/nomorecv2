import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../utils/api';
import traitService from '../services/trait.service';

// Schema for trait creation/update
const traitSchema = z.object({
  name: z.string(),
  category: z.string(),
  score: z.number().min(0).max(100),
  assessmentMethod: z.enum(['self', 'external', 'derived'])
});

// Handler for trait-related API endpoints
export async function handleTraitsApi(request: Request, env: Env, path: string[]): Promise<Response> {
  try {
    // Handle OPTIONS request for CORS
    if (request.method === 'OPTIONS') {
      return createCorsResponse({});
    }
    
    // Get user ID from request
    const userId = await getUserIdFromRequest(request, env);
    if (!userId) {
      return createCorsResponse({ error: 'Unauthorized' }, 401);
    }
    
    // Get traits for a profile
    if (path.length > 0 && path[1] === 'profile' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get category from query params if provided
      const url = new URL(request.url);
      const category = url.searchParams.get('category');
      
      const traits = await traitService.getTraitsForProfile(profileId, category || undefined);
      return createCorsResponse(traits);
    }
    
    // Get a specific trait
    if (path.length > 0 && request.method === 'GET') {
      const traitId = path[0];
      
      const trait = await traitService.getTraitById(traitId);
      
      // Check if user has access to the profile this trait belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', trait.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      return createCorsResponse(trait);
    }
    
    // Create a new trait
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body = await validateRequestBody(request, traitSchema);
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', body.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const trait = await traitService.createTrait(body);
      return createCorsResponse(trait, 201);
    }
    
    // Update an existing trait
    if (path.length > 0 && request.method === 'PUT') {
      const traitId = path[0];
      
      // Get the trait to check access
      const existingTrait = await traitService.getTraitById(traitId);
      
      // Check if user has access to the profile this trait belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingTrait.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Validate request body
      const body = await validateRequestBody(request, traitSchema.partial());
      
      const trait = await traitService.updateTrait(traitId, body);
      return createCorsResponse(trait);
    }
    
    // Delete a trait
    if (path.length > 0 && request.method === 'DELETE') {
      const traitId = path[0];
      
      // Get the trait to check access
      const existingTrait = await traitService.getTraitById(traitId);
      
      // Check if user has access to the profile this trait belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingTrait.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      await traitService.deleteTrait(traitId);
      return createCorsResponse({ success: true });
    }
    
    // Assess traits from profile data
    if (path.length > 0 && path[1] === 'assess' && request.method === 'POST') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const traits = await traitService.assessTraitsFromProfile(profileId);
      return createCorsResponse(traits);
    }
    
    // Get trait recommendations
    if (path.length > 0 && path[1] === 'recommendations' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get industry from query params
      const url = new URL(request.url);
      const industry = url.searchParams.get('industry') || 'technology';
      
      const recommendations = await traitService.getTraitRecommendations(profileId, industry);
      return createCorsResponse(recommendations);
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}
