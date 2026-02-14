import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_API_ENDPOINT = 'https://api.test.com/api/v1';
process.env.VITE_ENVIRONMENT = 'test';
