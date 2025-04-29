# Security Framework and Authentication Flow

This document defines the security framework and authentication flow for the "Help Them Discover You" platform, establishing standards for protecting user data, ensuring secure access, and maintaining compliance with relevant regulations.

## 1. Authentication Framework

### 1.1 Authentication Methods

#### Email/Password Authentication

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │      │             │
│    User     │─────▶│  Frontend   │─────▶│   Auth API  │─────▶│  Supabase   │
│             │      │             │      │             │      │   Auth      │
│             │◀─────│             │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
       │                                                              │
       │                 ┌─────────────┐                              │
       │                 │             │                              │
       └────────────────▶│ Application │◀─────────────────────────────┘
                         │             │
                         └─────────────┘
```

1. User enters email and password on login form
2. Frontend submits credentials to Auth API
3. Auth API validates credentials with Supabase Auth
4. On successful validation:
   - JWT token generated with appropriate claims
   - Refresh token generated and stored securely
   - User profile information retrieved
5. Auth response (tokens + user profile) returned to frontend
6. Frontend stores tokens securely:
   - Access token stored in memory
   - Refresh token stored in HTTP-only cookie
7. User redirected to application

#### OAuth Authentication (Social Login)

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │      │  External   │
│    User     │─────▶│  Frontend   │─────▶│   Auth API  │─────▶│   OAuth     │
│             │      │             │      │             │      │  Provider   │
│             │◀─────│             │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
       │                                        │                     │
       │                                        │                     │
       │                                        ▼                     │
       │                                  ┌─────────────┐             │
       │                                  │             │             │
       │                                  │  Supabase   │◀────────────┘
       │                                  │   Auth      │
       │                                  │             │
       │                                  └──────┬──────┘
       │                                         │
       │                 ┌─────────────┐         │
       │                 │             │         │
       └────────────────▶│ Application │◀────────┘
                         │             │
                         └─────────────┘
```

1. User selects OAuth provider (Google, GitHub, LinkedIn, etc.)
2. Auth API initiates OAuth flow with provider
3. User authenticates with provider and grants permissions
4. Provider redirects back to Auth API with authorization code
5. Auth API exchanges code for access/refresh tokens with provider
6. Auth API creates or updates user account with Supabase Auth
7. JWT and refresh tokens generated for application
8. User redirected to application with tokens

### 1.2 Token Management

#### Token Structure and Claims

**Access Token (JWT)**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": ["user"],
  "permissions": ["cv:read", "cv:write"],
  "session_id": "session-uuid",
  "iat": 1645520000,
  "exp": 1645523600,
  "aud": "help-them-discover-you-api"
}
```

**Refresh Token**

- Longer-lived token for obtaining new access tokens
- Stored securely in HTTP-only, secure, SameSite=strict cookie
- Associated with specific device/session
- Can be revoked individually without affecting other sessions

#### Token Lifecycle

1. **Access Token**
   - Short lifespan (1 hour)
   - Used for authenticating API requests
   - Verified on each request
   - Not stored server-side (stateless)

2. **Refresh Token**
   - Longer lifespan (14 days)
   - Used only to obtain new access tokens
   - Rotated on each use (one-time use)
   - Tracked server-side for revocation

3. **Token Refresh Flow**

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │
│  Frontend   │─────▶│   Auth API  │─────▶│  Supabase   │
│             │      │             │      │   Auth      │
│             │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘
```

- When access token expires, frontend sends refresh token to Auth API
- Auth API validates refresh token with Supabase Auth
- If valid, refresh token is invalidated and a new pair (access + refresh) is generated
- New token pair returned to frontend

### 1.3 Multi-Factor Authentication (MFA)

#### MFA Flow

```
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │
│    User     │─────▶│  Frontend   │─────▶│   Auth API  │
│             │      │             │      │             │
│             │◀─────│             │◀─────│             │
└─────────────┘      └─────────────┘      └─────────────┘
       │                                        │
       │                                        ▼
       │                                  ┌─────────────┐
       │                                  │             │
       │                                  │  Supabase   │
       │                                  │   Auth      │
       │                                  │             │
       │                                  └─────────────┘
       │                                        │
       │                                        ▼
       │                                  ┌─────────────┐
       │                                  │             │
       │                                  │   MFA       │
       │                                  │  Provider   │
       │                                  │             │
       └─────────────────────────────────▶└─────────────┘
```

