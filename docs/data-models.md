# Core Data Models

This document defines the core data models for the "Help Them Discover You" platform. These TypeScript interfaces will serve as the foundation for database schema design, API contracts, and frontend component interfaces.

## CV Management Data Models

```typescript
/**
 * Represents the status of a CV in the system
 */
export type CVStatus = 'draft' | 'active' | 'archived';

/**
 * Represents the source of data in the system
 */
export type DataSource = 
  | 'CV' 
  | 'CoverLetter' 
  | 'LinkedIn' 
  | 'GitHub' 
  | 'Publication' 
  | 'Interview' 
  | 'SocialMedia'
  | 'PortfolioWebsite'
  | 'UserInput';

/**
 * Confidence level for extracted or inferred data
 */
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'verified';

/**
 * Skill proficiency levels
 */
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Core CV entity representing a user's resume
 */
export interface CV {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  status: CVStatus;
  filePath?: string | null;
  fileType?: string | null;
  meta: CVMetadata;
  content: CVContent;
  createdAt: string;
  updatedAt: string;
  versionCount: number;
  currentVersionId: string;
}

/**
 * Metadata associated with a CV
 */
export interface CVMetadata {
  tags: string[];
  language: string;
  isPublic: boolean;
  completionScore: number;
  lastParsed: string | null;
  parserVersion: string | null;
}

/**
 * The structured content of a CV
 */
export interface CVContent {
  personalInfo: PersonalInfo;
  summary?: string | null;
  skills: Skill[];
  experiences: Experience[];
  education: Education[];
  certifications: Certification[];
  projects: Project[];
  publications: Publication[];
  languages: Language[];
  interests: Interest[];
  references: Reference[];
  customSections: CustomSection[];
}

/**
 * Personal information of the CV owner
 */
export interface PersonalInfo {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  location?: Location | null;
  profileImage?: string | null;
  websites: Website[];
  socialProfiles: SocialProfile[];
}

/**
 * Location information
 */
export interface Location {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  postalCode?: string | null;
  isRemoteOnly?: boolean;
  relocationPreferences?: string[] | null;
}

/**
 * Website information
 */
export interface Website {
  url: string;
  title?: string | null;
  type?: 'personal' | 'portfolio' | 'company' | 'blog' | 'other';
}

/**
 * Social media profile
 */
export interface SocialProfile {
  platform: string;
  url: string;
  username?: string | null;
}

/**
 * Skill representation with metadata
 */
export interface Skill {
  id: string;
  name: string;
  category?: string | null;
  proficiency?: ProficiencyLevel | null;
  yearsOfExperience?: number | null;
  lastUsed?: string | null;
  endorsements?: Endorsement[];
  source: DataSourceInfo;
}

/**
 * Work experience
 */
export interface Experience {
  id: string;
  title: string;
  companyName: string;
  location?: Location | null;
  description?: string | null;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  highlights: string[];
  skills: string[];
  achievements: Achievement[];
  source: DataSourceInfo;
}

/**
 * Educational background
 */
export interface Education {
  id: string;
  institution: string;
  degree?: string | null;
  fieldOfStudy?: string | null;
  location?: Location | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  gpa?: string | null;
  description?: string | null;
  achievements: string[];
  courses: string[];
  source: DataSourceInfo;
}

/**
 * Professional certification
 */
export interface Certification {
  id: string;
  name: string;
  issuingOrganization: string;
  issueDate?: string | null;
  expirationDate?: string | null;
  credentialId?: string | null;
  credentialUrl?: string | null;
  description?: string | null;
  source: DataSourceInfo;
}

/**
 * Project work
 */
export interface Project {
  id: string;
  name: string;
  description?: string | null;
  url?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent: boolean;
  highlights: string[];
  skills: string[];
  roles: string[];
  teamSize?: number | null;
  source: DataSourceInfo;
}

/**
 * Published work
 */
export interface Publication {
  id: string;
  title: string;
  publisher?: string | null;
  date?: string | null;
  url?: string | null;
  description?: string | null;
  authors: string[];
  source: DataSourceInfo;
}

/**
 * Language proficiency
 */
export interface Language {
  id: string;
  name: string;
  proficiency?: 'elementary' | 'limited_working' | 'professional_working' | 'full_professional' | 'native' | null;
  source: DataSourceInfo;
}

/**
 * Personal interest
 */
export interface Interest {
  id: string;
  name: string;
  description?: string | null;
  source: DataSourceInfo;
}

/**
 * Professional reference
 */
export interface Reference {
  id: string;
  name: string;
  company?: string | null;
  position?: string | null;
  relationship?: string | null;
  email?: string | null;
  phone?: string | null;
  recommendation?: string | null;
  isPermissionGranted: boolean;
  source: DataSourceInfo;
}

/**
 * Custom CV section
 */
export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
  source: DataSourceInfo;
}

/**
 * Custom section content
 */
export interface CustomSectionItem {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  date?: string | null;
  description?: string | null;
  bullets: string[];
}

/**
 * Achievement with metrics
 */
export interface Achievement {
  id: string;
  title: string;
  description?: string | null;
  date?: string | null;
  metrics?: Metric[];
  source: DataSourceInfo;
}

/**
 * Quantifiable metric
 */
export interface Metric {
  value: string;
  unit?: string | null;
  context?: string | null;
}

/**
 * Endorsement from another user
 */
export interface Endorsement {
  id: string;
  userId: string;
  userName: string;
  relationship?: string | null;
  comment?: string | null;
  createdAt: string;
}

/**
 * Information about the source of data
 */
export interface DataSourceInfo {
  type: DataSource;
  sourceId?: string | null;
  timestamp: string;
  confidence: ConfidenceLevel;
  metadata?: Record<string, any> | null;
}

/**
 * Version control for CVs
 */
export interface CVVersion {
  id: string;
  cvId: string;
  versionNumber: number;
  title: string;
  description?: string | null;
  filePath?: string | null;
  fileType?: string | null;
  content: CVContent;
  createdAt: string;
  createdBy: string;
  changes?: VersionChange[];
}

/**
 * Changes between CV versions
 */
export interface VersionChange {
  fieldPath: string;
  previousValue: any;
  newValue: any;
  changeType: 'addition' | 'modification' | 'removal';
}

/**
 * Sharing configuration for CVs
 */
export interface CVShare {
  id: string;
  cvId: string;
  sharedBy: string;
  sharedWith?: string | null;
  accessToken?: string | null;
  accessType: 'view' | 'edit' | 'comment';
  customizations?: ShareCustomization | null;
  createdAt: string;
  expiresAt?: string | null;
  viewCount: number;
  lastViewedAt?: string | null;
}

/**
 * Customizations for shared CV views
 */
export interface ShareCustomization {
  visibleSections: string[];
  appliedTemplateId?: string | null;
  customCss?: string | null;
  customHeader?: string | null;
  customFooter?: string | null;
  customMessage?: string | null;
}

/**
 * Analytics for CV interactions
 */
export interface CVAnalytics {
  cvId: string;
  views: ViewEvent[];
  downloads: DownloadEvent[];
  applicationUses: ApplicationEvent[];
  feedback: FeedbackEvent[];
}

/**
 * View event analytics
 */
export interface ViewEvent {
  id: string;
  shareId?: string | null;
  viewerIp?: string | null;
  timestamp: string;
  duration?: number | null;
  device?: string | null;
  location?: string | null;
}

/**
 * Download event analytics
 */
export interface DownloadEvent {
  id: string;
  shareId?: string | null;
  format: 'pdf' | 'docx' | 'txt' | 'json';
  timestamp: string;
  device?: string | null;
  location?: string | null;
}

/**
 * Application usage event
 */
export interface ApplicationEvent {
  id: string;
  platform: string;
  jobTitle?: string | null;
  company?: string | null;
  timestamp: string;
  result?: 'pending' | 'interview' | 'rejected' | 'offer' | 'unknown';
}

/**
 * Feedback from viewers
 */
export interface FeedbackEvent {
  id: string;
  shareId?: string | null;
  rating?: number | null;
  comments?: string | null;
  timestamp: string;
  fromUser?: string | null;
}
```

