import React, { useState, useEffect, useRef } from 'react';

interface CommentFormProps {
  onSubmit: (data: {
    author_name: string;
    author_email: string;
    comment_text: string;
    parent_id?: string;
  }) => Promise<void>;
  parentId?: string;
  onCancel?: () => void;
  captchaEnabled?: boolean;
}

// Extend Window interface for AWS WAF CAPTCHA
declare global {
  interface Window {
    AwsWafCaptcha?: {
      renderCaptcha: (container: HTMLElement, config: {
        apiKey: string;
        onSuccess: (token: string) => void;
        onError: (error: Error) => void;
      }) => void;
    };
  }
}

export const CommentForm: React.FC<CommentFormProps> = ({ 
  onSubmit, 
  parentId, 
  onCancel,
  captchaEnabled = false 
}) => {
  const [authorName, setAuthorName] = useState('');
  const [authorEmail, setAuthorEmail] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load AWS WAF CAPTCHA SDK if CAPTCHA is enabled
    if (captchaEnabled && !window.AwsWafCaptcha) {
      const captchaScriptUrl = import.meta.env.VITE_CAPTCHA_SCRIPT_URL;
      if (!captchaScriptUrl) {
        console.error('CAPTCHA is enabled but VITE_CAPTCHA_SCRIPT_URL is not configured');
        setError('CAPTCHA configuration error. Please contact the site administrator.');
        return;
      }

      const script = document.createElement('script');
      script.src = captchaScriptUrl;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);

      return () => {
        document.head.removeChild(script);
      };
    }
  }, [captchaEnabled]);

  useEffect(() => {
    // Render CAPTCHA widget when SDK is loaded
    if (captchaEnabled && window.AwsWafCaptcha && captchaContainerRef.current) {
      const captchaApiKey = import.meta.env.VITE_CAPTCHA_API_KEY;
      if (!captchaApiKey) {
        console.error('CAPTCHA is enabled but VITE_CAPTCHA_API_KEY is not configured');
        setError('CAPTCHA configuration error. Please contact the site administrator.');
        return;
      }

      try {
        window.AwsWafCaptcha.renderCaptcha(captchaContainerRef.current, {
          apiKey: captchaApiKey,
          onSuccess: (token: string) => {
            setCaptchaToken(token);
            setError(null); // Clear any previous errors
          },
          onError: (error: Error) => {
            console.error('CAPTCHA error:', error);
            setError('CAPTCHA verification failed. Please try again.');
          },
        });
      } catch (err) {
        console.error('Failed to render CAPTCHA:', err);
        setError('Failed to load CAPTCHA. Please refresh the page and try again.');
      }
    }
  }, [captchaEnabled]);

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!authorName.trim()) {
      setError('Name is required');
      return;
    }
    if (!authorEmail.trim()) {
      setError('Email is required');
      return;
    }
    if (!validateEmail(authorEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    if (!commentText.trim()) {
      setError('Comment text is required');
      return;
    }
    if (commentText.length > 5000) {
      setError('Comment must be less than 5000 characters');
      return;
    }

    // Check CAPTCHA if enabled
    if (captchaEnabled && !captchaToken) {
      setError('Please complete the CAPTCHA verification');
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        author_name: authorName.trim(),
        author_email: authorEmail.trim(),
        comment_text: commentText.trim(),
        parent_id: parentId,
      });
      
      // Reset form
      setAuthorName('');
      setAuthorEmail('');
      setCommentText('');
      setCaptchaToken(null);
      
      if (onCancel) {
        onCancel();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit comment');
      // Reset CAPTCHA on error
      if (captchaEnabled) {
        setCaptchaToken(null);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      {parentId && (
        <div className="reply-indicator">
          <p>Replying to comment</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="author_name">Name *</label>
        <input
          type="text"
          id="author_name"
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          maxLength={100}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="author_email">Email * (will not be published)</label>
        <input
          type="email"
          id="author_email"
          value={authorEmail}
          onChange={(e) => setAuthorEmail(e.target.value)}
          maxLength={255}
          required
          disabled={submitting}
        />
      </div>

      <div className="form-group">
        <label htmlFor="comment_text">Comment *</label>
        <textarea
          id="comment_text"
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          maxLength={5000}
          rows={5}
          required
          disabled={submitting}
        />
        <small>{commentText.length} / 5000 characters</small>
      </div>

      {captchaEnabled && (
        <div className="form-group">
          <div ref={captchaContainerRef} className="captcha-container" />
        </div>
      )}

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit Comment'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>

      <p className="form-note">
        Your comment will be reviewed before being published.
      </p>
    </form>
  );
};