1. User completes primary authentication (password/OAuth)
2. System checks if MFA is enabled for user
3. If enabled, MFA challenge is generated and sent to user
4. User provides MFA code through frontend
5. Code is verified with MFA provider
6. On successful verification, full authentication completes
7. Tokens are issued with extended privileges

#### MFA Options

1. **Authenticator App (TOTP)**
   - Time-based one-time passwords via apps like Google Authenticator
   - Setup process generates QR code for user to scan
   - 6-digit codes with 30-second validity

2. **SMS Verification**
   - One-time codes sent via SMS
   - Phone number verification required during setup
   - 6-digit codes with 10-minute validity

3. **Email Verification**
   - One-time codes sent via email
   - 6-digit codes with 10-minute validity

### 1.4 Session Management

#### Session Properties

- Unique session ID for each login
- Device information (user agent, IP, etc.)
- Creation and last activity timestamps
- Revocation capability
- Inactivity timeout (30 minutes)
- Absolute timeout (14 days)

#### Session Tracking

1. Sessions tracked in database for visibility and control
2. Users can view and terminate active sessions
3. Administrators can force-terminate sessions when necessary
4. Automatic session termination on suspicious activity
5. Concurrent session limits based on user role

## 2. Authorization Framework

### 2.1 Role-Based Access Control (RBAC)

#### Core Roles

1. **Anonymous**
   - Access to public pages and shared CVs (with valid token)
   - Registration and login

2. **User**
   - Manage own CVs and profile
   - Create and manage templates
   - Share CVs with others
   - View analytics for own CVs

3. **Premium User**
   - All User capabilities
   - Advanced analytics
   - Priority parsing
   - Enhanced template features
   - Integration with more external data sources

4. **Admin**
   - User and content management
   - System configuration
   - Analytics dashboard
   - Template management
   - Support tools

#### Role Assignment

1. Default role assignment during registration (User)
2. Role elevation through subscription purchase (Premium)
3. Admin role assigned manually by existing administrators
4. Role information encoded in authentication tokens
5. Role verification on protected endpoints

### 2.2 Permission Model

#### Permission Structure

Permissions follow the format: `resource:action`

Examples:

- `cv:read` - Can read CV data
- `cv:write` - Can create/update CV data
- `cv:delete` - Can delete CVs
- `template:read` - Can read templates
- `template:write` - Can create/update templates
- `template:delete` - Can delete templates
- `analytics:read` - Can access analytics data
- `user:admin` - Can administer users

#### Permission Assignments

| Role         | Permissions                                                       |
|--------------|-------------------------------------------------------------------|
| Anonymous    | `public:read`                                                      |
| User         | `cv:read`, `cv:write`, `cv:delete`, `cv:share`, `template:read`, `template:write`, `template:delete`, `profile:read`, `profile:write`, `analytics:basic`  |
| Premium User | All User permissions + `analytics:advanced`, `integration:full`, `template:advanced` |
| Admin        | All permissions                                                    |

### 2.3 Access Control Implementation

#### API Layer Access Control

1. **Middleware-based verification**
   - JWT validation and role/permission extraction
   - Route-level permission requirements
   - Request validation before handler execution

```typescript
// Example middleware
function requirePermission(permission: string) {
  return async (req, res, next) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    if (!hasPermission(user, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    next();
  };
}

// Usage in route definition
app.get('/api/cvs/:id', 
  authenticateUser, 
  requirePermission('cv:read'), 
  cvController.getCV
);
```

2. **Resource ownership verification**
   - After permission check, verify resource ownership
   - Only allow users to access their own resources (unless admin)
   - Special handling for shared resources

```typescript
// Example ownership check
async function verifyCVOwnership(req, res, next) {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Skip for admins
  if (hasRole(req.user, 'admin')) {
    return next();
  }
  
  const cv = await cvService.getCV(id);
  
  if (!cv) {
    return res.status(404).json({ error: 'CV not found' });
  }
  
  if (cv.userId !== userId) {
    // Check if CV is shared with user
    const hasAccess = await cvService.checkUserHasAccess(id, userId);
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Forbidden' });
    }
  }
  
  next();
}
```

#### Frontend Access Control

1. **Route guards**
   - Protect routes based on authentication status and permissions
   - Redirect unauthorized users to appropriate pages

