import { vi } from 'vitest';
import {
  createMockContent,
  createMockContentList,
  createMockMedia,
  createMockMediaList,
  createMockUser,
  createMockPlugin,
  createMockSettings,
  createMockComment,
} from './data';

/**
 * Pre-configured vi.fn() mock implementations for the ApiClient.
 * Each function returns realistic data from the factories by default.
 * Use mockResolvedValueOnce or mockImplementationOnce to override per-test.
 *
 * Usage:
 *   vi.mock('../../services/api', () => ({ api: mockApiHandlers }));
 */
export const mockApiHandlers = {
  // Content API
  listContent: vi.fn().mockResolvedValue(createMockContentList()),
  getContent: vi.fn().mockResolvedValue(createMockContent()),
  getContentBySlug: vi.fn().mockResolvedValue(createMockContent()),
  createContent: vi.fn().mockResolvedValue(createMockContent()),
  updateContent: vi.fn().mockResolvedValue(createMockContent()),
  deleteContent: vi.fn().mockResolvedValue(undefined),

  // Media API
  listMedia: vi.fn().mockResolvedValue(createMockMediaList()),
  getMedia: vi.fn().mockResolvedValue(createMockMedia()),
  uploadMedia: vi.fn().mockResolvedValue(createMockMedia()),
  updateMedia: vi.fn().mockResolvedValue(createMockMedia()),
  deleteMedia: vi.fn().mockResolvedValue(undefined),

  // User API
  getCurrentUser: vi.fn().mockResolvedValue(createMockUser()),
  updateCurrentUser: vi.fn().mockResolvedValue(createMockUser()),
  listUsers: vi.fn().mockResolvedValue([
    createMockUser(),
    createMockUser({ id: 'user-002', email: 'bob@example.com', name: 'Bob Author', role: 'author' }),
    createMockUser({ id: 'user-003', email: 'carol@example.com', name: 'Carol Viewer', role: 'viewer' }),
  ]),
  createUser: vi.fn().mockResolvedValue(createMockUser()),
  updateUser: vi.fn().mockResolvedValue(createMockUser()),
  deleteUser: vi.fn().mockResolvedValue(undefined),
  resetUserPassword: vi.fn().mockResolvedValue(undefined),

  // Comment moderation API
  getCommentsForModeration: vi.fn().mockResolvedValue({
    comments: [
      createMockComment(),
      createMockComment({ id: 'comment-002', author_name: 'Bob', comment_text: 'Nice article!', status: 'pending' }),
      createMockComment({ id: 'comment-003', author_name: 'Eve', comment_text: 'Spam content', status: 'spam' }),
    ],
  }),
  updateCommentStatus: vi.fn().mockResolvedValue(undefined),
  deleteComment: vi.fn().mockResolvedValue(undefined),

  // Settings API
  getSettings: vi.fn().mockResolvedValue(createMockSettings()),
  updateSettings: vi.fn().mockResolvedValue(createMockSettings()),

  // Plugin API
  listPlugins: vi.fn().mockResolvedValue([
    createMockPlugin(),
    createMockPlugin({ id: 'plugin-002', name: 'Analytics', active: false }),
  ]),
  installPlugin: vi.fn().mockResolvedValue(createMockPlugin()),
  activatePlugin: vi.fn().mockResolvedValue(createMockPlugin({ active: true })),
  deactivatePlugin: vi.fn().mockResolvedValue(createMockPlugin({ active: false })),
  deletePlugin: vi.fn().mockResolvedValue(undefined),
  getPluginSettings: vi.fn().mockResolvedValue({ enable_analysis: true }),
  updatePluginSettings: vi.fn().mockResolvedValue({ enable_analysis: false }),
};

/**
 * Resets all mock handlers to their default resolved values.
 * Call in beforeEach to ensure test isolation.
 */
export function resetMockHandlers(): void {
  mockApiHandlers.listContent.mockResolvedValue(createMockContentList());
  mockApiHandlers.getContent.mockResolvedValue(createMockContent());
  mockApiHandlers.getContentBySlug.mockResolvedValue(createMockContent());
  mockApiHandlers.createContent.mockResolvedValue(createMockContent());
  mockApiHandlers.updateContent.mockResolvedValue(createMockContent());
  mockApiHandlers.deleteContent.mockResolvedValue(undefined);

  mockApiHandlers.listMedia.mockResolvedValue(createMockMediaList());
  mockApiHandlers.getMedia.mockResolvedValue(createMockMedia());
  mockApiHandlers.uploadMedia.mockResolvedValue(createMockMedia());
  mockApiHandlers.updateMedia.mockResolvedValue(createMockMedia());
  mockApiHandlers.deleteMedia.mockResolvedValue(undefined);

  mockApiHandlers.getCurrentUser.mockResolvedValue(createMockUser());
  mockApiHandlers.updateCurrentUser.mockResolvedValue(createMockUser());
  mockApiHandlers.listUsers.mockResolvedValue([
    createMockUser(),
    createMockUser({ id: 'user-002', email: 'bob@example.com', name: 'Bob Author', role: 'author' }),
    createMockUser({ id: 'user-003', email: 'carol@example.com', name: 'Carol Viewer', role: 'viewer' }),
  ]);
  mockApiHandlers.createUser.mockResolvedValue(createMockUser());
  mockApiHandlers.updateUser.mockResolvedValue(createMockUser());
  mockApiHandlers.deleteUser.mockResolvedValue(undefined);
  mockApiHandlers.resetUserPassword.mockResolvedValue(undefined);

  mockApiHandlers.getCommentsForModeration.mockResolvedValue({
    comments: [
      createMockComment(),
      createMockComment({ id: 'comment-002', author_name: 'Bob', comment_text: 'Nice article!', status: 'pending' }),
      createMockComment({ id: 'comment-003', author_name: 'Eve', comment_text: 'Spam content', status: 'spam' }),
    ],
  });
  mockApiHandlers.updateCommentStatus.mockResolvedValue(undefined);
  mockApiHandlers.deleteComment.mockResolvedValue(undefined);

  mockApiHandlers.getSettings.mockResolvedValue(createMockSettings());
  mockApiHandlers.updateSettings.mockResolvedValue(createMockSettings());

  mockApiHandlers.listPlugins.mockResolvedValue([
    createMockPlugin(),
    createMockPlugin({ id: 'plugin-002', name: 'Analytics', active: false }),
  ]);
  mockApiHandlers.installPlugin.mockResolvedValue(createMockPlugin());
  mockApiHandlers.activatePlugin.mockResolvedValue(createMockPlugin({ active: true }));
  mockApiHandlers.deactivatePlugin.mockResolvedValue(createMockPlugin({ active: false }));
  mockApiHandlers.deletePlugin.mockResolvedValue(undefined);
  mockApiHandlers.getPluginSettings.mockResolvedValue({ enable_analysis: true });
  mockApiHandlers.updatePluginSettings.mockResolvedValue({ enable_analysis: false });
}
