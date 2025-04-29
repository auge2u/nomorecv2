/**
 * Root index file that re-exports all modules for the application
 */

// Core modules
export * from './core';

// Domain modules
export * from './profile';
export * from './content';
export * from './interview';
export * from './output';
export * from './verification';
export * from './blockchain';

// Import trait modules but handle naming conflicts
import * as traitModule from './trait';
// Explicitly re-export TraitService to avoid naming conflicts
export { TraitService } from './trait';
export { TraitRelationship, TraitCluster, MetaCluster, TraitEvolution, TraitRecommendation } from './trait';

// Utils and middleware
export * from './utils';
export * from './middleware';

// API modules
export * from './api';

// Additional modules
export * from './worker';
export * from './database';
export * from './web';
