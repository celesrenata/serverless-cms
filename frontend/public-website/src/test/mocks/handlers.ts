import { vi } from 'vitest';
import {
  createMockContent,
  createMockComment,
  createMockSettings,
  createMockContentList,
} from './data';

/**
 * Pre-configured vi.fn() mocks for all public API methods.
 * Use with: vi.mock('../../services/api', () => ({ api: mockApiHandlers }))
 */
export const mockApiHandlers = {
  listContent: vi.fn().mockResolvedValue(createMockContentList()),
  getContent: vi.fn().mockResolvedValue(createMockContent()),
  getContentBySlug: vi.fn().mockResolvedValue(createMockContent()),
  getComments: vi.fn().mockResolvedValue([createMockComment()]),
  createComment: vi.fn().mockResolvedValue(createMockComment()),
  getPublicSettings: vi.fn().mockResolvedValue(createMockSettings()),
  getSettings: vi.fn().mockResolvedValue(createMockSettings()),
  register: vi.fn().mockResolvedValue({ message: 'Registration successful' }),
  verifyEmail: vi.fn().mockResolvedValue({ message: 'Email verified' }),
  resendVerification: vi.fn().mockResolvedValue({ message: 'Verification code resent' }),
};

/**
 * Resets all mock handlers to their initial state.
 * Call in beforeEach() to ensure test isolation.
 */
export function resetHandlers(): void {
  Object.values(mockApiHandlers).forEach((mock) => mock.mockReset());

  // Restore default resolved values
  mockApiHandlers.listContent.mockResolvedValue(createMockContentList());
  mockApiHandlers.getContent.mockResolvedValue(createMockContent());
  mockApiHandlers.getContentBySlug.mockResolvedValue(createMockContent());
  mockApiHandlers.getComments.mockResolvedValue([createMockComment()]);
  mockApiHandlers.createComment.mockResolvedValue(createMockComment());
  mockApiHandlers.getPublicSettings.mockResolvedValue(createMockSettings());
  mockApiHandlers.getSettings.mockResolvedValue(createMockSettings());
  mockApiHandlers.register.mockResolvedValue({ message: 'Registration successful' });
  mockApiHandlers.verifyEmail.mockResolvedValue({ message: 'Email verified' });
  mockApiHandlers.resendVerification.mockResolvedValue({ message: 'Verification code resent' });
}
