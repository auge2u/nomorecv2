# NoMoreCV Platform

## Project Structure

The project is organized into domain-specific modules with a clean directory structure:

```
src/
├── api/              # API endpoints and request handlers
├── blockchain/       # Blockchain integration services
├── content/          # Content generation and management
├── core/             # Core models, types, and shared utilities
├── database/         # Database schema and helpers
├── interview/        # Interview management services
├── middleware/       # Express middleware and error handlers
├── output/           # Output generation services
├── profile/          # Profile management
├── python/           # Python integration
├── trait/            # Trait assessment and analytics
├── utils/            # Utility functions
├── verification/     # Verification services
├── web/              # Web assets and static files
└── worker/           # Background workers and processors
```

## Module Structure

Each module follows a consistent structure:

- `index.ts` - Exports the module's public API
- `models/` - Domain models
- `services/` - Business logic and service implementations
- `utils/` - Module-specific utilities

## Dependency Model

The system follows a clear dependency hierarchy:

1. Core modules (models, types, utilities)
2. Domain modules (profile, content, trait, etc.)
3. Infrastructure (database, blockchain)
4. API and presentational modules

## Backward Compatibility

The project maintains backward compatibility through:

- Symlinks for legacy imports
- Re-exports via index files
- Compatibility layers for API interfaces

## Development

To run the development server:

```bash
npm run dev
```

For more information, see the documentation in the `docs/` directory.