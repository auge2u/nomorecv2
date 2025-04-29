# Component Interface Definitions

This document defines the interfaces for key components in the "Help Them Discover You" platform. These interface definitions establish contracts between different parts of the system, enabling parallel development across teams.

## Frontend Component Interfaces

### CV Management Components

#### CVList Component

```typescript
interface CVListProps {
  // Data
  cvs: CV[];
  isLoading: boolean;
  error?: string;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;
  
  // Filtering
  filters: {
    status?: CVStatus;
    searchTerm?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  };
  
  // Events
  onPageChange: (page: number) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  onCVSelect: (cvId: string) => void;
  onCVDelete: (cvId: string) => void;
  onCVCreate: () => void;
}

interface CVListRef {
  refresh: () => void;
  resetFilters: () => void;
}
```

#### CVUpload Component

```typescript
interface CVUploadProps {
  // Configuration
  allowedFileTypes: string[];
  maxFileSize: number;
  
  // State
  isUploading: boolean;
  progress?: number;
  error?: string;
  
  // Events
  onUploadStart: () => void;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: (result: ParseCVResponse) => void;
  onUploadError: (error: string) => void;
  onCancel: () => void;
}

interface ParseCVResponse {
  parsedContent: CVContent;
  confidence: number;
  warnings: string[];
}
```

#### CVDetail Component

```typescript
interface CVDetailProps {
  // Data
  cv: CV;
  versions?: CVVersion[];
  isLoading: boolean;
  error?: string;
  
  // View options
  editMode: boolean;
  compareMode: boolean;
  compareVersionId?: string;
  
  // Access control
  canEdit: boolean;
  canShare: boolean;
  canDelete: boolean;
  
  // Events
  onEdit: (updatedCV: Partial<CV>) => void;
  onVersionCreate: () => void;
  onVersionSelect: (versionId: string) => void;
  onVersionCompare: (versionId: string) => void;
  onShare: () => void;
  onDelete: () => void;
  onBack: () => void;
}
```

#### CVShare Component

```typescript
interface CVShareProps {
  // Data
  cv: CV;
  existingShares: CVShare[];
  
  // State
  isCreatingShare: boolean;
  error?: string;
  
  // Events
  onShareCreate: (shareOptions: Omit<CVShare, 'id' | 'cvId' | 'sharedBy' | 'createdAt' | 'viewCount' | 'lastViewedAt'>) => void;
  onShareDelete: (shareId: string) => void;
  onShareCopy: (shareUrl: string) => void;
  onClose: () => void;
}
```

### Template System Components

#### TemplateList Component

```typescript
interface TemplateListProps {
  // Data
  templates: CVTemplate[];
  isLoading: boolean;
  error?: string;
  
  // Pagination
  totalCount: number;
  currentPage: number;
  pageSize: number;
  
  // Filtering
  filters: {
    category?: TemplateCategory;
    searchTerm?: string;
    isPublic?: boolean;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  };
  
  // Display options
  viewMode: 'grid' | 'list';
  
  // Events
  onPageChange: (page: number) => void;
  onFilterChange: (filters: Record<string, any>) => void;
  onTemplateSelect: (templateId: string) => void;
  onTemplateDelete: (templateId: string) => void;
  onTemplateCreate: () => void;
}
```

#### TemplateEditor Component

```typescript
interface TemplateEditorProps {
  // Data
  template?: CVTemplate;
  isLoading: boolean;
  error?: string;
  
  // Options
  mode: 'create' | 'edit';
  previewCVId?: string;
  
  // Events
  onSave: (template: Partial<CVTemplate>) => void;
  onPreviewCV: (cvId: string) => void;
  onCancel: () => void;
}

interface TemplateEditorRef {
  addSection: (sectionType: string) => void;
  removeSection: (sectionId: string) => void;
  moveSectionUp: (sectionId: string) => void;
  moveSectionDown: (sectionId: string) => void;
  setPreviewCV: (cvId: string) => void;
}
```

#### TemplateRenderer Component

```typescript
interface TemplateRendererProps {
  // Data
  template: CVTemplate;
  cv: CV;
  customizations?: ShareCustomization;
  
  // Options
  format: 'html' | 'pdf' | 'preview';
  scale?: number;
  
  // Events
  onRenderComplete: (result: {
    renderedContent: string;
    downloadUrl?: string;
  }) => void;
  onRenderError: (error: string) => void;
}
```

### Visualization Components

#### SkillsRadarChart Component

```typescript
interface SkillsRadarChartProps {
  // Data
  skills: Skill[];
  categoryGroups?: Record<string, string[]>;
  
  // Configuration
  maxValue: number;
  size: {
    width: number;
    height: number;
  };
  colors: {
    primary: string;
    secondary: string;
    background: string;
    grid: string;
    text: string;
  };
  
  // Events
  onSkillSelect?: (skillId: string) => void;
}
```

#### CareerTimeline Component

