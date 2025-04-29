# Communication Protocols

## Overview

This document defines the standardized communication protocols for the "Help Them Discover You" platform's distributed multi-agent system architecture. These protocols establish consistent interfaces between system components, enabling autonomous development while maintaining system cohesion.

## Protocol Layering

The communication architecture follows a layered approach to separate concerns and enable independent development of components.

```mermaid
graph TD
    subgraph "Application Layer Protocols"
        UserInterface["User Interface\nProtocols"]
        BusinessLogic["Business Logic\nProtocols"]
        DataAccess["Data Access\nProtocols"]
    end
    
    subgraph "Service Layer Protocols"
        API["API\nProtocols"]
        Events["Event\nProtocols"]
        RPC["RPC\nProtocols"]
    end
    
    subgraph "Transport Layer Protocols"
        HTTP["HTTP/HTTPS"]
        WebSockets["WebSockets"]
        MessageQueue["Message Queues"]
    end
    
    subgraph "Security Layer"
        Auth["Authentication"]
        AuthZ["Authorization"]
        Encryption["Encryption"]
    end
    
    UserInterface --> API
    BusinessLogic --> API
    BusinessLogic --> Events
    BusinessLogic --> RPC
    DataAccess --> API
    DataAccess --> Events
    
    API --> HTTP
    Events --> WebSockets
    Events --> MessageQueue
    RPC --> HTTP
    
    HTTP --> Auth
    HTTP --> AuthZ
    HTTP --> Encryption
    WebSockets --> Auth
    WebSockets --> AuthZ
    WebSockets --> Encryption
    MessageQueue --> Auth
    MessageQueue --> AuthZ
    MessageQueue --> Encryption

    classDef application fill:#f9d5e5,stroke:#333,stroke-width:1px
    classDef service fill:#d5e5f9,stroke:#333,stroke-width:1px
    classDef transport fill:#e5f9d5,stroke:#333,stroke-width:1px
    classDef security fill:#f9e5d5,stroke:#333,stroke-width:1px
    
    class UserInterface,BusinessLogic,DataAccess application
    class API,Events,RPC service
    class HTTP,WebSockets,MessageQueue transport
    class Auth,AuthZ,Encryption security
```

## Protocol Categories

### 1. RESTful API Protocols

REST APIs provide synchronous communication for CRUD operations and business functions.

#### Standard Endpoint Structure

```
BASE_URL/api/v{version}/{resource}/{id?}/{sub-resource?}
```

#### HTTP Methods Usage

| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resources | Yes | Yes |
| POST | Create resources | No | No |
| PUT | Update entire resources | Yes | No |
| PATCH | Partial resource updates | No | No |
| DELETE | Remove resources | Yes | No |

#### Standard Status Codes

| Code Range | Category | Common Usage |
|------------|----------|--------------|
| 2xx | Success | 200 OK, 201 Created, 204 No Content |
| 3xx | Redirection | 301 Moved, 304 Not Modified |
| 4xx | Client Error | 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity |
| 5xx | Server Error | 500 Internal Server Error, 503 Service Unavailable |

#### Request/Response Format

```json
// GET /api/v1/profiles/123 - Response
{
  "data": {
    "id": "123",
    "type": "profile",
    "attributes": {
      "name": "Jane Smith",
      "title": "Software Engineer",
      "created_at": "2025-02-15T14:30:00Z",
      "updated_at": "2025-03-01T09:15:00Z"
    },
    "relationships": {
      "cvs": {
        "data": [
          { "type": "cv", "id": "456" },
          { "type": "cv", "id": "789" }
        ]
      }
    }
  }
}
```

### 2. GraphQL API Protocol

GraphQL provides flexible data querying for complex data needs.

#### Schema Definition Example

```graphql
type Profile {
  id: ID!
  name: String!
  title: String
  about: String
  skills: [Skill!]!
  experience: [Experience!]!
  education: [Education!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type CV {
  id: ID!
  title: String!
  profile: Profile!
  version: Int!
  content: CVContent!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type Query {
  profile(id: ID!): Profile
  profiles(filter: ProfileFilter): [Profile!]!
  cv(id: ID!): CV
  cvs(profileId: ID!): [CV!]!
}

type Mutation {
  createProfile(input: ProfileInput!): Profile!
  updateProfile(id: ID!, input: ProfileInput!): Profile!
  createCV(input: CVInput!): CV!
  updateCV(id: ID!, input: CVInput!): CV!
}
```

#### Query/Mutation Examples