```typescript
// Example React Router guard
function ProtectedRoute({ permission, children }) {
  const { user, isLoading } = useAuth();
  const hasAccess = user && hasPermission(user, permission);
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!hasAccess) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

// Usage
<Route
  path="/cvs/:id"
  element={
    <ProtectedRoute permission="cv:read">
      <CVDetailPage />
    </ProtectedRoute>
  }
/>
```

2. **UI element conditional rendering**
   - Show/hide UI elements based on permissions
   - Disable actions that the user can't perform

```typescript
// Example component with permission-based rendering
function CVActions({ cv }) {
  const { user } = useAuth();
  
  const canEdit = hasPermission(user, 'cv:write') && (cv.userId === user.id || hasSharedEditAccess(cv, user.id));
  const canDelete = hasPermission(user, 'cv:delete') && cv.userId === user.id;
  const canShare = hasPermission(user, 'cv:share') && cv.userId === user.id;
  
  return (
    <div className="cv-actions">
      {canEdit && <Button onClick={() => handleEdit(cv.id)}>Edit</Button>}
      {canShare && <Button onClick={() => handleShare(cv.id)}>Share</Button>}
      {canDelete && <Button onClick={() => handleDelete(cv.id)}>Delete</Button>}
    </div>
  );
}
```

### 2.4 CV Sharing Access Control

#### Share Types

1. **Specific User Share**
   - Share with specific user by email
   - Receiver must have an account
   - Access tracked and managed

2. **Public Link Share**
   - Share via tokenized URL
   - No account required to view
   - Optional password protection
   - Optional expiration time

#### Access Levels

1. **View Only**
   - Read-only access to CV
   - Can't modify any data
   - May be restricted to specific sections

2. **Comment**
   - View access + ability to add comments
   - Can't modify CV content directly

3. **Edit**
   - Full access to modify CV content
   - Changes tracked as new versions
   - Original owner notified of changes

## 3. Data Protection

### 3.1 Data Encryption

#### Encryption at Rest

1. **Database Encryption**
   - Transparent database encryption for all CV data
   - Encryption keys managed by key management service
   - Regular key rotation

2. **Field-Level Encryption**
   - Sensitive fields (e.g., private contact details) encrypted separately
   - Application-level encryption with separate keys
   - Decrypted only when needed by application logic

3. **File Encryption**
   - Original CV documents encrypted in storage
   - Encryption before writing to storage
   - Decryption on-demand when accessed

#### Encryption in Transit

1. **TLS for All Communications**
   - HTTPS for all web traffic
   - Minimum TLS 1.2
   - Strong cipher suites
   - HSTS implementation

2. **API Communication**
   - All API endpoints require HTTPS
   - Certificate pinning for mobile applications
   - Certificate transparency monitoring

### 3.2 Data Privacy Controls

#### User Data Control

1. **Granular Privacy Settings**
   - Section-level visibility controls for CVs
   - Ability to mask certain information in shared views
   - Download tracking and notifications

2. **Data Retention**
   - User-controlled retention periods for CVs
   - Automatic archiving options
   - Complete data deletion capability

3. **Export and Portability**
   - Export all user data in standard formats
   - Complete data package download
   - Machine-readable format for portability

#### Consent Management

1. **Explicit Consent Tracking**
   - Record all user consents with timestamps
   - Version-tracked consent forms
   - Clear explanation of data usage

2. **Consent Withdrawal**
   - Easy process to withdraw consent
   - Immediate action on withdrawal
   - Effects of withdrawal clearly explained

3. **Third-Party Data Sharing**
   - Explicit consent for each third-party sharing
   - Clear identification of third parties
   - Transparency on data shared and purpose

### 3.3 Data Minimization and Purpose Limitation

1. **Collection Limitation**
   - Collect only necessary data for each purpose
   - Distinguish required from optional fields
   - Explanation of why each piece of data is needed

2. **Processing Limitation**
   - Process data only for specified purposes
   - Internal access controls based on purpose
   - Audit trail of all processing activities

3. **Storage Limitation**
   - Define retention periods for each data category
   - Automatic deletion/anonymization after period
   - Regular review of stored data

## 4. Security Operations

### 4.1 Logging and Monitoring

#### Security Event Logging

1. **Authentication Events**
   - Login attempts (successful and failed)
   - Password changes
   - MFA events
   - Token issuance and validation

