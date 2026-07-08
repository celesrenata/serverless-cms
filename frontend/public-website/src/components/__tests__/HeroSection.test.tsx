import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { HeroSection } from '../HeroSection';

describe('HeroSection', () => {
  it('renders site title "Celestium"', () => {
    renderWithProviders(<HeroSection />);
    expect(screen.getByRole('heading', { level: 1, name: /celestium/i })).toBeInTheDocument();
  });

  it('renders tagline text', () => {
    renderWithProviders(<HeroSection />);
    expect(screen.getByText(/elite serverless engineering/i)).toBeInTheDocument();
  });

  it('renders primary CTA button', () => {
    renderWithProviders(<HeroSection />);
    expect(screen.getByRole('button', { name: /explore architecture/i })).toBeInTheDocument();
  });

  it('renders meaningful content in initial HTML (not JS-only)', () => {
    renderWithProviders(<HeroSection />);
    // All critical text is in the DOM
    expect(screen.getByText(/celestium/i)).toBeInTheDocument();
    expect(screen.getByText(/resilient, scalable/i)).toBeInTheDocument();
  });

  it('has a background pattern element with aria-hidden', () => {
    const { container } = renderWithProviders(<HeroSection />);
    const pattern = container.querySelector('.hero-grid-pattern');
    expect(pattern).toBeInTheDocument();
    expect(pattern).toHaveAttribute('aria-hidden', 'true');
  });

  it('uses full viewport height', () => {
    const { container } = renderWithProviders(<HeroSection />);
    const section = container.querySelector('section');
    expect(section?.className).toContain('min-h-screen');
  });
});