```graphql
# Query example
query GetProfileWithCVs($id: ID!) {
  profile(id: $id) {
    id
    name
    title
    skills {
      id
      name
      level
    }
    experience {
      id
      company
      title
      startDate
      endDate
    }
  }
}

# Mutation example
mutation CreateNewCV($input: CVInput!) {
  createCV(input: $input) {
    id
    title
    version
    createdAt
  }
}
```

### 3. Event-Based Protocol

Event-based protocols enable asynchronous communication between components.

#### Event Structure

```json
{
  "event_id": "e12345-67890-abcde",
  "event_type": "profile.updated",
  "version": "1.0",
  "timestamp": "2025-03-10T15:30:45.123Z",
  "source": "profile-service",
  "data": {
    "profile_id": "123",
    "updated_fields": ["title", "about"],
    "user_id": "user_789"
  },
  "metadata": {
    "correlation_id": "corr-12345",
    "causation_id": "cause-6789"
  }
}
```

#### Standard Event Types

| Domain | Event Pattern | Examples |
|--------|--------------|----------|
| User | user.{action} | user.registered, user.verified |
| Profile | profile.{action} | profile.created, profile.updated |
| CV | cv.{action} | cv.uploaded, cv.parsed, cv.version_created |
| Authentication | auth.{action} | auth.login_success, auth.login_failed |
| Sharing | sharing.{action} | sharing.link_created, sharing.access_granted |
| Integration | integration.{source}.{action} | integration.linkedin.connected, integration.github.synced |

### 4. WebSocket Protocol 

WebSocket protocols enable real-time bidirectional communication.

#### Connection Endpoints

```
wss://api.example.com/ws/v1/{resource}/{id}
```

#### Message Format

```json
{
  "type": "message_type",
  "id": "msg_12345",
  "timestamp": "2025-03-10T15:35:22.456Z",
  "payload": {
    // Specific to message type
  }
}
```

#### Standard Message Types

| Type | Direction | Purpose |
|------|-----------|---------|
| authentication | Client → Server | Authenticate WebSocket connection |
| subscription | Client → Server | Subscribe to specific events/resources |
| unsubscription | Client → Server | Unsubscribe from events/resources |
| event | Server → Client | Notify client of events |
| error | Server → Client | Communicate errors |
| heartbeat | Bidirectional | Maintain connection |

### 5. RPC Protocol

Remote Procedure Call protocols for service-to-service communication.

#### Service Definition Example (gRPC)

```protobuf
syntax = "proto3";

package cv.parser;

service ParserService {
  rpc ParseDocument(ParseRequest) returns (ParseResponse);
  rpc ExtractEntities(EntitiesRequest) returns (EntitiesResponse);
  rpc AnalyzeDocument(AnalysisRequest) returns (AnalysisResponse);
}

message ParseRequest {
  string document_url = 1;
  string document_type = 2;
  string cv_id = 3;
}

message ParseResponse {
  string job_id = 1;
  string status = 2;
  map<string, string> extracted_sections = 3;
}

// Additional messages defined here
```

## Message Queue Protocols

Message queues enable asynchronous, durable communication between services.

### Queue Naming Convention

```
{environment}.{domain}.{action}.{direction}
```

Examples:
- `prod.cv.parse.request`
- `dev.profile.update.notification`
- `test.analytics.calculate.command`

### Message Structure

```json
{
  "message_id": "msg_12345",
  "correlation_id": "corr_67890",
  "timestamp": "2025-03-10T15:40:50.789Z",
  "publisher": "profile-service",
  "message_type": "command",
  "payload": {
    // Specific to the message purpose
  },
  "attributes": {
    "priority": "high",
    "retry_count": 0,
    "deadline": "2025-03-10T15:45:50.789Z"
  }
}
```

### Message Types

| Type | Purpose | Examples |
|------|---------|----------|
| Command | Instruct a service to perform an action | ParseCV, GenerateReport |
| Event | Notify about something that has occurred | CVUploaded, ProfileUpdated |
| Query | Request information from a service | GetProfileStats, FetchCVHistory |
| Document | Transfer larger data sets | CVContent, AnalyticsDataset |

## API Contract Specifications

### OpenAPI Specification Example

