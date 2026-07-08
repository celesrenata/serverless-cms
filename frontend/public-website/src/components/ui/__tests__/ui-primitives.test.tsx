import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button, Card, Badge, Input, Tooltip, Dialog } from '../index';

import ButtonSrc from '../Button.tsx?raw';
import CardSrc from '../Card.tsx?raw';
import BadgeSrc from '../Badge.tsx?raw';
import InputSrc from '../Input.tsx?raw';
import TooltipSrc from '../Tooltip.tsx?raw';
import DialogSrc from '../Dialog.tsx?raw';

describe('Button', () => {
  it('renders with an accessible name', () => {
    render(<Button>Save changes</Button>);

    expect(
      screen.getByRole('button', { name: /save changes/i }),
    ).toBeInTheDocument();
  });

  it('calls the click handler when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(<Button onClick={handleClick}>Submit</Button>);

    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call the click handler when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();

    render(
      <Button disabled onClick={handleClick}>
        Disabled action
      </Button>,
    );

    const button = screen.getByRole('button', { name: /disabled action/i });

    expect(button).toBeDisabled();

    await user.click(button);

    expect(handleClick).not.toHaveBeenCalled();
  });

  it('includes accessible focus ring classes', () => {
    render(<Button>Focusable button</Button>);

    const button = screen.getByRole('button', { name: /focusable button/i });

    expect(button.className).toContain('focus:ring-2');
    expect(button.className).toContain('focus:ring-theme-primary');
    expect(button.className).toContain('focus:ring-offset-2');
  });

  it('includes disabled state utility classes when disabled', () => {
    render(<Button disabled>Disabled styling</Button>);

    const button = screen.getByRole('button', { name: /disabled styling/i });

    expect(button.className).toContain('disabled:opacity-50');
    expect(button.className).toContain('disabled:cursor-not-allowed');
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(
      <Card>
        <p>Card body content</p>
      </Card>,
    );

    expect(screen.getByText(/card body content/i)).toBeInTheDocument();
  });

  it('renders a string header as an h3', () => {
    render(<Card header="Account summary">Summary content</Card>);

    expect(
      screen.getByRole('heading', { level: 3, name: /account summary/i }),
    ).toBeInTheDocument();
  });

  it('renders a React node header', () => {
    render(
      <Card header={<span data-testid="custom-header">Custom header</span>}>
        Custom header content
      </Card>,
    );

    expect(screen.getByTestId('custom-header')).toHaveTextContent(/custom header/i);
    expect(screen.getByText(/custom header content/i)).toBeInTheDocument();
  });

  it('uses theme surface, border, text, and shadow classes', () => {
    const { container } = render(<Card>Themed card</Card>);

    const card = container.firstElementChild;

    expect(card?.className).toContain('bg-theme-surface');
    expect(card?.className).toContain('border-theme-border');
    expect(card?.className).toContain('text-theme-text');
    expect(card?.className).toContain('shadow-sm');
  });
});

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Published</Badge>);

    expect(screen.getByText(/published/i)).toBeInTheDocument();
  });

  it.each([
    ['primary', 'theme-primary'],
    ['success', 'theme-success'],
    ['warning', 'theme-warning'],
    ['error', 'theme-error'],
    ['info', 'theme-info'],
  ] as const)('applies %s variant styling classes', (variant, token) => {
    render(<Badge variant={variant}>{variant} badge</Badge>);

    const badge = screen.getByText(new RegExp(`${variant} badge`, 'i'));

    expect(badge.className).toContain(token);
  });

  it('applies theme-token styling for the default variant', () => {
    render(<Badge variant="default">Default badge</Badge>);

    const badge = screen.getByText(/default badge/i);

    expect(badge.className).toContain('theme-');
  });
});

describe('Input', () => {
  it('renders an accessible label associated with the input', () => {
    render(<Input label="Email address" />);

    const input = screen.getByLabelText(/email address/i);

    expect(input).toBeInTheDocument();
  });

  it('accepts user input when enabled', async () => {
    const user = userEvent.setup();

    render(<Input label="Username" />);

    const input = screen.getByLabelText(/username/i);

    await user.type(input, 'ada');

    expect(input).toHaveValue('ada');
  });

  it('shows an error message with role alert and marks the input invalid', () => {
    render(<Input label="Password" error="Password is required" />);

    const input = screen.getByLabelText(/password/i);
    const alert = screen.getByRole('alert');

    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(alert).toHaveTextContent(/password is required/i);
  });

  it('prevents interaction when disabled', () => {
    render(<Input label="Disabled input" disabled />);

    const input = screen.getByLabelText(/disabled input/i);

    expect(input).toBeDisabled();
  });

  it('includes disabled state utility classes', () => {
    render(<Input label="Disabled styles" disabled />);

    const input = screen.getByLabelText(/disabled styles/i);

    expect(input.className).toContain('disabled:opacity-50');
    expect(input.className).toContain('disabled:cursor-not-allowed');
  });
});

