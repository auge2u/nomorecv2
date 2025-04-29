import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';

// Type for validated body
type SkillBody = z.infer<typeof skillSchema>;

// Schema for skill creation/update
const skillSchema = z.object({
  name: z.string(),
  level: z.number().min(1).max(10).optional(),
  years: z.number().min(0).optional(),
  category: z.string().optional(),
  endorsements: z.record(z.unknown()).optional()
});

// Handler for skill-related API endpoints
export async function handleSkillsApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
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
    
    // Get all skills for a profile
    if (path.length === 0 && request.method === 'GET') {
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('profile_id', profileId)
        .order('level', { ascending: false });
      
      if (error) {
        console.error('Error fetching skills:', error);
        return createCorsResponse({ error: 'Failed to fetch skills' }, 500);
      }
      
      return createCorsResponse({ skills: data });
    }
    
    // Get skill by ID
    if (path.length > 0 && request.method === 'GET') {
      const skillId = path[0];
      const { data, error } = await supabase
        .from('skills')
        .select('*')
        .eq('id', skillId)
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching skill:', error);
        return createCorsResponse({ error: 'Skill not found' }, 404);
      }
      
      return createCorsResponse({ skill: data });
    }
    
    // Create skill
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body: SkillBody = await validateRequestBody(request, skillSchema);
      
      const { data, error } = await supabase
        .from('skills')
        .insert([{
          profile_id: profileId,
          name: body.name,
          level: body.level || 1,
          years: body.years || 0,
          category: body.category || 'Other',
          endorsements: body.endorsements || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating skill:', error);
        return createCorsResponse({ error: 'Failed to create skill' }, 500);
      }
      
      return createCorsResponse({ skill: data }, 201);
    }
    
    // Update skill
    if (path.length > 0 && request.method === 'PUT') {
      const skillId = path[0];
      
      // Validate request body
      const body: SkillBody = await validateRequestBody(request, skillSchema);
      
      const { data, error } = await supabase
        .from('skills')
        .update({
          name: body.name,
          level: body.level,
          years: body.years,
          category: body.category,
          endorsements: body.endorsements,
          updated_at: new Date().toISOString()
        })
        .eq('id', skillId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating skill:', error);
        return createCorsResponse({ error: 'Failed to update skill' }, 500);
      }
      
      return createCorsResponse({ skill: data });
    }
    
    // Delete skill
    if (path.length > 0 && request.method === 'DELETE') {
      const skillId = path[0];
      
      const { error } = await supabase
        .from('skills')
        .delete()
        .eq('id', skillId)
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error deleting skill:', error);
        return createCorsResponse({ error: 'Failed to delete skill' }, 500);
      }
      
      return createCorsResponse({ success: true, deleted_at: new Date().toISOString() });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}