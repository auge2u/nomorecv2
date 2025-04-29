# Project Structure Documentation

## Directory Structure Rationale

The NoMoreCV platform has been organized into a modular, domain-driven structure to improve maintainability, scalability, and code organization. This document explains the reasoning behind the structure and how to navigate the codebase.

### Core Principles

1. **Domain-Driven Design**: Each functional area of the application has its own module with clear boundaries
2. **Separation of Concerns**: Clear separation between data models, business logic, and presentation layers
3. **Dependency Management**: Explicit dependencies with a clear direction of flow
4. **Backward Compatibility**: Legacy imports maintained through symlinks and re-exports

## Module Organization

### Core Module (`src/core/`)

Contains fundamental types, models, and utilities that are used throughout the application:

- `models.ts` - Core data models
- `types.ts` - TypeScript type definitions
- `supabase.ts` - Database client and connection management

### Domain Modules

Each domain module follows the same internal structure:

- `index.ts` - Public API exports
- `models/` - Domain data models
- `services/` - Business logic implementations
- `utils/` - Domain-specific utilities

Key domain modules include:

- `profile/` - User profile management
- `trait/` - Trait assessment and analysis
- `content/` - Content generation and management
- `interview/` - Interview process handling
- `output/` - Output generation and formatting
- `verification/` - Verification and validation
- `blockchain/` - Blockchain integration

### Infrastructure Modules

- `api/` - API endpoints and request handlers
- `database/` - Database schema and utilities
- `middleware/` - Express middleware
- `utils/` - Shared utility functions
- `worker/` - Background processing

### Web Assets

- `web/` - Static assets and browser code

## Dependency Flow

The dependency flow follows this direction:

```
Utils → Core → Domain Services → API → Web
```

This ensures that:

1. Lower-level modules don't depend on higher-level ones
2. Core business logic is isolated from presentation concerns
3. Services can be tested independently

## Backward Compatibility

To maintain backward compatibility, the following strategies are used:

1. **Symlinks**: Legacy imports at the root level point to their new locations
2. **Re-exports**: Index files re-export public APIs
3. **Interface Stability**: Public interfaces remain stable even as implementations change

## Development Guidelines

When extending the application:

1. Identify the appropriate domain module
2. Follow the established patterns within that module
3. Keep dependencies flowing in the correct direction
4. Update exports in the module's index file
5. Write tests against the public API

## Migration Path

The migration to this structure was done in phases:

1. Create the core directory structure
2. Move files to appropriate locations
3. Create symlinks for backward compatibility
4. Update imports gradually
5. Remove symlinks once all references are updated

This approach ensured that the application remained functional throughout the restructuring process.