## Template System Data Models

```typescript
/**
 * Template categories
 */
export type TemplateCategory = 
  | 'general' 
  | 'technical' 
  | 'academic' 
  | 'creative' 
  | 'executive'
  | 'minimal'
  | 'modern'
  | 'professional'
  | 'industry-specific';

/**
 * Template component types
 */
export type TemplateComponentType = 
  | 'text' 
  | 'list' 
  | 'image' 
  | 'chart' 
  | 'table'
  | 'timeline' 
  | 'graph' 
  | 'container';

/**
 * CV template definition
 */
export interface CVTemplate {
  id: string;
  userId?: string | null; // Null for system templates
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  category: TemplateCategory;
  tags: string[];
  isPublic: boolean;
  popularity: number;
  layout: TemplateLayout;
  styling: TemplateStyling;
  sections: TemplateSection[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Template layout configuration
 */
export interface TemplateLayout {
  type: 'single-column' | 'two-column' | 'three-column' | 'custom';
  config: Record<string, any>;
}

/**
 * Template styling configuration
 */
export interface TemplateStyling {
  fonts: FontConfiguration;
  colors: ColorConfiguration;
  spacing: SpacingConfiguration;
  customCss?: string | null;
}

/**
 * Font configuration
 */
export interface FontConfiguration {
  heading: string;
  body: string;
  sizes: {
    h1: string;
    h2: string;
    h3: string;
    body: string;
    small: string;
  };
}

/**
 * Color configuration
 */
export interface ColorConfiguration {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headings: string;
}

/**
 * Spacing configuration
 */
export interface SpacingConfiguration {
  sectionGap: string;
  itemGap: string;
  padding: string;
  margins: string;
}

/**
 * Template section definition
 */
export interface TemplateSection {
  id: string;
  templateId: string;
  title: string;
  type: string;
  orderIndex: number;
  isRequired: boolean;
  isVisible: boolean;
  sourceData: string; // Path to data in CV model
  components: TemplateComponent[];
  layout?: Record<string, any> | null;
  styling?: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template component definition
 */
export interface TemplateComponent {
  id: string;
  type: TemplateComponentType;
  config: Record<string, any>;
  content?: string | null;
  dataMapping?: Record<string, string> | null;
  conditions?: ComponentCondition[] | null;
  styling?: Record<string, any> | null;
}

/**
 * Conditional display for components
 */
export interface ComponentCondition {
  field: string;
  operator: 'equals' | 'notEquals' | 'contains' | 'greaterThan' | 'lessThan' | 'exists' | 'notExists';
  value?: any;
}

/**
 * Template variable for dynamic content
 */
export interface TemplateVariable {
  name: string;
  defaultValue?: any;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string | null;
}

/**
 * Template sharing configuration
 */
export interface TemplateShare {
  id: string;
  templateId: string;
  sharedBy: string;
  sharedWith?: string | null;
  accessType: 'view' | 'edit' | 'use';
  createdAt: string;
  expiresAt?: string | null;
}
```

