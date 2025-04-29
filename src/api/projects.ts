import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';

// Type for validated body
type ProjectBody = z.infer<typeof projectSchema>;

// Schema for project creation/update
const projectSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'Start date must be a valid date string'
  }).optional(),
  endDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'End date must be a valid date string'
  }).optional(),
  technologies: z.array(z.string()).optional(),
  achievements: z.array(z.string()).optional(),
  url: z.string().url().optional(),
  media: z.array(z.string()).optional()
});

// Handler for project-related API endpoints
export async function handleProjectsApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
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
    
    // Check if user has access to this profile
    const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
    if (!hasAccess) {
      return createCorsResponse({ error: 'Forbidden' }, 403);
    }
    
    const supabase = getSupabaseClient(env);
    
    // Get all projects for a profile
    if (path.length === 0 && request.method === 'GET') {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching projects:', error);
        return createCorsResponse({ error: 'Failed to fetch projects' }, 500);
      }
      
      return createCorsResponse({ projects: data });
    }
    
    // Get project by ID
    if (path.length > 0 && request.method === 'GET') {
      const projectId = path[0];
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching project:', error);
        return createCorsResponse({ error: 'Project not found' }, 404);
      }
      
      return createCorsResponse({ project: data });
    }
    
    // Create project
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body: ProjectBody = await validateRequestBody(request, projectSchema);
      
      const { data, error } = await supabase
        .from('projects')
        .insert([{
          profile_id: profileId,
          title: body.title,
          description: body.description,
          start_date: body.startDate,
          end_date: body.endDate,
          technologies: body.technologies || [],
          achievements: body.achievements || [],
          url: body.url,
          media: body.media || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating project:', error);
        return createCorsResponse({ error: 'Failed to create project' }, 500);
      }
      
      return createCorsResponse({ project: data }, 201);
    }
    
    // Update project
    if (path.length > 0 && request.method === 'PUT') {
      const projectId = path[0];
      
      // Validate request body
      const body: ProjectBody = await validateRequestBody(request, projectSchema);
      
      const { data, error } = await supabase
        .from('projects')
        .update({
          title: body.title,
          description: body.description,
          start_date: body.startDate,
          end_date: body.endDate,
          technologies: body.technologies,
          achievements: body.achievements,
          url: body.url,
          media: body.media,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating project:', error);
        return createCorsResponse({ error: 'Failed to update project' }, 500);
      }
      
      return createCorsResponse({ project: data });
    }
    
    // Delete project
    if (path.length > 0 && request.method === 'DELETE') {
      const projectId = path[0];
      
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error deleting project:', error);
        return createCorsResponse({ error: 'Failed to delete project' }, 500);
      }
      
      return createCorsResponse({ success: true, deleted_at: new Date().toISOString() });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}