describe('Tooltip', () => {
  it('links the trigger to the tooltip content with aria-describedby', () => {
    render(<Tooltip text="Helpful tooltip">Tooltip trigger</Tooltip>);

    const trigger = screen.getByText(/tooltip trigger/i).closest('[aria-describedby]')!;
    const tooltip = screen.getByRole('tooltip', { hidden: true });

    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip).toHaveTextContent(/helpful tooltip/i);
  });

  it('is hidden initially', () => {
    render(<Tooltip text="Initially hidden">Hidden trigger</Tooltip>);

    const tooltip = screen.getByRole('tooltip', { hidden: true });

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });

  it('shows on focus', async () => {
    const user = userEvent.setup();

    render(<Tooltip text="Focused tooltip">Focusable trigger</Tooltip>);

    await user.tab();

    const tooltip = screen.getByRole('tooltip');

    expect(tooltip).toHaveTextContent(/focused tooltip/i);
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');
  });

  it('hides when Escape is pressed', async () => {
    const user = userEvent.setup();

    render(<Tooltip text="Dismissible tooltip">Dismiss trigger</Tooltip>);

    // Tab to the trigger to show the tooltip
    await user.tab();

    const tooltip = screen.getByRole('tooltip', { hidden: true });
    expect(tooltip).toHaveAttribute('aria-hidden', 'false');

    await user.keyboard('{Escape}');

    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('Dialog', () => {
  it('does not render when closed', () => {
    render(
      <Dialog isOpen={false} onClose={vi.fn()} title="Closed dialog">
        Closed content
      </Dialog>,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders when open with accessible dialog semantics', () => {
    render(
      <Dialog isOpen onClose={vi.fn()} title="Settings">
        Dialog content
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent(/dialog content/i);
  });

  it('has aria-labelledby linking to the title', () => {
    render(
      <Dialog isOpen onClose={vi.fn()} title="Labelled dialog">
        Content
      </Dialog>,
    );

    const dialog = screen.getByRole('dialog');
    const labelledById = dialog.getAttribute('aria-labelledby');
    const title = document.getElementById(labelledById!);

    expect(title).toHaveTextContent(/labelled dialog/i);
  });

  it('closes when Escape is pressed', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Dialog isOpen onClose={handleClose} title="Escape dialog">
        Escape content
      </Dialog>,
    );

    await user.keyboard('{Escape}');

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('has a close button that calls onClose', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <Dialog isOpen onClose={handleClose} title="Closable">
        Content
      </Dialog>,
    );

    await user.click(
      within(screen.getByRole('dialog')).getByLabelText(/close dialog/i),
    );

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('traps focus within the dialog', async () => {
    const user = userEvent.setup();

    render(
      <>
        <button type="button">Outside before</button>
        <Dialog isOpen onClose={vi.fn()} title="Trap dialog">
          <button type="button">First action</button>
          <button type="button">Second action</button>
        </Dialog>
        <button type="button">Outside after</button>
      </>,
    );

    const dialog = screen.getByRole('dialog');
    const focusableButtons = within(dialog).getAllByRole('button');
    const lastFocusable = focusableButtons[focusableButtons.length - 1];

    lastFocusable.focus();
    expect(lastFocusable).toHaveFocus();

    await user.tab();

    // Focus should wrap to the first focusable in the dialog, not escape
    expect(dialog).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: /outside after/i })).not.toHaveFocus();
  });
});

describe('Token-based styling (no hardcoded colors)', () => {
  const sources: Record<string, string> = {
    Button: ButtonSrc,
    Card: CardSrc,
    Badge: BadgeSrc,
    Input: InputSrc,
    Tooltip: TooltipSrc,
    Dialog: DialogSrc,
  };

  const hexPattern = /#[0-9a-fA-F]{3,8}\b/;
  const rgbPattern = /\brgba?\s*\(/;

  Object.entries(sources).forEach(([name, src]) => {
    it(`${name} does not use hardcoded hex colors`, () => {
      expect(src).not.toMatch(hexPattern);
    });

    it(`${name} does not use hardcoded rgb/rgba colors`, () => {
      expect(src).not.toMatch(rgbPattern);
    });
  });
});
