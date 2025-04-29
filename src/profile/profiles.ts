import { z } from 'zod';
import { Env } from './types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from './api';

// Type for validated body
type ProfileBody = z.infer<typeof profileSchema>;

// Schema for profile creation/update
const profileSchema = z.object({
  headline: z.string().optional(),
  summary: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  isPublic: z.boolean().optional()
});

// Handler for profile-related API endpoints
export async function handleProfilesApi(request: Request, env: Env, path: string[]): Promise<Response> {
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
    
    // Get profile by ID
    if (path.length > 0 && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const supabase = getSupabaseClient(env);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return createCorsResponse({ error: 'Profile not found' }, 404);
      }
      
      return createCorsResponse(data);
    }
    
    // Get profile for current user
    if (path.length === 0 && request.method === 'GET') {
      const supabase = getSupabaseClient(env);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        // If profile doesn't exist, create a new one
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              user_id: userId,
              headline: '',
              summary: '',
              is_public: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
            return createCorsResponse({ error: 'Failed to create profile' }, 500);
          }
          
          return createCorsResponse(newProfile);
        }
        
        console.error('Error fetching profile:', error);
        return createCorsResponse({ error: 'Failed to fetch profile' }, 500);
      }
      
      return createCorsResponse(data);
    }
    
    // Update profile
    if (path.length > 0 && request.method === 'PUT') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Validate request body
      const body: ProfileBody = await validateRequestBody(request, profileSchema);
      
      const supabase = getSupabaseClient(env);
      const { data, error } = await supabase
        .from('profiles')
        .update({
          headline: body.headline,
          summary: body.summary,
          location: body.location,
          website: body.website,
          is_public: body.isPublic,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return createCorsResponse({ error: 'Failed to update profile' }, 500);
      }
      
      return createCorsResponse(data);
    }
    
    // Get complete profile (including related data)
    if (path.length > 0 && path[1] === 'complete' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const supabase = getSupabaseClient(env);
      
      // Fetch profile and related data in parallel
      const [
        profileResult,
        experiencesResult,
        educationResult,
        projectsResult,
        skillsResult,
        traitsResult,
        certificationsResult
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', profileId).single(),
        supabase.from('experiences').select('*').eq('profile_id', profileId).order('start_date', { ascending: false }),
        supabase.from('education').select('*').eq('profile_id', profileId).order('start_date', { ascending: false }),
        supabase.from('projects').select('*').eq('profile_id', profileId).order('start_date', { ascending: false }),
        supabase.from('skills').select('*').eq('profile_id', profileId).order('level', { ascending: false }),
        supabase.from('traits').select('*').eq('profile_id', profileId).order('score', { ascending: false }),
        supabase.from('certifications').select('*').eq('profile_id', profileId).order('issue_date', { ascending: false })
      ]);
      
      if (profileResult.error) {
        console.error('Error fetching profile:', profileResult.error);
        return createCorsResponse({ error: 'Profile not found' }, 404);
      }
      
      // Combine all data
      const completeProfile = {
        profile: profileResult.data,
        experiences: experiencesResult.data || [],
        education: educationResult.data || [],
        projects: projectsResult.data || [],
        skills: skillsResult.data || [],
        traits: traitsResult.data || [],
        certifications: certificationsResult.data || []
      };
      
      return createCorsResponse(completeProfile);
    }
    
    // Route to entity-specific API handlers
    if (path.length > 0 && path[1]) {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Route to experience endpoints
      if (path[1] === 'experience' || path[1] === 'experiences') {
        const { handleExperiencesApi } = await import('./api/experiences');
        return await handleExperiencesApi(request, env, path.slice(2), profileId);
      }
      
      // Route to education endpoints
      if (path[1] === 'education') {
        const { handleEducationApi } = await import('./api/education');
        return await handleEducationApi(request, env, path.slice(2), profileId);
      }
      
      // Route to skills endpoints
      if (path[1] === 'skills') {
        const { handleSkillsApi } = await import('./api/skills');
        return await handleSkillsApi(request, env, path.slice(2), profileId);
      }
      
      // Route to projects endpoints
      if (path[1] === 'projects') {
        const { handleProjectsApi } = await import('./api/projects');
        return await handleProjectsApi(request, env, path.slice(2), profileId);
      }
      
      // Route to certifications endpoints
      if (path[1] === 'certifications') {
        const { handleCertificationsApi } = await import('./api/certifications');
        return await handleCertificationsApi(request, env, path.slice(2), profileId);
      }
      
      // Route to traits endpoints
      if (path[1] === 'traits') {
        const { handleTraitsApi } = await import('./api/traits');
        return await handleTraitsApi(request, env, path.slice(2), profileId);
      }
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}
