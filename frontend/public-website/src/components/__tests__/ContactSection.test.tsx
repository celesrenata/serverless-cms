import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ContactSection } from '../ContactSection';
import { renderWithProviders } from '../../test/utils/renderWithProviders';

describe('ContactSection', () => {
  it('renders the section heading', () => {
    renderWithProviders(<ContactSection />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Get In Touch' }),
    ).toBeInTheDocument();
  });

  it('renders all 5 contact link labels as visible text', () => {
    renderWithProviders(<ContactSection />);

    ['GitHub', 'LinkedIn', 'Email', 'Twitter / X', 'Blog'].forEach((label) => {
      expect(screen.getByText(label)).toBeVisible();
    });
  });

  it('external links have target blank and noopener noreferrer', () => {
    renderWithProviders(<ContactSection />);

    const allLinks = screen.getAllByRole('link');
    const externalLinks = allLinks.filter(
      (el) => el.getAttribute('href')?.startsWith('http'),
    );

    expect(externalLinks.length).toBe(4);
    externalLinks.forEach((link) => {
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  it('email link does not have target blank', () => {
    renderWithProviders(<ContactSection />);

    const allLinks = screen.getAllByRole('link');
    const emailLink = allLinks.find((el) =>
      el.getAttribute('href')?.startsWith('mailto:'),
    );

    expect(emailLink).toBeDefined();
    expect(emailLink).not.toHaveAttribute('target');
  });

  it('all icons are hidden from assistive tech', () => {
    const { container } = renderWithProviders(<ContactSection />);

    const icons = container.querySelectorAll('svg');

    expect(icons.length).toBe(5);
    icons.forEach((icon) => {
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });
  });

  it('section has correct aria-labelledby attribute', () => {
    renderWithProviders(<ContactSection />);

    const section = screen.getByRole('region', { name: 'Get In Touch' });

    expect(section).toHaveAttribute('aria-labelledby', 'contact-section-heading');
  });
});
