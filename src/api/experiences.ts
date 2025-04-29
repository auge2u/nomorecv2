import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';

// Type for validated body
type ExperienceBody = z.infer<typeof experienceSchema>;

// Schema for experience creation/update
const experienceSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'Start date must be a valid date string'
  }),
  endDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'End date must be a valid date string'
  }).optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional(),
  technologies: z.array(z.string()).optional()
});

// Handler for experience-related API endpoints
export async function handleExperiencesApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
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
    
    // Get all experiences for a profile
    if (path.length === 0 && request.method === 'GET') {
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching experiences:', error);
        return createCorsResponse({ error: 'Failed to fetch experiences' }, 500);
      }
      
      return createCorsResponse({ experiences: data });
    }
    
    // Get experience by ID
    if (path.length > 0 && request.method === 'GET') {
      const experienceId = path[0];
      const { data, error } = await supabase
        .from('experiences')
        .select('*')
        .eq('id', experienceId)
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching experience:', error);
        return createCorsResponse({ error: 'Experience not found' }, 404);
      }
      
      return createCorsResponse({ experience: data });
    }
    
    // Create experience
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body: ExperienceBody = await validateRequestBody(request, experienceSchema);
      
      const { data, error } = await supabase
        .from('experiences')
        .insert([{
          profile_id: profileId,
          title: body.title,
          company: body.company,
          location: body.location,
          start_date: body.startDate,
          end_date: body.endDate,
          is_current: body.isCurrent || false,
          description: body.description,
          achievements: body.achievements || [],
          technologies: body.technologies || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating experience:', error);
        return createCorsResponse({ error: 'Failed to create experience' }, 500);
      }
      
      return createCorsResponse({ experience: data }, 201);
    }
    
    // Update experience
    if (path.length > 0 && request.method === 'PUT') {
      const experienceId = path[0];
      
      // Validate request body
      const body: ExperienceBody = await validateRequestBody(request, experienceSchema);
      
      const { data, error } = await supabase
        .from('experiences')
        .update({
          title: body.title,
          company: body.company,
          location: body.location,
          start_date: body.startDate,
          end_date: body.endDate,
          is_current: body.isCurrent,
          description: body.description,
          achievements: body.achievements,
          technologies: body.technologies,
          updated_at: new Date().toISOString()
        })
        .eq('id', experienceId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating experience:', error);
        return createCorsResponse({ error: 'Failed to update experience' }, 500);
      }
      
      return createCorsResponse({ experience: data });
    }
    
    // Delete experience
    if (path.length > 0 && request.method === 'DELETE') {
      const experienceId = path[0];
      
      const { error } = await supabase
        .from('experiences')
        .delete()
        .eq('id', experienceId)
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error deleting experience:', error);
        return createCorsResponse({ error: 'Failed to delete experience' }, 500);
      }
      
      return createCorsResponse({ success: true, deleted_at: new Date().toISOString() });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}