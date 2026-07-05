import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommentForm } from '../CommentForm';

describe('CommentForm', () => {
  let mockOnSubmit: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnSubmit = vi.fn();
  });

  /**
   * Helper to disable native HTML5 form validation so the component's
   * own JS validation logic (which sets state-based error messages) can run.
   */
  function disableNativeValidation() {
    const form = document.querySelector('form');
    if (form) form.setAttribute('novalidate', '');
  }

  it('renders name, email, comment text fields and submit button', () => {
    render(<CommentForm onSubmit={mockOnSubmit} />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/comment/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /submit comment/i })).toBeInTheDocument();
  });

  it('shows validation error when submitting with empty name', async () => {
    const user = userEvent.setup();

    render(<CommentForm onSubmit={mockOnSubmit} />);
    disableNativeValidation();

    await user.click(screen.getByRole('button', { name: /submit comment/i }));

    expect(screen.getByText('Name is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for invalid email format', async () => {
    const user = userEvent.setup();

    render(<CommentForm onSubmit={mockOnSubmit} />);
    disableNativeValidation();

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'invalid-email');
    await user.type(screen.getByLabelText(/comment/i), 'This is a comment.');
    await user.click(screen.getByRole('button', { name: /submit comment/i }));

    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for empty comment', async () => {
    const user = userEvent.setup();

    render(<CommentForm onSubmit={mockOnSubmit} />);
    disableNativeValidation();

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: /submit comment/i }));

    expect(screen.getByText('Comment text is required')).toBeInTheDocument();
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('valid submission calls onSubmit with correct data and resets form fields', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(<CommentForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/comment/i), 'This is a comment.');
    await user.click(screen.getByRole('button', { name: /submit comment/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        author_name: 'Jane Doe',
        author_email: 'jane@example.com',
        comment_text: 'This is a comment.',
        parent_id: undefined,
      });
    });

    await waitFor(() => {
      expect((screen.getByLabelText(/name/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/email/i) as HTMLInputElement).value).toBe('');
      expect((screen.getByLabelText(/comment/i) as HTMLTextAreaElement).value).toBe('');
    });
  });

  it('shows error message when onSubmit rejects with an Error', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockRejectedValue(new Error('Server error'));

    render(<CommentForm onSubmit={mockOnSubmit} />);

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe');
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com');
    await user.type(screen.getByLabelText(/comment/i), 'This is a comment.');
    await user.click(screen.getByRole('button', { name: /submit comment/i }));

    await waitFor(() => {
      expect(screen.getByText('Server error')).toBeInTheDocument();
    });
  });
});