2. **Authorization Events**
   - Permission checks (particularly failures)
   - Resource access attempts
   - Privilege escalation

3. **Data Access Events**
   - Sensitive data access
   - Bulk data operations
   - Sharing and external transfers

#### Real-time Monitoring

1. **Anomaly Detection**
   - Login from new location/device
   - Unusual access patterns
   - Brute force attempts
   - Session hijacking attempts

2. **Rate Limiting and Abuse Prevention**
   - API rate limiting
   - Graduated response to suspicious activity
   - Account lockout after suspicious activity

3. **Alerting**
   - Real-time alerts for critical events
   - Escalation procedures
   - Automated response for common threats

### 4.2 Incident Response

#### Incident Types and Severity

1. **Account Compromise**
   - Unauthorized access
   - Credential theft
   - Session hijacking

2. **Data Breach**
   - Unauthorized data access
   - Data exfiltration
   - Mass data exposure

3. **Service Attack**
   - Denial of service
   - API abuse
   - Infrastructure compromise

#### Response Procedures

1. **Detection and Assessment**
   - Identify scope and impact
   - Classify incident severity
   - Assemble response team

2. **Containment**
   - Isolate affected systems
   - Block compromised accounts
   - Preserve evidence

3. **Remediation**
   - Address vulnerability
   - Reset credentials
   - Restore from clean backups

4. **Communication**
   - Internal notification
   - User notification (when appropriate)
   - Regulatory disclosure (if required)

5. **Post-Incident**
   - Root cause analysis
   - Preventive measure implementation
   - Documentation and lessons learned

### 4.3 Vulnerability Management

1. **Security Testing**
   - Regular penetration testing
   - Automated vulnerability scanning
   - Code security review

2. **Dependency Monitoring**
   - Regular dependency audits
   - Automated alerts for vulnerable dependencies
   - Scheduled updates and patches

3. **Security Patching**
   - Defined SLAs for patch application
   - Critical vulnerabilities: 24 hours
   - High: 7 days
   - Medium: 30 days
   - Low: Next release cycle

## 5. Compliance Framework

### 5.1 Regulatory Compliance

#### GDPR Compliance

1. **Data Subject Rights**
   - Right to access
   - Right to rectification
   - Right to erasure
   - Right to restriction of processing
   - Right to data portability
   - Right to object
   - Rights related to automated decision making

2. **Processing Records**
   - Maintain records of all processing activities
   - Processing purpose documentation
   - Categories of data subjects and personal data
   - Recipients of personal data
   - International transfers
   - Retention periods
   - Security measures

3. **Data Protection Impact Assessment**
   - For high-risk processing activities
   - Systematic description of processing
   - Assessment of necessity and proportionality
   - Risk assessment
   - Risk mitigation measures

#### Other Relevant Regulations

1. **CCPA/CPRA (California)**
   - Notice at collection
   - Right to know
   - Right to delete
   - Right to opt-out of sale/sharing
   - Right to non-discrimination

2. **HIPAA (if applicable for health data)**
   - Privacy rule compliance
   - Security rule implementation
   - Breach notification procedures

### 5.2 Compliance Monitoring and Reporting

1. **Compliance Checks**
   - Regular self-assessments
   - Independent audits
   - Continuous compliance monitoring

2. **Documentation**
   - Policies and procedures
   - Evidence of compliance
   - Training records
   - Audit results

3. **Breach Notification**
   - Process for determining notification requirement
   - Notification templates and procedures
   - Record of notifications

## 6. Implementation Guidelines

### 6.1 Authentication Implementation

```typescript
// Example: Authentication Service Interface
interface AuthService {
  // Login methods
  login(email: string, password: string): Promise<AuthResult>;
  loginWithProvider(provider: AuthProvider): Promise<AuthResult>;
  completeLogin(credentials: any): Promise<AuthResult>;
  
  // MFA methods
  setupMFA(method: MFAMethod): Promise<MFASetupResult>;
  verifyMFA(token: string): Promise<AuthResult>;
  disableMFA(): Promise<void>;
  
  // Token management
  refreshToken(): Promise<TokenResult>;
  revokeToken(): Promise<void>;
  validateToken(token: string): Promise<TokenValidationResult>;
  
  // Session management
  getSessions(): Promise<Session[]>;
  terminateSession(sessionId: string): Promise<void>;
  terminateAllSessions(): Promise<void>;
  
  // Current state
  getCurrentUser(): User | null;
  isAuthenticated(): boolean;
}
```