```yaml
openapi: 3.0.0
info:
  title: Profile API
  version: '1.0'
  description: API for managing user professional profiles
paths:
  /profiles:
    get:
      summary: List profiles
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
        - name: offset
          in: query
          schema:
            type: integer
            default: 0
      responses:
        '200':
          description: List of profiles
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/Profile'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
    post:
      summary: Create a profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProfileInput'
      responses:
        '201':
          description: Profile created
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Profile'
  
  /profiles/{id}:
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
    get:
      summary: Get a profile by ID
      responses:
        '200':
          description: Profile details
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Profile'
        '404':
          description: Profile not found
    
    put:
      summary: Update a profile
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ProfileInput'
      responses:
        '200':
          description: Profile updated
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    $ref: '#/components/schemas/Profile'
        '404':
          description: Profile not found
    
    delete:
      summary: Delete a profile
      responses:
        '204':
          description: Profile deleted
        '404':
          description: Profile not found

components:
  schemas:
    Profile:
      type: object
      properties:
        id:
          type: string
        type:
          type: string
          enum: [profile]
        attributes:
          type: object
          properties:
            name:
              type: string
            title:
              type: string
            about:
              type: string
            created_at:
              type: string
              format: date-time
            updated_at:
              type: string
              format: date-time
        relationships:
          type: object
          properties:
            cvs:
              type: object
              properties:
                data:
                  type: array
                  items:
                    type: object
                    properties:
                      type:
                        type: string
                        enum: [cv]
                      id:
                        type: string
      required:
        - id
        - type
        - attributes
    
    ProfileInput:
      type: object
      properties:
        name:
          type: string
        title:
          type: string
        about:
          type: string
      required:
        - name
    
    Pagination:
      type: object
      properties:
        total:
          type: integer
        limit:
          type: integer
        offset:
          type: integer
        has_more:
          type: boolean
```

## Authentication and Authorization Protocol

### JWT-Based Authentication

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### JWT Claims Structure

```json
{
  "iss": "help-them-discover-you",
  "sub": "user_12345",
  "iat": 1615382407,
  "exp": 1615386007,
  "roles": ["user"],
  "permissions": ["read:profiles", "write:profiles", "read:cvs", "write:cvs"],
  "tenant_id": "tenant_6789"
}
```

### OAuth 2.0 Flows

1. **Authorization Code Flow** for web applications
2. **PKCE Flow** for mobile applications
3. **Client Credentials Flow** for service-to-service
4. **Resource Owner Password Flow** for legacy or trusted applications

### Role-Based Access Control

```json
// Example permission map
{
  "roles": {
    "admin": {
      "permissions": ["*"]
    },
    "user": {
      "permissions": [
        "read:own_profiles",
        "write:own_profiles",
        "read:own_cvs",
        "write:own_cvs",
        "share:own_profiles",
        "share:own_cvs"
      ]
    },
    "viewer": {
      "permissions": [
        "read:shared_profiles",
        "read:shared_cvs"
      ]
    }
  }
}
```

## Error Handling Protocol

### Standard Error Response Format

```json
{
  "error": {
    "id": "error_12345",
    "code": "validation_error",
    "status": 400,
    "title": "Validation Error",
    "detail": "The provided email address is not valid",
    "source": {
      "pointer": "/data/attributes/email"
    },
    "meta": {
      "validation_rules": ["email"]
    }
  }
}
```

### Error Categories

| Category | Code Prefix | HTTP Status | Examples |
|----------|-------------|-------------|----------|
| Authentication | auth_ | 401 | auth_invalid_token, auth_expired_token |
| Authorization | authz_ | 403 | authz_insufficient_permissions, authz_resource_forbidden |
| Validation | validation_ | 400 | validation_missing_field, validation_invalid_format |
| Resource | resource_ | 404/409 | resource_not_found, resource_already_exists |
| Business Logic | business_ | 422 | business_invalid_state, business_operation_forbidden |
| System | system_ | 500/503 | system_internal_error, system_service_unavailable |

## Data Schema Protocols

