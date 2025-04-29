import { Env } from '../types';
import { InterviewSession } from '../durable_objects/interview_session';
import { handleProfilesApi } from './profiles';
import { handleCertificationsApi } from './api/certifications';
import { handleExperiencesApi } from './api/experiences';
import { handleEducationApi } from './api/education';
import { handleSkillsApi } from './api/skills';
import { handleProjectsApi } from './api/projects';
import { handleTraitsApi } from './api/traits';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    
    // Route to interview session endpoints
    if (path[0] === 'api' && path[1] === 'v1' && path[2] === 'interviews' && path[3] === 'sessions') {
      return await handleInterviewSession(request, env, path.slice(4));
    }
    
    // Handle other API routes
    if (path[0] === 'api' && path[1] === 'v1') {
      return await handleApiRequest(request, env, path.slice(2));
    }
    
    // Default response for unmatched routes
    return new Response('Not found', { status: 404 });
  }
};

async function handleInterviewSession(request: Request, env: Env, path: string[]): Promise<Response> {
  // Create a new interview session
  if (request.method === 'POST' && path.length === 0) {
    const data = await request.json();
    const id = env.INTERVIEW_SESSIONS.newUniqueId();
    const session = env.INTERVIEW_SESSIONS.get(id);
    
    // Forward the request to the Durable Object
    const newRequest = new Request(`https://interview-session/start`, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify(data)
    });
    
    return await session.fetch(newRequest);
  }
  
  // Get an existing interview session
  if (path.length > 0) {
    const sessionId = path[0];
    const sessionIdFromName = env.INTERVIEW_SESSIONS.idFromName(sessionId);
    const session = env.INTERVIEW_SESSIONS.get(sessionIdFromName);
    
    // Forward the request to the Durable Object
    const newPath = path.length > 1 ? path.slice(1).join('/') : 'status';
    const newRequest = new Request(`https://interview-session/${newPath}`, {
      method: request.method,
      headers: request.headers,
      body: request.body
    });
    
    return await session.fetch(newRequest);
  }
  
  return new Response('Invalid request', { status: 400 });
}

async function handleApiRequest(request: Request, env: Env, path: string[]): Promise<Response> {
  // Handle different API endpoints based on path
  if (path[0] === 'profiles') {
    return await handleProfilesApi(request, env, path.slice(1));
  }
  
  if (path[0] === 'verifications') {
    return await handleVerificationsApi(request, env, path.slice(1));
  }
  
  if (path[0] === 'content') {
    return await handleContentApi(request, env, path.slice(1));
  }
  
  if (path[0] === 'outputs') {
    return await handleOutputsApi(request, env, path.slice(1));
  }
  
  // Health check endpoint
  if (path[0] === 'health') {
    return new Response(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: env.ENVIRONMENT
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  return new Response('Not found', { status: 404 });
}

// API handlers for verifications, content, and outputs
async function handleVerificationsApi(request: Request, env: Env, path: string[]): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Verifications API not yet implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501
  });
}

async function handleContentApi(request: Request, env: Env, path: string[]): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Content API not yet implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501
  });
}

async function handleOutputsApi(request: Request, env: Env, path: string[]): Promise<Response> {
  return new Response(JSON.stringify({ message: 'Outputs API not yet implemented' }), {
    headers: { 'Content-Type': 'application/json' },
    status: 501
  });
}
