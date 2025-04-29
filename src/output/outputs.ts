import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../utils/api';
import outputService from '../services/output.service';

// Schema for output creation/update
const outputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  outputType: z.enum(['cv', 'portfolio', 'pitch', 'custom']),
  format: z.enum(['web', 'pdf', 'interactive', 'video']),
  context: z.string().optional(),
  industry: z.string().optional(),
  data: z.any().optional()
});

// Handler for output-related API endpoints
export async function handleOutputsApi(request: Request, env: Env, path: string[]): Promise<Response> {
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
    
    // Get outputs for a profile
    if (path.length > 0 && path[1] === 'profile' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get query parameters
      const url = new URL(request.url);
      const outputType = url.searchParams.get('outputType');
      const format = url.searchParams.get('format');
      
      const outputs = await outputService.getOutputsForProfile(profileId, {
        outputType: outputType || undefined,
        format: format || undefined
      });
      
      return createCorsResponse(outputs);
    }
    
    // Get a specific output
    if (path.length > 0 && request.method === 'GET') {
      const outputId = path[0];
      
      const output = await outputService.getOutputById(outputId);
      
      // Check if user has access to the profile this output belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', output.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      return createCorsResponse(output);
    }
    
    // Create a new output
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body = await validateRequestBody(request, outputSchema);
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', body.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const output = await outputService.createOutput(body);
      return createCorsResponse(output, 201);
    }
    
    // Update an existing output
    if (path.length > 0 && request.method === 'PUT') {
      const outputId = path[0];
      
      // Get the output to check access
      const existingOutput = await outputService.getOutputById(outputId);
      
      // Check if user has access to the profile this output belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingOutput.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Validate request body
      const body = await validateRequestBody(request, outputSchema.partial());
      
      const output = await outputService.updateOutput(outputId, body);
      return createCorsResponse(output);
    }
    
    // Delete an output
    if (path.length > 0 && request.method === 'DELETE') {
      const outputId = path[0];
      
      // Get the output to check access
      const existingOutput = await outputService.getOutputById(outputId);
      
      // Check if user has access to the profile this output belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingOutput.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      await outputService.deleteOutput(outputId);
      return createCorsResponse({ success: true });
    }
    
    // Generate a multi-perspective view
    if (path.length > 0 && path[1] === 'generate' && path[2] === 'multi-perspective' && request.method === 'POST') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get parameters from request body
      const body = await request.json();
      const context = body.context || 'leadership';
      const industry = body.industry;
      
      const output = await outputService.generateMultiPerspectiveView(profileId, context, industry);
      return createCorsResponse(output);
    }
    
    // Generate a narrative format
    if (path.length > 0 && path[1] === 'generate' && path[2] === 'narrative' && request.method === 'POST') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get parameters from request body
      const body = await request.json();
      const context = body.context || 'leadership';
      const industry = body.industry;
      
      const output = await outputService.generateNarrativeFormat(profileId, context, industry);
      return createCorsResponse(output);
    }
    
    // Generate a CV format
    if (path.length > 0 && path[1] === 'generate' && path[2] === 'cv' && request.method === 'POST') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get parameters from request body
      const body = await request.json();
      const industry = body.industry || 'technology';
      
      const output = await outputService.generateCVFormat(profileId, industry);
      return createCorsResponse(output);
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}