### User Data Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the user"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "name": {
      "type": "string"
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    },
    "last_login": {
      "type": "string",
      "format": "date-time"
    },
    "settings": {
      "type": "object",
      "properties": {
        "email_notifications": {
          "type": "boolean",
          "default": true
        },
        "language": {
          "type": "string",
          "default": "en"
        },
        "theme": {
          "type": "string",
          "enum": ["light", "dark", "system"],
          "default": "system"
        }
      }
    }
  },
  "required": ["id", "email", "name", "created_at", "updated_at"]
}
```

### Profile Data Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Profile",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique identifier for the profile"
    },
    "user_id": {
      "type": "string",
      "description": "Reference to the user who owns this profile"
    },
    "name": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "about": {
      "type": "string"
    },
    "contact": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email"
        },
        "phone": {
          "type": "string"
        },
        "location": {
          "type": "string"
        },
        "social": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "platform": {
                "type": "string"
              },
              "url": {
                "type": "string",
                "format": "uri"
              },
              "username": {
                "type": "string"
              }
            },
            "required": ["platform", "url"]
          }
        }
      }
    },
    "skills": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string"
          },
          "level": {
            "type": "integer",
            "minimum": 1,
            "maximum": 5
          },
          "years": {
            "type": "integer"
          },
          "category": {
            "type": "string"
          }
        },
        "required": ["name"]
      }
    },
    "experience": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "company": {
            "type": "string"
          },
          "title": {
            "type": "string"
          },
          "location": {
            "type": "string"
          },
          "start_date": {
            "type": "string",
            "format": "date"
          },
          "end_date": {
            "type": "string",
            "format": "date"
          },
          "current": {
            "type": "boolean",
            "default": false
          },
          "description": {
            "type": "string"
          },
          "achievements": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": ["company", "title", "start_date"]
      }
    },
    "education": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "institution": {
            "type": "string"
          },
          "degree": {
            "type": "string"
          },
          "field": {
            "type": "string"
          },
          "start_date": {
            "type": "string",
            "format": "date"
          },
          "end_date": {
            "type": "string",
            "format": "date"
          },
          "current": {
            "type": "boolean",
            "default": false
          },
          "description": {
            "type": "string"
          },
          "achievements": {
            "type": "array",
            "items": {
              "type": "string"
            }
          }
        },
        "required": ["institution", "start_date"]
      }
    },
    "created_at": {
      "type": "string",
      "format": "date-time"
    },
    "updated_at": {
      "type": "string",
      "format": "date-time"
    }
  },
  "required": ["id", "user_id", "name", "created_at", "updated_at"]
}
```

## Protocol Versioning

### Version Identification

- **API versions**: Explicit in URL path (`/api/v1/...`)
- **Event versions**: In event metadata
- **Schema versions**: In schema definition
- **RPC versions**: In service definition

### Version Compatibility

- **Breaking change**: Increment major version
- **Non-breaking additions**: Increment minor version
- **Fixes or clarifications**: Increment patch version

### Backwards Compatibility Requirements

- All APIs must maintain backwards compatibility within the same major version
- New fields should be optional to maintain compatibility
- Deprecated fields should be marked but maintained for at least one major version
- Version lifecycle documented with support time frames

## Protocol Evolution Process

```mermaid
flowchart TD
    A[Identify Protocol Changes] --> B{Breaking Change?}
    B -->|Yes| C[Increment Major Version]
    B -->|No| D[Increment Minor Version]
    C --> E[Create New Protocol Version]
    D --> F[Extend Current Protocol]
    E --> G[Update Documentation]
    F --> G
    G --> H[Notify Stakeholders]
    H --> I[Implementation Phase]
    I --> J[Deprecation Notice for Old Version]
    J --> K[Support Period]
    K --> L[Removal of Old Version]
    
    classDef process fill:#d4f1f9,stroke:#333,stroke-width:1px
    classDef decision fill:#f9e7d4,stroke:#333,stroke-width:1px
    classDef action fill:#d4f9db,stroke:#333,stroke-width:1px
    
    class A,G,H,I process
    class B decision
    class C,D,E,F,J,K,L action
```

## Appendix: Protocol Implementation Guidelines

### Integration Best Practices

1. **Contract-First Development**
   - Define interfaces before implementation
   - Use code generation for client/server from contracts where possible
   - Validate implementations against contracts in CI

2. **Backward Compatibility**
   - Always add fields, never remove them
   - Make new fields optional with defaults
   - Maintain deprecated fields until scheduled removal

3. **Error Handling**
   - Never silently ignore errors
   - Log all errors with appropriate severity
   - Return structured error responses
   - Include correlation IDs for request tracing

4. **Validation**
   - Validate request data at the edge
   - Provide detailed validation errors
   - Apply consistent validation across all services
   - Use shared validation libraries when possible

### Common Protocol Anti-Patterns

1. **Breaking backward compatibility**
2. **Tight coupling between services**
3. **Inconsistent error handling**
4. **Mixing concerns across protocol layers**
5. **Hardcoded service dependencies**
6. **Duplicate data schemas across services**

### Implementation Checklist

- [ ] Protocol documentation created/updated
- [ ] Contracts defined in appropriate format (OpenAPI, GraphQL Schema, Protobuf, etc.)
- [ ] Version strategy documented
- [ ] Backward compatibility assessed
- [ ] Generated client/server code available
- [ ] Error handling implemented to standard
- [ ] Input validation implemented
- [ ] Rate limiting considered
- [ ] Security requirements addressed
- [ ] Performance considerations documented
- [ ] Logging/monitoring integration defined