import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../utils/api';
import profileService from '../services/profile.service';
import traitService from '../services/trait.service';
import outputService from '../services/output.service';
import contentService from '../services/content.service';

// Schema for blockchain verification request
const blockchainVerificationSchema = z.object({
  entityId: z.string().uuid(),
  entityType: z.enum(['experience', 'education', 'project', 'skill']),
  proofType: z.enum(['zkp', 'certificate', 'reference']),
  blockchainType: z.enum(['sui', 'solana', 'cardano']).optional()
});

// Handler for blockchain-related API endpoints
export async function handleBlockchainApi(request: Request, env: Env, path: string[]): Promise<Response> {
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
    
    // Create a blockchain verification
    if (path.length === 0 && path[0] === 'verify' && request.method === 'POST') {
      // Validate request body
      const body = await validateRequestBody(request, blockchainVerificationSchema);
      
      // Check if user has access to the entity
      let profileId;
      
      switch (body.entityType) {
        case 'experience':
          const experience = await getEntityById('experiences', body.entityId, env);
          profileId = experience.profile_id;
          break;
        case 'education':
          const education = await getEntityById('education', body.entityId, env);
          profileId = education.profile_id;
          break;
        case 'project':
          const project = await getEntityById('projects', body.entityId, env);
          profileId = project.profile_id;
          break;
        case 'skill':
          const skill = await getEntityById('skills', body.entityId, env);
          profileId = skill.profile_id;
          break;
        default:
          return createCorsResponse({ error: 'Invalid entity type' }, 400);
      }
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Create verification request
      const verification = await createBlockchainVerification(body, env);
      
      return createCorsResponse(verification, 201);
    }
    
    // Get verification status
    if (path.length > 0 && request.method === 'GET') {
      const verificationId = path[0];
      
      // Get verification
      const verification = await getVerificationById(verificationId, env);
      
      // Check if user has access to the entity
      let profileId;
      
      switch (verification.entity_type) {
        case 'experience':
          const experience = await getEntityById('experiences', verification.entity_id, env);
          profileId = experience.profile_id;
          break;
        case 'education':
          const education = await getEntityById('education', verification.entity_id, env);
          profileId = education.profile_id;
          break;
        case 'project':
          const project = await getEntityById('projects', verification.entity_id, env);
          profileId = project.profile_id;
          break;
        case 'skill':
          const skill = await getEntityById('skills', verification.entity_id, env);
          profileId = skill.profile_id;
          break;
        default:
          return createCorsResponse({ error: 'Invalid entity type' }, 400);
      }
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      return createCorsResponse(verification);
    }
    
    // Get verifications for an entity
    if (path.length > 0 && path[0] === 'entity' && path.length > 1 && request.method === 'GET') {
      const entityId = path[1];
      const entityType = path[2];
      
      if (!entityType || !['experience', 'education', 'project', 'skill'].includes(entityType)) {
        return createCorsResponse({ error: 'Invalid entity type' }, 400);
      }
      
      // Get entity to check access
      let profileId;
      
      switch (entityType) {
        case 'experience':
          const experience = await getEntityById('experiences', entityId, env);
          profileId = experience.profile_id;
          break;
        case 'education':
          const education = await getEntityById('education', entityId, env);
          profileId = education.profile_id;
          break;
        case 'project':
          const project = await getEntityById('projects', entityId, env);
          profileId = project.profile_id;
          break;
        case 'skill':
          const skill = await getEntityById('skills', entityId, env);
          profileId = skill.profile_id;
          break;
        default:
          return createCorsResponse({ error: 'Invalid entity type' }, 400);
      }
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get verifications
      const verifications = await getVerificationsForEntity(entityId, entityType, env);
      
      return createCorsResponse(verifications);
    }
    
    // Get blockchain info
    if (path.length > 0 && path[0] === 'info' && request.method === 'GET') {
      // Return supported blockchain types and features
      return createCorsResponse({
        supported: ['sui', 'solana', 'cardano'],
        features: {
          'sui': ['zkp', 'certificate'],
          'solana': ['zkp', 'certificate', 'reference'],
          'cardano': ['certificate', 'reference']
        },
        default: 'sui'
      });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}

// Helper function to get entity by ID
async function getEntityById(table: string, id: string, env: Env): Promise<any> {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from(table)
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    throw new Error(`Entity not found: ${error.message}`);
  }
  
  return data;
}

// Helper function to get verification by ID
async function getVerificationById(id: string, env: Env): Promise<any> {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) {
    throw new Error(`Verification not found: ${error.message}`);
  }
  
  return data;
}

// Helper function to get verifications for an entity
async function getVerificationsForEntity(entityId: string, entityType: string, env: Env): Promise<any[]> {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('verifications')
    .select('*')
    .eq('entity_id', entityId)
    .eq('entity_type', entityType);
  
  if (error) {
    throw new Error(`Failed to fetch verifications: ${error.message}`);
  }
  
  return data || [];
}

// Helper function to create a blockchain verification
async function createBlockchainVerification(body: any, env: Env): Promise<any> {
  const supabase = getSupabaseClient(env);
  
  const { data, error } = await supabase
    .from('verifications')
    .insert([{
      entity_id: body.entityId,
      entity_type: body.entityType,
      verifier_type: 'blockchain',
      status: 'pending',
      proof_type: body.proofType,
      proof_data: JSON.stringify({
        blockchain: body.blockchainType || 'sui',
        initiated: new Date().toISOString()
      }),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create verification: ${error.message}`);
  }
  
  // Simulate blockchain verification process
  // In a real implementation, this would initiate the actual blockchain verification
  setTimeout(async () => {
    try {
      // Generate mock proof data
      const proofData = JSON.stringify({
        blockchain: body.blockchainType || 'sui',
        txHash: `${body.blockchainType || 'sui'}_${Math.random().toString(36).substring(2, 15)}`,
        timestamp: new Date().toISOString(),
        verified: true
      });
      
      // Update verification status
      await supabase
        .from('verifications')
        .update({
          status: 'verified',
          proof_data: proofData,
          updated_at: new Date().toISOString()
        })
        .eq('id', data.id);
    } catch (error) {
      console.error('Error completing blockchain verification:', error);
    }
  }, 5000); // Simulate 5-second verification process
  
  return data;
}