## User and Authentication Data Models

```typescript
/**
 * User role types
 */
export type UserRole = 'user' | 'admin' | 'premium' | 'enterprise';

/**
 * Authentication provider types
 */
export type AuthProvider = 
  | 'email' 
  | 'google' 
  | 'github' 
  | 'linkedin' 
  | 'microsoft'
  | 'apple';

/**
 * User subscription status
 */
export type SubscriptionStatus = 
  | 'free' 
  | 'trial' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'expired';

/**
 * User profile
 */
export interface User {
  id: string;
  email: string;
  fullName: string;
  displayName?: string | null;
  avatar?: string | null;
  roles: UserRole[];
  emailVerified: boolean;
  phoneNumber?: string | null;
  phoneVerified: boolean;
  authProviders: AuthProviderInfo[];
  subscription?: SubscriptionInfo | null;
  preferences: UserPreferences;
  meta: UserMetadata;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

/**
 * Authentication provider information
 */
export interface AuthProviderInfo {
  provider: AuthProvider;
  providerId: string;
  createdAt: string;
  lastLoginAt?: string | null;
}

/**
 * User subscription information
 */
export interface SubscriptionInfo {
  plan: string;
  status: SubscriptionStatus;
  startedAt: string;
  currentPeriodEnd: string;
  canceledAt?: string | null;
  features: string[];
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  defaultTemplate?: string | null;
}

/**
 * Notification preferences
 */
export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  profileViews: boolean;
  applicationUpdates: boolean;
  newFeatures: boolean;
  marketing: boolean;
}

/**
 * Privacy preferences
 */
export interface PrivacyPreferences {
  profileDiscoverable: boolean;
  shareAnonymizedData: boolean;
  allowAnalytics: boolean;
  allowRecommendations: boolean;
}

/**
 * Additional user metadata
 */
export interface UserMetadata {
  cvCount: number;
  templateCount: number;
  applicationCount: number;
  lastActivity?: string | null;
  usageMetrics: Record<string, number>;
  tags: string[];
}

/**
 * Session information
 */
export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  lastActiveAt: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  deviceInfo?: Record<string, any> | null;
  isValid: boolean;
}

/**
 * Permission definition
 */
export interface Permission {
  id: string;
  name: string;
  description: string;
  resource: string;
  action: 'create' | 'read' | 'update' | 'delete' | 'manage';
  conditions?: Record<string, any> | null;
}

/**
 * Role definition with permissions
 */
export interface Role {
  id: string;
  name: UserRole;
  description: string;
  permissions: string[]; // Permission IDs
  createdAt: string;
  updatedAt: string;
}
```

