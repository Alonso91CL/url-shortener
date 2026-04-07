// =============================================================================
// Vitest Configuration
// =============================================================================

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Test environment
    environment: 'node',
    
    // Test file patterns
    testMatch: [
      '**/tests/**/*.test.ts',
    ],
    
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.git/**',
    ],
    
    // Setup files
    setupFiles: ['./tests/setup.ts'],
    
    // Global test timeout
    timeout: 30000,
    
    // Pool options for TypeScript projects
    pool: 'forks',
    
    // Pool options
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/services/**/*.ts',
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.config.ts',
        '**/index.ts',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
    
    // reporters
    reporters: ['default'],
    
    // bail on first failure in CI
    bail: process.env.CI ? 1 : 0,
    
    // verbose output
    verbose: true,
    
    // environment variables
    env: {
      NODE_ENV: 'test',
    },
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // TypeScript options
  typescript: {
    tsconfig: './tsconfig.json',
  },
  
  // Build options for esbuild
  esbuild: {
    platform: 'node',
    target: 'node20',
  },
});
