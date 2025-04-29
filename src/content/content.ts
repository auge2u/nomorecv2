import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../utils/api';
import contentService from '../services/content.service';

// Schema for content creation/update
const contentSchema = z.object({
  profileId: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  contentType: z.enum(['article', 'video', 'image', 'audio', 'interactive']),
  format: z.string(),
  url: z.string().url().optional(),
  data: z.any().optional(),
  tags: z.array(z.string()).optional(),
  isPublic: z.boolean().optional()
});

// Schema for distribution creation
const distributionSchema = z.object({
  contentId: z.string().uuid(),
  channelType: z.enum(['linkedin', 'email', 'website', 'twitter', 'custom']),
  status: z.enum(['scheduled', 'published', 'failed']).optional(),
  scheduledAt: z.string().datetime().optional(),
  audience: z.any().optional()
});

// Handler for content-related API endpoints
export async function handleContentApi(request: Request, env: Env, path: string[]): Promise<Response> {
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
    
    // Get content for a profile
    if (path.length > 0 && path[1] === 'profile' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get query parameters
      const url = new URL(request.url);
      const contentType = url.searchParams.get('contentType');
      const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit') as string) : undefined;
      
      const content = await contentService.getContentForProfile(profileId, {
        contentType: contentType || undefined,
        limit
      });
      
      return createCorsResponse(content);
    }
    
    // Get a specific content item
    if (path.length > 0 && request.method === 'GET') {
      const contentId = path[0];
      
      const content = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', content.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      return createCorsResponse(content);
    }
    
    // Create a new content item
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body = await validateRequestBody(request, contentSchema);
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', body.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const content = await contentService.createContent(body);
      return createCorsResponse(content, 201);
    }
    
    // Update an existing content item
    if (path.length > 0 && request.method === 'PUT') {
      const contentId = path[0];
      
      // Get the content to check access
      const existingContent = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingContent.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Validate request body
      const body = await validateRequestBody(request, contentSchema.partial());
      
      const content = await contentService.updateContent(contentId, body);
      return createCorsResponse(content);
    }
    
    // Delete a content item
    if (path.length > 0 && request.method === 'DELETE') {
      const contentId = path[0];
      
      // Get the content to check access
      const existingContent = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingContent.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      await contentService.deleteContent(contentId);
      return createCorsResponse({ success: true });
    }
    
    // Get distributions for content
    if (path.length > 0 && path[1] === 'distributions' && request.method === 'GET') {
      const contentId = path[0];
      
      // Get the content to check access
      const existingContent = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingContent.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const distributions = await contentService.getDistributionsForContent(contentId);
      return createCorsResponse(distributions);
    }
    
    // Create a distribution for content
    if (path.length > 0 && path[1] === 'distribute' && request.method === 'POST') {
      const contentId = path[0];
      
      // Get the content to check access
      const existingContent = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingContent.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Validate request body
      const body = await validateRequestBody(request, distributionSchema);
      
      // Ensure contentId in body matches path
      if (body.contentId !== contentId) {
        return createCorsResponse({ error: 'Content ID mismatch' }, 400);
      }
      
      const distribution = await contentService.createDistribution(body);
      return createCorsResponse(distribution, 201);
    }
    
    // Update distribution status
    if (path.length > 0 && path[1] === 'distributions' && path.length > 2 && request.method === 'PUT') {
      const contentId = path[0];
      const distributionId = path[2];
      
      // Get the content to check access
      const existingContent = await contentService.getContentById(contentId);
      
      // Check if user has access to the profile this content belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingContent.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get status from request body
      const body = await request.json();
      const status = body.status;
      
      if (!status || !['scheduled', 'published', 'failed'].includes(status)) {
        return createCorsResponse({ error: 'Invalid status' }, 400);
      }
      
      const distribution = await contentService.updateDistributionStatus(distributionId, status, body.metrics);
      return createCorsResponse(distribution);
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}