## Integration Data Models

```typescript
/**
 * Integration type
 */
export type IntegrationType = 
  | 'linkedin' 
  | 'github' 
  | 'stackoverflow' 
  | 'medium'
  | 'behance'
  | 'dribbble'
  | 'figma'
  | 'custom';

/**
 * Integration status
 */
export type IntegrationStatus = 
  | 'connected' 
  | 'disconnected' 
  | 'expired' 
  | 'failed' 
  | 'pending';

/**
 * Integration definition
 */
export interface Integration {
  id: string;
  userId: string;
  type: IntegrationType;
  name: string;
  status: IntegrationStatus;
  credentials?: Record<string, any> | null; // Encrypted
  scopes: string[];
  lastSyncAt?: string | null;
  expiresAt?: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * Synchronization job
 */
export interface SyncJob {
  id: string;
  integrationId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: string | null;
  completedAt?: string | null;
  error?: string | null;
  stats: SyncStats;
  createdAt: string;
}

/**
 * Synchronization statistics
 */
export interface SyncStats {
  totalItems: number;
  newItems: number;
  updatedItems: number;
  failedItems: number;
  itemsByType: Record<string, number>;
}

/**
 * External data mapping
 */
export interface DataMapping {
  id: string;
  integrationId: string;
  sourceType: string;
  sourceField: string;
  targetType: string;
  targetField: string;
  transformations: Transformation[];
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data transformation
 */
export interface Transformation {
  type: 'replace' | 'format' | 'extract' | 'combine' | 'split' | 'custom';
  config: Record<string, any>;
}

/**
 * Webhook configuration
 */
export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: string[];
  isActive: boolean;
  secret?: string | null;
  createdAt: string;
  updatedAt: string;
  lastTriggeredAt?: string | null;
  responseStats: {
    success: number;
    failure: number;
    avgResponseTime: number;
  };
}
```

## Analytics Data Models

```typescript
/**
 * Analytics time period
 */
export type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year' | 'all_time' | 'custom';

/**
 * User analytics
 */
export interface UserAnalytics {
  userId: string;
  profileViews: number;
  cvViews: number;
  cvDownloads: number;
  applicationCount: number;
  interviewRate: number;
  offerRate: number;
  skillGrowth: SkillGrowth[];
  careerProgress: CareerProgress;
  viewsBySource: Record<string, number>;
  viewsByLocation: Record<string, number>;
  interactionsByTime: TimeSeriesData[];
  lastUpdated: string;
}

/**
 * Skill growth analytics
 */
export interface SkillGrowth {
  skillName: string;
  initialLevel: ProficiencyLevel;
  currentLevel: ProficiencyLevel;
  growthPercentage: number;
  lastUsed: string;
  usageFrequency: number;
  relatedExperiences: string[];
}

/**
 * Career progress analytics
 */
export interface CareerProgress {
  currentRole?: string | null;
  targetRole?: string | null;
  progressPercentage: number;
  missingSkills: string[];
  recommendedActions: string[];
  industryBenchmark?: IndustryBenchmark | null;
}

/**
 * Industry benchmark comparison
 */
export interface IndustryBenchmark {
  role: string;
  industry: string;
  skillMatch: number;
  experiencePercentile: number;
  salaryRange: {
    min: number;
    median: number;
    max: number;
  };
  topSkills: string[];
}

/**
 * Time series data point
 */
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string | null;
}

/**
 * System-wide analytics
 */
export interface SystemAnalytics {
  activeUsers: Record<TimePeriod, number>;
  newUsers: Record<TimePeriod, number>;
  totalCVs: number;
  avgCVsPerUser: number;
  avgTemplatesPerUser: number;
  popularSkills: {
    name: string;
    count: number;
  }[];
  popularTemplates: {
    id: string;
    name: string;
    usage: number;
  }[];
  userRetention: Record<string, number>;
  averageSessionDuration: number;
}
```

These data models provide a comprehensive foundation for the "Help Them Discover You" platform, covering all aspects of CV management, template systems, user authentication, integration capabilities, and analytics. These models will guide the development of database schemas, API contracts, and frontend component interfaces.