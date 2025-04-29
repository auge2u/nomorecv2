import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';

// Type for validated body
type EducationBody = z.infer<typeof educationSchema>;

// Schema for education creation/update
const educationSchema = z.object({
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  startDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'Start date must be a valid date string'
  }),
  endDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'End date must be a valid date string'
  }).optional(),
  isCurrent: z.boolean().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional()
});

// Handler for education-related API endpoints
export async function handleEducationApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
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
    
    // Get all education entries for a profile
    if (path.length === 0 && request.method === 'GET') {
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('profile_id', profileId)
        .order('start_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching education:', error);
        return createCorsResponse({ error: 'Failed to fetch education' }, 500);
      }
      
      return createCorsResponse({ education: data });
    }
    
    // Get education entry by ID
    if (path.length > 0 && request.method === 'GET') {
      const educationId = path[0];
      const { data, error } = await supabase
        .from('education')
        .select('*')
        .eq('id', educationId)
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching education entry:', error);
        return createCorsResponse({ error: 'Education entry not found' }, 404);
      }
      
      return createCorsResponse({ education: data });
    }
    
    // Create education entry
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body: EducationBody = await validateRequestBody(request, educationSchema);
      
      const { data, error } = await supabase
        .from('education')
        .insert([{
          profile_id: profileId,
          institution: body.institution,
          degree: body.degree,
          field: body.field,
          start_date: body.startDate,
          end_date: body.endDate,
          is_current: body.isCurrent,
          description: body.description,
          achievements: body.achievements,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating education entry:', error);
        return createCorsResponse({ error: 'Failed to create education entry' }, 500);
      }
      
      return createCorsResponse({ education: data }, 201);
    }
    
    // Update education entry
    if (path.length > 0 && request.method === 'PUT') {
      const educationId = path[0];
      
      // Validate request body
      const body: EducationBody = await validateRequestBody(request, educationSchema);
      
      const { data, error } = await supabase
        .from('education')
        .update({
          institution: body.institution,
          degree: body.degree,
          field: body.field,
          start_date: body.startDate,
          end_date: body.endDate,
          is_current: body.isCurrent,
          description: body.description,
          achievements: body.achievements,
          updated_at: new Date().toISOString()
        })
        .eq('id', educationId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating education entry:', error);
        return createCorsResponse({ error: 'Failed to update education entry' }, 500);
      }
      
      return createCorsResponse({ education: data });
    }
    
    // Delete education entry
    if (path.length > 0 && request.method === 'DELETE') {
      const educationId = path[0];
      
      const { error } = await supabase
        .from('education')
        .delete()
        .eq('id', educationId)
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error deleting education entry:', error);
        return createCorsResponse({ error: 'Failed to delete education entry' }, 500);
      }
      
      return createCorsResponse({ success: true, deleted_at: new Date().toISOString() });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}