import { Env } from '../types';

export interface InterviewSessionState {
  id: string;
  profileId: string;
  status: 'waiting' | 'active' | 'completed';
  startTime?: number;
  endTime?: number;
  questions: string[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  videoStreamId?: string;
  insights?: any;
}

export class InterviewSession {
  private state: InterviewSessionState;
  
  constructor(private readonly state = {
    id: '',
    profileId: '',
    status: 'waiting' as const,
    questions: [],
    currentQuestionIndex: 0,
    answers: {},
  }) {}

  // Handle HTTP requests
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.split('/').filter(Boolean);
    
    if (request.method === 'GET' && path[0] === 'status') {
      return new Response(JSON.stringify({
        id: this.state.id,
        status: this.state.status,
        currentQuestionIndex: this.state.currentQuestionIndex,
        totalQuestions: this.state.questions.length,
        progress: this.state.questions.length > 0 
          ? Math.round((this.state.currentQuestionIndex / this.state.questions.length) * 100) 
          : 0
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (request.method === 'POST' && path[0] === 'start') {
      const data = await request.json();
      return await this.startInterview(data.profileId, data.questions, env);
    }
    
    if (request.method === 'POST' && path[0] === 'answer') {
      const data = await request.json();
      return await this.submitAnswer(data.questionIndex, data.answer);
    }
    
    if (request.method === 'POST' && path[0] === 'next') {
      return await this.nextQuestion();
    }
    
    if (request.method === 'POST' && path[0] === 'complete') {
      return await this.completeInterview(env);
    }
    
    return new Response('Not found', { status: 404 });
  }

  // Start a new interview session
  async startInterview(profileId: string, questions: string[], env: Env): Promise<Response> {
    if (this.state.status !== 'waiting') {
      return new Response('Interview already in progress', { status: 400 });
    }
    
    // Generate a unique ID for this session
    const id = crypto.randomUUID();
    
    // Initialize video stream if using Cloudflare Stream
    let videoStreamId;
    try {
      // This would be replaced with actual Cloudflare Stream API call
      videoStreamId = `stream-${crypto.randomUUID()}`;
    } catch (error) {
      console.error('Failed to initialize video stream', error);
      return new Response('Failed to initialize video stream', { status: 500 });
    }
    
    // Update state
    this.state = {
      ...this.state,
      id,
      profileId,
      questions,
      status: 'active',
      startTime: Date.now(),
      currentQuestionIndex: 0,
      answers: {},
      videoStreamId
    };
    
    return new Response(JSON.stringify({
      id: this.state.id,
      status: this.state.status,
      videoStreamId: this.state.videoStreamId,
      currentQuestion: this.getCurrentQuestion()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Submit an answer to a question
  async submitAnswer(questionIndex: number, answer: string): Promise<Response> {
    if (this.state.status !== 'active') {
      return new Response('Interview not active', { status: 400 });
    }
    
    if (questionIndex !== this.state.currentQuestionIndex) {
      return new Response('Invalid question index', { status: 400 });
    }
    
    // Store the answer
    this.state.answers[questionIndex.toString()] = answer;
    
    return new Response(JSON.stringify({
      success: true,
      questionIndex,
      nextQuestion: this.hasMoreQuestions() ? this.getNextQuestion() : null
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Move to the next question
  async nextQuestion(): Promise<Response> {
    if (this.state.status !== 'active') {
      return new Response('Interview not active', { status: 400 });
    }
    
    if (!this.hasMoreQuestions()) {
      return new Response('No more questions', { status: 400 });
    }
    
    // Move to the next question
    this.state.currentQuestionIndex++;
    
    return new Response(JSON.stringify({
      currentQuestionIndex: this.state.currentQuestionIndex,
      currentQuestion: this.getCurrentQuestion(),
      progress: Math.round((this.state.currentQuestionIndex / this.state.questions.length) * 100)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Complete the interview
  async completeInterview(env: Env): Promise<Response> {
    if (this.state.status !== 'active') {
      return new Response('Interview not active', { status: 400 });
    }
    
    // Generate insights from the interview
    // This would be replaced with actual analysis logic
    const insights = {
      keyPoints: [
        'Demonstrated strong leadership capabilities',
        'Highlighted technical expertise in relevant areas',
        'Showed strategic thinking and business acumen',
        'Emphasized collaborative approach to problem-solving',
        'Articulated clear vision for future growth'
      ],
      strengths: [
        'Communication skills',
        'Technical knowledge',
        'Strategic thinking',
        'Problem-solving approach',
        'Team leadership'
      ],
      recommendations: [
        'Emphasize quantifiable achievements more',
        'Provide more specific examples of leadership challenges',
        'Highlight cross-functional collaboration experiences',
        'Elaborate on technical implementation details when appropriate',
        'Share more about personal growth and learning experiences'
      ]
    };
    
    // Update state
    this.state = {
      ...this.state,
      status: 'completed',
      endTime: Date.now(),
      insights
    };
    
    // Store the completed interview data
    // This would be replaced with actual API call to store the data
    try {
      // Mock API call to store interview data
      console.log('Storing interview data', this.state);
    } catch (error) {
      console.error('Failed to store interview data', error);
      return new Response('Failed to store interview data', { status: 500 });
    }
    
    return new Response(JSON.stringify({
      id: this.state.id,
      status: this.state.status,
      insights: this.state.insights,
      duration: this.state.endTime && this.state.startTime 
        ? Math.round((this.state.endTime - this.state.startTime) / 1000) 
        : 0
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Helper methods
  private getCurrentQuestion(): string | null {
    if (this.state.currentQuestionIndex >= this.state.questions.length) {
      return null;
    }
    return this.state.questions[this.state.currentQuestionIndex];
  }
  
  private getNextQuestion(): string | null {
    if (this.state.currentQuestionIndex + 1 >= this.state.questions.length) {
      return null;
    }
    return this.state.questions[this.state.currentQuestionIndex + 1];
  }
  
  private hasMoreQuestions(): boolean {
    return this.state.currentQuestionIndex < this.state.questions.length - 1;
  }
}
