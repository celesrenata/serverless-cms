import { useCallback, useRef, useState } from 'react';
import { validateCSSUpload } from '../../lib/cssValidator';
import { useTheme } from '../../theme/ThemeProvider';

type Status = 'idle' | 'validating' | 'valid' | 'error';

type ValidationError = {
  line?: number;
  column?: number;
  message: string;
};

export default function CSSUploadControl(): JSX.Element {
  const { previewCSS } = useTheme();

  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [fileName, setFileName] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const handleChooseFile = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, []);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];

      if (!file) {
        setStatus('idle');
        setFileName('');
        setErrors([]);
        return;
      }

      setStatus('validating');
      setFileName(file.name);
      setErrors([]);

      const reader = new FileReader();

      reader.onload = () => {
        const content = String(reader.result ?? '');
        const result = validateCSSUpload(content, file.name, file.type);

        if (result.valid) {
          previewCSS(content);
          setErrors([]);
          setStatus('valid');
        } else {
          setErrors(result.errors);
          setStatus('error');
        }
      };

      reader.onerror = () => {
        setErrors([{ message: 'Unable to read the selected file.' }]);
        setStatus('error');
      };

      reader.readAsText(file);
    },
    [previewCSS],
  );

  const statusText =
    status === 'validating'
      ? 'Validating...'
      : status === 'valid'
        ? '✓ Valid — Preview active'
        : status === 'error'
          ? '✗ Errors found'
          : 'No file selected';

  return (
    <div className="w-full rounded-lg border border-theme-border bg-theme-surface p-3">
      <input
        ref={inputRef}
        type="file"
        accept=".css,text/css"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleChooseFile}
          disabled={status === 'validating'}
          className="rounded-lg bg-theme-primary px-3 py-2 text-sm font-medium text-theme-text-inverse hover:bg-theme-primary-hover focus:outline-none focus:ring-2 focus:ring-theme-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Choose file
        </button>

        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-theme-text">
            {fileName || 'No CSS file chosen'}
          </div>
          <div
            className="text-xs text-theme-text-muted"
            aria-live="polite"
            role="status"
          >
            {statusText}
          </div>
        </div>
      </div>

      {status === 'error' && errors.length > 0 && (
        <ul className="mt-2 max-h-24 space-y-1 overflow-auto rounded-lg bg-theme-surface-alt p-2 text-xs text-theme-text">
          {errors.map((error, index) => (
            <li key={`${error.line ?? 'x'}-${error.column ?? 'x'}-${index}`}>
              {typeof error.line === 'number' && (
                <span className="font-medium">
                  Line {error.line}
                  {typeof error.column === 'number' ? `, Col ${error.column}` : ''}
                  {': '}
                </span>
              )}
              <span>{error.message}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
