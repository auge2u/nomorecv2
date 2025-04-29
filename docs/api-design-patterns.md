# API Design Patterns for Maintainable REST Services

## Introduction

As demonstrated in our `traits.ts` case study, API endpoints can quickly grow in complexity and size as new features are added. This document outlines design patterns and architectural approaches that can help build more maintainable API services from the start.

## Core API Design Patterns

### 1. The Router Pattern

The router pattern separates routing logic from handler implementation, making the codebase more navigable and maintainable.

**Example:**

```typescript
export async function handleApi(request: Request, path: string[]): Promise<Response> {
  // Core routing logic
  if (path[0] === 'resource1') {
    return handleResource1(request, path.slice(1));
  }
  
  if (path[0] === 'resource2') {
    return handleResource2(request, path.slice(1));
  }
  
  return notFoundResponse();
}
```

**Benefits:**
- Clear entry point for all requests
- Separation of routing from implementation
- Easier to trace request flow

### 2. Handler Function Pattern

Handler functions process specific HTTP methods for specific resources, with standardized signatures and return types.

**Example:**

```typescript
async function handleGetResource(
  request: Request,
  resourceId?: string
): Promise<Response> {
  // Implementation for GET /resource or GET /resource/{id}
}

async function handleCreateResource(
  request: Request
): Promise<Response> {
  // Implementation for POST /resource
}
```

**Benefits:**
- Single responsibility functions
- Predictable function signatures
- Easier testing

### 3. Service Layer Pattern

The service layer pattern separates business logic from API request handling, allowing for reuse and better organization.

**Example:**

```typescript
// API Handler
async function handleGetResource(request: Request, id: string): Promise<Response> {
  try {
    const resource = await resourceService.getById(id);
    return createSuccessResponse(resource);
  } catch (error) {
    return handleError(error);
  }
}

// Service Layer
class ResourceService {
  async getById(id: string): Promise<Resource> {
    // Business logic for retrieving a resource
  }
}
```

**Benefits:**
- Business logic can be reused across handlers
- Clear separation of concerns
- Easier to mock services in tests

### 4. Repository Pattern

The repository pattern isolates data access logic from business logic, making the system more adaptable to database changes.

**Example:**

```typescript
// Service using repository
class ResourceService {
  constructor(private repository: ResourceRepository) {}
  
  async getById(id: string): Promise<Resource> {
    return this.repository.findById(id);
  }
}

// Repository implementation
class ResourceRepository {
  async findById(id: string): Promise<Resource> {
    // Database-specific code
  }
}
```

**Benefits:**
- Database technology can be changed without affecting business logic
- Data access code is centralized
- easier transaction management

### 5. Request Validation Pattern

Centralize and standardize request validation using schemas or validators.

**Example:**

```typescript
// Define schema once
const createResourceSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['type1', 'type2']),
  status: z.boolean()
});

// Validate in handler
async function handleCreateResource(request: Request): Promise<Response> {
  try {
    const validatedData = await validateRequest(request, createResourceSchema);
    // Process validated data
  } catch (validationError) {
    return validationErrorResponse(validationError);
  }
}
```

**Benefits:**
- Consistent validation across endpoints
- Clear validation rules
- Early validation prevents processing invalid data

### 6. Response Envelope Pattern

Standardize API responses with consistent structure for both success and error cases.

**Example:**

```typescript
// Success response
{
  "success": true,
  "data": {
    "id": "123",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2023-04-15T12:00:00Z"
  }
}

// Error response
{
  "success": false,
  "error": "Resource not found",
  "code": "NOT_FOUND",
  "meta": {
    "requestId": "abc-123"
  }
}
```

**Benefits:**
- Consistent response structure for clients
- Easier error handling on client side
- Separation of data and metadata

### 7. Controller-Service-Repository Pattern

Combine the handler, service, and repository patterns into a comprehensive architecture.

**Structure:**
- **Controllers**: Handle HTTP requests and responses
- **Services**: Implement business logic
- **Repositories**: Handle data access

**Example:**

```typescript
// Controller (API Handler)
async function handleGetUser(req: Request, id: string): Promise<Response> {
  try {
    const user = await userService.getById(id);
    return createSuccessResponse(user);
  } catch (error) {
    return handleError(error);
  }
}

// Service
class UserService {
  constructor(private userRepo: UserRepository) {}
  
  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new NotFoundError();
    return user;
  }
}

// Repository
class UserRepository {
  async findById(id: string): Promise<User|null> {
    // Data access code
  }
}
```

**Benefits:**
- Clear separation of responsibilities
- Each layer has a single purpose
- Testable in isolation

## Advanced Patterns

