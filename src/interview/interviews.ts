import { z } from 'zod';
import { Env } from '../types';
import { getSupabaseClient, getUserIdFromRequest, createCorsResponse, handleError, validateRequestBody, checkResourceAccess } from '../utils/api';
import interviewService from '../services/interview.service';

// Schema for interview creation/update
const interviewSchema = z.object({
  profileId: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  scheduledAt: z.string().datetime().optional()
});

// Handler for interview-related API endpoints
export async function handleInterviewsApi(request: Request, env: Env, path: string[]): Promise<Response> {
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
    
    // Get interviews for a profile
    if (path.length > 0 && path[1] === 'profile' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const interviews = await interviewService.getInterviewsForProfile(profileId);
      return createCorsResponse(interviews);
    }
    
    // Get a specific interview
    if (path.length > 0 && request.method === 'GET') {
      const interviewId = path[0];
      
      const interview = await interviewService.getInterviewById(interviewId);
      
      // Check if user has access to the profile this interview belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', interview.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      return createCorsResponse(interview);
    }
    
    // Create a new interview
    if (path.length === 0 && request.method === 'POST') {
      // Validate request body
      const body = await validateRequestBody(request, interviewSchema);
      
      // Check if user has access to the profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', body.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      const interview = await interviewService.createInterview(body);
      return createCorsResponse(interview, 201);
    }
    
    // Update interview status
    if (path.length > 0 && path[1] === 'status' && request.method === 'PUT') {
      const interviewId = path[0];
      
      // Get the interview to check access
      const existingInterview = await interviewService.getInterviewById(interviewId);
      
      // Check if user has access to the profile this interview belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingInterview.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get status from request body
      const body = await request.json();
      const status = body.status;
      
      if (!status || !['scheduled', 'in-progress', 'completed'].includes(status)) {
        return createCorsResponse({ error: 'Invalid status' }, 400);
      }
      
      const updates = {
        videoUrl: body.videoUrl,
        transcriptUrl: body.transcriptUrl,
        insights: body.insights
      };
      
      const interview = await interviewService.updateInterviewStatus(interviewId, status, updates);
      return createCorsResponse(interview);
    }
    
    // Generate interview questions
    if (path.length > 0 && path[1] === 'questions' && request.method === 'GET') {
      const profileId = path[0];
      
      // Check if user has access to this profile
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Get industry from query params
      const url = new URL(request.url);
      const industry = url.searchParams.get('industry');
      
      const questions = await interviewService.generateInterviewQuestions(profileId, industry || undefined);
      return createCorsResponse({ questions });
    }
    
    // Process completed interview
    if (path.length > 0 && path[1] === 'process' && request.method === 'POST') {
      const interviewId = path[0];
      
      // Get the interview to check access
      const existingInterview = await interviewService.getInterviewById(interviewId);
      
      // Check if user has access to the profile this interview belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingInterview.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Check if interview is completed
      if (existingInterview.status !== 'completed') {
        return createCorsResponse({ error: 'Interview is not completed' }, 400);
      }
      
      const contentIds = await interviewService.processCompletedInterview(interviewId);
      return createCorsResponse({ contentIds });
    }
    
    // Start interview session (Durable Object)
    if (path.length > 0 && path[1] === 'session' && path[2] === 'start' && request.method === 'POST') {
      const interviewId = path[0];
      
      // Get the interview to check access
      const existingInterview = await interviewService.getInterviewById(interviewId);
      
      // Check if user has access to the profile this interview belongs to
      const hasAccess = await checkResourceAccess(env, userId, 'profiles', existingInterview.profileId);
      if (!hasAccess) {
        return createCorsResponse({ error: 'Forbidden' }, 403);
      }
      
      // Create a new interview session using Durable Object
      const id = env.INTERVIEW_SESSIONS.newUniqueId();
      const session = env.INTERVIEW_SESSIONS.get(id);
      
      // Forward the request to the Durable Object
      const newRequest = new Request(`https://interview-session/start`, {
        method: 'POST',
        headers: request.headers,
        body: JSON.stringify({
          interviewId,
          profileId: existingInterview.profileId,
          userId
        })
      });
      
      const response = await session.fetch(newRequest);
      const data = await response.json();
      
      // Update interview status to in-progress
      await interviewService.updateInterviewStatus(interviewId, 'in-progress');
      
      return createCorsResponse({
        sessionId: id.toString(),
        ...data
      });
    }
    
    return createCorsResponse({ error: 'Not found' }, 404);
  } catch (error) {
    return handleError(error);
  }
}
