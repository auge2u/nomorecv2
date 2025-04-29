import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../api';

// Type for validated body
type CertificationBody = z.infer<typeof certificationSchema>;

// Schema for certification creation/update
const certificationSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  issueDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'Issue date must be a valid date string'
  }),
  expirationDate: z.string().refine(value => !isNaN(Date.parse(value)), {
    message: 'Expiration date must be a valid date string'
  }).optional(),
  credentialId: z.string().optional(),
  credentialUrl: z.string().url().optional(),
  description: z.string().optional()
});

// Handler for certification-related API endpoints
export async function handleCertificationsApi(request: Request, env: Env, path: string[], profileId: string): Promise<Response> {
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
    
    // Get all certifications for a profile
    if (path.length === 0 && request.method === 'GET') {
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('profile_id', profileId)
        .order('issue_date', { ascending: false });
      
      if (error) {
        console.error('Error fetching certifications:', error);
        return createCorsResponse({ error: 'Failed to fetch certifications' }, 500);
      }
      
      return createCorsResponse({ certifications: data });
    }
    
    // Get certification by ID
    if (path.length > 0 && request.method === 'GET') {
      const certificationId = path[0];
      const { data, error } = await supabase
        .from('certifications')
        .select('*')
        .eq('id', certificationId)
        .eq('profile_id', profileId)
        .single();
      
      if (error) {
        console.error('Error fetching certification:', error);
        return createCorsResponse({ error: 'Certification not found' }, 404);
      }
      
      return createCorsResponse({ certification: data });
    }
    
    // Create certification
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body: CertificationBody = await validateRequestBody(request, certificationSchema);
      
      const { data, error } = await supabase
        .from('certifications')
        .insert([{
          profile_id: profileId,
          name: body.name,
          issuer: body.issuer,
          issue_date: body.issueDate,
          expiration_date: body.expirationDate,
          credential_id: body.credentialId,
          credential_url: body.credentialUrl,
          description: body.description,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        console.error('Error creating certification:', error);
        return createCorsResponse({ error: 'Failed to create certification' }, 500);
      }
      
      return createCorsResponse({ certification: data }, 201);
    }
    
    // Update certification
    if (path.length > 0 && request.method === 'PUT') {
      const certificationId = path[0];
      
      // Validate request body
      const body: CertificationBody = await validateRequestBody(request, certificationSchema);
      
      const { data, error } = await supabase
        .from('certifications')
        .update({
          name: body.name,
          issuer: body.issuer,
          issue_date: body.issueDate,
          expiration_date: body.expirationDate,
          credential_id: body.credentialId,
          credential_url: body.credentialUrl,
          description: body.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', certificationId)
        .eq('profile_id', profileId)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating certification:', error);
        return createCorsResponse({ error: 'Failed to update certification' }, 500);
      }
      
      return createCorsResponse({ certification: data });
    }
    
    // Delete certification
    if (path.length > 0 && request.method === 'DELETE') {
      const certificationId = path[0];
      
      const { error } = await supabase
        .from('certifications')
        .delete()
        .eq('id', certificationId)
        .eq('profile_id', profileId);
      
      if (error) {
        console.error('Error deleting certification:', error);
        return createCorsResponse({ error: 'Failed to delete certification' }, 500);
      }
      
      return createCorsResponse({ success: true, deleted_at: new Date().toISOString() });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}