### 1. Feature Module Pattern

Organize code by feature rather than technical function, grouping all related functionality together.

**Example Structure:**
```
src/
  features/
    users/
      user.controller.ts
      user.service.ts
      user.repository.ts
      user.types.ts
    products/
      product.controller.ts
      product.service.ts
      product.repository.ts
      product.types.ts
  shared/
    utils/
    middleware/
```

**Benefits:**
- Related code stays together
- Features can evolve independently
- Clearer ownership

### 2. Middleware Chain Pattern

Use composable middleware for cross-cutting concerns like authentication, logging, and rate limiting.

**Example:**

```typescript
const apiHandler = compose(
  loggerMiddleware,
  authMiddleware,
  rateLimitMiddleware,
  handleApi
);

async function authMiddleware(request: Request, next: NextFunction): Promise<Response> {
  // Authentication logic
  if (!authenticated) {
    return unauthorizedResponse();
  }
  return next(request);
}
```

**Benefits:**
- Reusable cross-cutting concerns
- Separation of core logic from infrastructure concerns
- Easier to add/remove middleware as needed

### 3. Command Pattern

Use command objects to encapsulate all information needed to perform an action or trigger an event.

**Example:**

```typescript
interface Command {
  execute(): Promise<Result>;
}

class CreateResourceCommand implements Command {
  constructor(private data: ResourceData, private userId: string) {}
  
  async execute(): Promise<ResourceResult> {
    // Implementation
  }
}

// Usage
async function handleCreateResource(request: Request): Promise<Response> {
  const data = await validateRequest(request);
  const userId = getUserId(request);
  const command = new CreateResourceCommand(data, userId);
  const result = await command.execute();
  return createSuccessResponse(result);
}
```

**Benefits:**
- Encapsulated business logic
- Can be queued, logged, or validated consistently
- Supports complex operations

### 4. Query Object Pattern

Similar to the command pattern but for retrieving data with complex filtering, sorting, or pagination.

**Example:**

```typescript
class ResourceQuery {
  constructor(
    public filters: ResourceFilters,
    public sort: SortOptions,
    public pagination: PaginationOptions
  ) {}
  
  async execute(): Promise<QueryResult<Resource>> {
    // Query implementation
  }
}

// Usage
async function handleQueryResources(request: Request): Promise<Response> {
  const options = parseQueryOptions(request);
  const query = new ResourceQuery(options.filters, options.sort, options.pagination);
  const result = await query.execute();
  return createSuccessResponse(result.items, result.meta);
}
```

**Benefits:**
- Encapsulates complex query logic
- Reusable across multiple endpoints
- Can be extended for specialized queries

### 5. Domain Events Pattern

Emit events when significant actions occur, allowing for loose coupling between components.

**Example:**

```typescript
// Event definition
interface ResourceCreatedEvent {
  type: 'ResourceCreated';
  payload: {
    id: string;
    name: string;
    createdBy: string;
    timestamp: string;
  };
}

// Event emitter
class ResourceService {
  constructor(private eventBus: EventBus) {}
  
  async createResource(data: ResourceData, userId: string): Promise<Resource> {
    // Create resource
    const resource = await this.repository.create(data);
    
    // Emit event
    this.eventBus.emit({
      type: 'ResourceCreated',
      payload: {
        id: resource.id,
        name: resource.name,
        createdBy: userId,
        timestamp: new Date().toISOString()
      }
    });
    
    return resource;
  }
}
```

**Benefits:**
- Decouples event producers from consumers
- Supports extensibility
- Enables event-driven architecture

## Implementation Recommendations

1. **Start with Clear API Design**
   - Document API contracts before implementation
   - Design with modularity in mind from the start
   - Use OpenAPI/Swagger for specification

2. **Adopt Consistent Patterns**
   - Choose patterns that fit your team's skills and project needs
   - Document the chosen patterns as standards
   - Apply patterns consistently across the codebase

3. **Layer Your Architecture**
   - Separate HTTP handling from business logic
   - Separate business logic from data access
   - Define clear interfaces between layers

4. **Plan for Growth**
   - Design APIs that can evolve without breaking changes
   - Use versioning strategies for significant changes
   - Create extension points for future requirements

5. **Focus on Testability**
   - Design components to be easily testable in isolation
   - Mock dependencies for unit testing
   - Create integration tests for API endpoints

## Conclusion

By applying these design patterns from the start, API implementations can remain maintainable even as they grow in complexity. The modular approach enables teams to extend functionality without affecting existing code, and makes the codebase more accessible to new team members.

Remember that patterns should serve the project needs, not the other way around. Choose the patterns that best fit your specific requirements and team capabilities.