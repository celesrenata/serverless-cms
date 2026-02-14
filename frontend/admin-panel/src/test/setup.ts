import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables
process.env.VITE_API_ENDPOINT = 'https://api.test.com/api/v1';
process.env.VITE_AWS_REGION = 'us-west-2';
process.env.VITE_USER_POOL_ID = 'us-west-2_test';
process.env.VITE_USER_POOL_CLIENT_ID = 'test-client-id';
process.env.VITE_MEDIA_BUCKET = 'test-media-bucket';
process.env.VITE_ENVIRONMENT = 'test';