```typescript
interface CareerTimelineProps {
  // Data
  experiences: Experience[];
  education?: Education[];
  certifications?: Certification[];
  projects?: Project[];
  
  // Configuration
  startYear?: number;
  endYear?: number;
  showEducation: boolean;
  showCertifications: boolean;
  showProjects: boolean;
  highlightSkills?: string[];
  
  // Appearance
  orientation: 'horizontal' | 'vertical';
  colors: {
    experience: string;
    education: string;
    certification: string;
    project: string;
    timeline: string;
    highlight: string;
  };
  
  // Events
  onItemSelect: (itemType: 'experience' | 'education' | 'certification' | 'project', itemId: string) => void;
}
```

#### SkillGrowthChart Component

```typescript
interface SkillGrowthChartProps {
  // Data
  skillGrowth: SkillGrowth[];
  
  // Configuration
  timeframe: 'last-year' | 'last-3-years' | 'last-5-years' | 'all-time';
  maxSkills: number;
  
  // Appearance
  size: {
    width: number;
    height: number;
  };
  colors: string[];
  
  // Events
  onSkillSelect?: (skillName: string) => void;
  onTimeframeChange?: (timeframe: string) => void;
}
```

### Authentication Components

#### AuthForm Component

```typescript
interface AuthFormProps {
  // Configuration
  mode: 'login' | 'register' | 'reset-password';
  
  // State
  isLoading: boolean;
  error?: string;
  
  // Social auth options
  enabledProviders: AuthProvider[];
  
  // Events
  onLogin: (credentials: { email: string; password: string }) => void;
  onRegister: (userData: { email: string; password: string; fullName: string; inviteCode?: string }) => void;
  onResetPassword: (email: string) => void;
  onSocialAuth: (provider: AuthProvider) => void;
  onModeChange: (mode: 'login' | 'register' | 'reset-password') => void;
}
```

#### UserProfile Component

```typescript
interface UserProfileProps {
  // Data
  user: User;
  isLoading: boolean;
  error?: string;
  
  // View options
  editMode: boolean;
  
  // Events
  onUpdate: (updates: Partial<User>) => void;
  onPasswordChange: (currentPassword: string, newPassword: string) => void;
  onAvatarChange: (file: File) => void;
  onToggleEditMode: () => void;
}
```

## Data Processing Component Interfaces

### Parser Interfaces

#### DocumentParser Interface

```typescript
interface DocumentParser {
  // Methods
  parseDocument(file: File, options?: ParseOptions): Promise<ParseResult>;
  getFileTypes(): string[];
  getConfidence(): number;
  
  // Events
  onParseProgress?: (progress: number) => void;
}

interface ParseOptions {
  extractStructure: boolean;
  confidenceThreshold?: number;
  recognizeEntities?: boolean;
  language?: string;
}

interface ParseResult {
  content: CVContent;
  confidence: number;
  warnings: string[];
  rawText?: string;
  metadata: {
    fileType: string;
    fileSize: number;
    pageCount?: number;
    parserVersion: string;
    parsingTime: number;
  };
}
```

#### EntityExtractor Interface

```typescript
interface EntityExtractor {
  // Methods
  extractEntities(text: string, options?: ExtractorOptions): Promise<ExtractorResult>;
  getSupportedEntityTypes(): string[];
  
  // Events
  onExtractProgress?: (progress: number) => void;
}

interface ExtractorOptions {
  entityTypes?: string[];
  confidenceThreshold?: number;
  language?: string;
  context?: Record<string, any>;
}

interface ExtractorResult {
  entities: {
    type: string;
    text: string;
    position: {
      start: number;
      end: number;
    };
    confidence: number;
    metadata?: Record<string, any>;
  }[];
  stats: {
    totalEntities: number;
    entitiesByType: Record<string, number>;
    processingTime: number;
  };
}
```

#### DataNormalizer Interface

```typescript
interface DataNormalizer {
  // Methods
  normalizeData<T>(data: T, schema: NormalizationSchema<T>): Promise<T>;
  validateData<T>(data: T, schema: NormalizationSchema<T>): Promise<ValidationResult>;
  
  // Events
  onNormalizeProgress?: (progress: number) => void;
}

interface NormalizationSchema<T> {
  fields: {
    [K in keyof T]?: {
      type: string;
      required?: boolean;
      format?: string;
      enum?: any[];
      default?: any;
      transform?: (value: any) => any;
    };
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: {
    field: string;
    message: string;
    code: string;
  }[];
  warnings: {
    field: string;
    message: string;
    code: string;
  }[];
}
```

### Integration Interfaces

#### DataSourceConnector Interface

```typescript
interface DataSourceConnector<T> {
  // Methods
  connect(credentials: any): Promise<ConnectionResult>;
  disconnect(): Promise<void>;
  fetchData(options?: FetchOptions): Promise<T[]>;
  isConnected(): boolean;
  getConnectionInfo(): ConnectionInfo;
  
  // Events
  onConnectionChange?: (connected: boolean) => void;
  onFetchProgress?: (progress: number) => void;
}

interface ConnectionResult {
  success: boolean;
  connectionId?: string;
  error?: string;
}

interface ConnectionInfo {
  sourceType: DataSource;
  connected: boolean;
  connectedSince?: Date;
  expiresAt?: Date;
  scopes: string[];
  lastSync?: Date;
}

interface FetchOptions {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
  fields?: string[];
  sort?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}
```