### 6.2 Authorization Implementation

```typescript
// Example: Permission Check Utility
function hasPermission(user: User, permission: string): boolean {
  if (!user || !user.permissions) {
    return false;
  }
  
  // Check direct permission
  if (user.permissions.includes(permission)) {
    return true;
  }
  
  // Check wildcard permissions
  const resourceType = permission.split(':')[0];
  if (user.permissions.includes(`${resourceType}:*`)) {
    return true;
  }
  
  // Check admin permission
  if (user.permissions.includes('*:*')) {
    return true;
  }
  
  return false;
}

// Example: Resource Ownership Check
async function checkResourceOwnership(
  userId: string,
  resourceType: string,
  resourceId: string
): Promise<boolean> {
  const resource = await db.getResource(resourceType, resourceId);
  
  if (!resource) {
    return false;
  }
  
  // Check direct ownership
  if (resource.userId === userId) {
    return true;
  }
  
  // Check for shared access
  if (resourceType === 'cv') {
    const share = await db.getShareByResource(resourceId, userId);
    return !!share;
  }
  
  return false;
}
```

### 6.3 Data Encryption Implementation

```typescript
// Example: Field-Level Encryption Service
interface EncryptionService {
  // Encryption methods
  encryptField(field: string, value: string): Promise<string>;
  decryptField(field: string, encryptedValue: string): Promise<string>;
  
  // Key management
  rotateKey(field: string): Promise<void>;
  getKeyMetadata(field: string): Promise<KeyMetadata>;
}

// Example: Document Encryption
async function encryptDocument(file: File): Promise<EncryptedFile> {
  // Generate random document key
  const docKey = crypto.randomBytes(32);
  
  // Encrypt document with document key
  const encryptedContent = await encrypt(await file.arrayBuffer(), docKey);
  
  // Encrypt document key with master key
  const encryptedKey = await encryptWithMasterKey(docKey);
  
  return {
    encryptedContent,
    encryptedKey,
    algorithm: 'AES-GCM',
    contentType: file.type,
    size: encryptedContent.byteLength,
    metadata: {
      originalName: file.name,
      originalSize: file.size,
      encryptionDate: new Date().toISOString()
    }
  };
}
```

## 7. Security Standards and Requirements

### 7.1 Password Requirements

1. **Complexity Requirements**
   - Minimum length: 12 characters
   - Require mix of: uppercase, lowercase, numbers, special characters
   - Check against common password lists
   - Prohibit personal information (username, email, etc.)

2. **Password Lifecycle**
   - No mandatory password expiration
   - Expire password on security events
   - Prevent password reuse (last 10 passwords)
   - Secure password reset process

### 7.2 API Security Requirements

1. **Authentication**
   - All endpoints authenticated except specifically allowed public ones
   - Token validation on every request
   - Appropriate scopes for each endpoint

2. **Input Validation**
   - Strict schema validation for all inputs
   - Parameterized queries for database access
   - Content type validation
   - Output encoding to prevent injection

3. **Rate Limiting**
   - User-based rate limits
   - IP-based rate limits for unauthenticated endpoints
   - Graduated response (warning, delay, block)
   - Account for legitimate high-volume use cases

### 7.3 Frontend Security Requirements

1. **CSRF Protection**
   - CSRF tokens for state-changing operations
   - SameSite cookie attributes
   - Verify origin/referer on sensitive operations

2. **Content Security Policy**
   - Restrict resource origins
   - Prevent inline scripts
   - Frame ancestors control
   - Report violations

3. **Secure Storage**
   - No sensitive data in localStorage
   - Secure cookie usage
   - Clear sensitive data when no longer needed
   - Encrypt any sensitive client-side cache

## Conclusion

This security framework establishes comprehensive standards for authentication, authorization, data protection, and compliance in the "Help Them Discover You" platform. By implementing these guidelines, we ensure that user data is protected, access is properly controlled, and the platform meets relevant regulatory requirements.

The framework should be reviewed and updated regularly to address new security threats, changes in regulations, and platform evolution. All development teams should adhere to these security standards to maintain a consistent security posture across the platform.
