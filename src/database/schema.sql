# Supabase Schema for NOMORECV Platform

This file contains the SQL schema for setting up the Supabase database tables required for the NOMORECV platform.

## Setup Instructions

1. Create a new Supabase project
2. Navigate to the SQL Editor
3. Copy and paste this entire file into the editor
4. Run the SQL to create all tables and relationships

## Schema

```sql
-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  profile_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  headline TEXT,
  summary TEXT,
  location TEXT,
  website TEXT,
  avatar_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Update users table to reference profiles
ALTER TABLE users ADD CONSTRAINT fk_profile FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE SET NULL;

-- Experiences table
CREATE TABLE IF NOT EXISTS experiences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  location TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  skills TEXT[] DEFAULT '{}',
  achievements TEXT[] DEFAULT '{}',
  verification_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Education table
CREATE TABLE IF NOT EXISTS education (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  institution TEXT NOT NULL,
  degree TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  description TEXT,
  verification_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  url TEXT,
  start_date DATE,
  end_date DATE,
  is_current BOOLEAN DEFAULT FALSE,
  skills TEXT[] DEFAULT '{}',
  outcomes TEXT[] DEFAULT '{}',
  media_urls TEXT[] DEFAULT '{}',
  verification_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Skills table
CREATE TABLE IF NOT EXISTS skills (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  level INTEGER CHECK (level BETWEEN 1 AND 5),
  endorsements INTEGER DEFAULT 0,
  verification_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

-- Traits table
CREATE TABLE IF NOT EXISTS traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  assessment_method TEXT CHECK (assessment_method IN ('self', 'external', 'derived')),
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, name)
);

-- Trait history table for tracking trait evolution
CREATE TABLE IF NOT EXISTS trait_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  score INTEGER CHECK (score BETWEEN 0 AND 100),
  assessment_method TEXT CHECK (assessment_method IN ('self', 'external', 'derived')),
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trait assessor table for storing information about external trait assessments
CREATE TABLE IF NOT EXISTS trait_assessors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trait_name TEXT NOT NULL,
  assessor_name TEXT NOT NULL,
  assessor_relationship TEXT NOT NULL,
  assessor_email TEXT,
  assessment_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Certifications table
CREATE TABLE IF NOT EXISTS certifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  issuer TEXT NOT NULL,
  issue_date DATE NOT NULL,
  expiry_date DATE,
  credential_id TEXT,
  credential_url TEXT,
  verification_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verifications table
CREATE TABLE IF NOT EXISTS verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('experience', 'education', 'project', 'skill', 'certification')),
  verifier_type TEXT NOT NULL CHECK (verifier_type IN ('blockchain', 'third-party', 'reference')),
  verifier_id UUID,
  status TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'rejected')),
  proof_type TEXT NOT NULL CHECK (proof_type IN ('zkp', 'certificate', 'reference')),
  proof_data TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add verification foreign keys
ALTER TABLE experiences ADD CONSTRAINT fk_verification FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE SET NULL;
ALTER TABLE education ADD CONSTRAINT fk_verification FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE SET NULL;
ALTER TABLE projects ADD CONSTRAINT fk_verification FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE SET NULL;
ALTER TABLE skills ADD CONSTRAINT fk_verification FOREIGN KEY (verification_id) REFERENCES verifications(id) ON DELETE SET NULL;

-- Content table
CREATE TABLE IF NOT EXISTS content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('article', 'video', 'image', 'audio', 'interactive')),
  format TEXT NOT NULL,
  url TEXT,
  data JSONB,
  tags TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Distributions table
CREATE TABLE IF NOT EXISTS distributions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES content(id) ON DELETE CASCADE,
  channel_type TEXT NOT NULL CHECK (channel_type IN ('linkedin', 'email', 'website', 'twitter', 'custom')),
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'published', 'failed')),
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  audience JSONB,
  metrics JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews table
CREATE TABLE IF NOT EXISTS interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'in-progress', 'completed')),
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  video_url TEXT,
  transcript_url TEXT,
  insights JSONB,
  content_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outputs table
CREATE TABLE IF NOT EXISTS outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  output_type TEXT NOT NULL CHECK (output_type IN ('cv', 'portfolio', 'pitch', 'custom')),
  format TEXT NOT NULL CHECK (format IN ('web', 'pdf', 'interactive', 'video')),
  context TEXT,
  industry TEXT,
  url TEXT,
  data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policies
-- Note: These are basic policies and should be refined for production

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE experiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE traits ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE content ENABLE ROW LEVEL SECURITY;
ALTER TABLE distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE outputs ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own data" ON users
  FOR SELECT USING (auth.uid() = id);
  
CREATE POLICY "Users can update their own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Profiles policies
CREATE POLICY "Profiles are viewable by owner" ON profiles
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
  FOR SELECT USING (is_public = TRUE);
  
CREATE POLICY "Profiles can be updated by owner" ON profiles
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Profiles can be inserted by owner" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Similar policies for other tables would be created here
-- This is a simplified version for demonstration

-- Create indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
CREATE INDEX idx_experiences_profile_id ON experiences(profile_id);
CREATE INDEX idx_education_profile_id ON education(profile_id);
CREATE INDEX idx_projects_profile_id ON projects(profile_id);
CREATE INDEX idx_skills_profile_id ON skills(profile_id);
CREATE INDEX idx_traits_profile_id ON traits(profile_id);
CREATE INDEX idx_content_profile_id ON content(profile_id);
CREATE INDEX idx_interviews_profile_id ON interviews(profile_id);
CREATE INDEX idx_outputs_profile_id ON outputs(profile_id);
CREATE INDEX idx_distributions_content_id ON distributions(content_id);
CREATE INDEX idx_verifications_entity_id ON verifications(entity_id);
```

## Functions and Triggers

Additional functions and triggers can be added to handle specific business logic, such as:

1. Automatically updating the `updated_at` timestamp when a record is modified
2. Syncing profile data with user data
3. Managing verification status changes
4. Processing interview completions

These would be implemented based on specific business requirements.

## Security Considerations

The schema includes Row Level Security (RLS) policies to ensure data privacy and security. These policies should be refined for production use to handle more complex access patterns, such as:

1. Sharing profiles with specific users or groups
2. Allowing third-party verifiers to access specific records
3. Managing content visibility based on distribution settings
4. Implementing role-based access control

## Next Steps

After implementing this schema:

1. Set up authentication with Supabase Auth
2. Configure storage buckets for media files
3. Implement server-side functions for complex operations
4. Set up real-time subscriptions for collaborative features