#### DataTransformer Interface

```typescript
interface DataTransformer<TSource, TTarget> {
  // Methods
  transform(sourceData: TSource, mapping: DataMapping[]): Promise<TTarget>;
  getMappingSchema(): MappingSchema;
  
  // Events
  onTransformProgress?: (progress: number) => void;
}

interface MappingSchema {
  sourceFields: {
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }[];
  targetFields: {
    name: string;
    type: string;
    description: string;
    required?: boolean;
  }[];
  suggestedMappings: {
    sourceField: string;
    targetField: string;
    confidence: number;
  }[];
}
```

## Service Component Interfaces

### Authentication Service Interface

```typescript
interface AuthenticationService {
  // User authentication
  login(email: string, password: string): Promise<AuthResult>;
  register(userData: { email: string; password: string; fullName: string; inviteCode?: string }): Promise<AuthResult>;
  loginWithProvider(provider: AuthProvider): Promise<AuthResult>;
  logout(): Promise<void>;
  refreshToken(): Promise<TokenResult>;
  
  // Password management
  resetPassword(email: string): Promise<void>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  changePassword(currentPassword: string, newPassword: string): Promise<void>;
  
  // Session management
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
  getToken(): string | null;
  
  // Events
  onAuthStateChanged?: (user: User | null) => void;
}

interface AuthResult {
  user: User;
  token: string;
  expiresAt: Date;
}

interface TokenResult {
  token: string;
  expiresAt: Date;
}
```

### Storage Service Interface

```typescript
interface StorageService {
  // File operations
  uploadFile(file: File, path: string, options?: UploadOptions): Promise<UploadResult>;
  downloadFile(path: string): Promise<Blob>;
  deleteFile(path: string): Promise<void>;
  getFileUrl(path: string, options?: UrlOptions): Promise<string>;
  
  // Folder operations
  listFiles(folderPath: string): Promise<FileInfo[]>;
  createFolder(folderPath: string): Promise<void>;
  deleteFolder(folderPath: string): Promise<void>;
  
  // Events
  onUploadProgress?: (path: string, progress: number) => void;
}

interface UploadOptions {
  contentType?: string;
  isPublic?: boolean;
  metadata?: Record<string, string>;
  overwrite?: boolean;
}

interface UrlOptions {
  expiresIn?: number;
  download?: boolean;
  filename?: string;
}

interface UploadResult {
  path: string;
  url: string;
  size: number;
  contentType: string;
  metadata: Record<string, string>;
}

interface FileInfo {
  path: string;
  name: string;
  size: number;
  contentType: string;
  isFolder: boolean;
  createdAt: Date;
  updatedAt: Date;
  url?: string;
}
```

### Analytics Service Interface

```typescript
interface AnalyticsService {
  // User analytics
  getUserAnalytics(userId: string, options?: AnalyticsOptions): Promise<UserAnalytics>;
  getCVAnalytics(cvId: string, options?: AnalyticsOptions): Promise<CVAnalytics>;
  
  // Event tracking
  trackEvent(eventName: string, properties?: Record<string, any>): Promise<void>;
  trackPageView(page: string, properties?: Record<string, any>): Promise<void>;
  
  // Data access
  getPopularSkills(limit?: number): Promise<{name: string; count: number}[]>;
  getPopularTemplates(limit?: number): Promise<{id: string; name: string; usage: number}[]>;
  
  // Events
  onAnalyticsReady?: () => void;
}

interface AnalyticsOptions {
  period?: TimePeriod;
  startDate?: Date;
  endDate?: Date;
  filters?: Record<string, any>;
}
```

### Notification Service Interface

```typescript
interface NotificationService {
  // Notification management
  getNotifications(options?: NotificationOptions): Promise<Notification[]>;
  markAsRead(notificationId: string): Promise<void>;
  markAllAsRead(): Promise<void>;
  deleteNotification(notificationId: string): Promise<void>;
  
  // Subscription management
  subscribe(topic: string): Promise<void>;
  unsubscribe(topic: string): Promise<void>;
  
  // Sending notifications
  sendNotification(userId: string, notification: NotificationPayload): Promise<string>;
  
  // Events
  onNewNotification?: (notification: Notification) => void;
}

interface NotificationOptions {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
  sortDirection?: 'asc' | 'desc';
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: Date;
}

interface NotificationPayload {
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: Record<string, any>;
  priority?: 'low' | 'normal' | 'high';
}
```

## Conclusion

These component interface definitions provide a comprehensive foundation for cross-stream integration in the "Help Them Discover You" platform. By adhering to these interfaces, different teams can develop components in parallel with confidence that they will integrate properly.

The interfaces defined in this document establish clear contracts between:

1. Frontend components and their consumers
2. Data processing services and their clients 
3. Backend services and their consumers

These interface definitions should be treated as living documents and updated as the system evolves. Each update should be communicated to all affected teams to ensure continued integration success.