import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { HelmetProvider } from 'react-helmet-async';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { Home } from '../Home';

function renderHome() {
  return renderWithProviders(
    <HelmetProvider>
      <Home />
    </HelmetProvider>
  );
}

describe('Home', () => {
  it('renders the HeroSection with site title', () => {
    renderHome();
    expect(screen.getByRole('heading', { level: 1, name: 'Celestium' })).toBeInTheDocument();
  });

  it('renders the CapabilityCards section', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'What I Build' })).toBeInTheDocument();
  });

  it('renders the ProjectsSection heading', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Recent Projects' })).toBeInTheDocument();
  });

  it('renders the ContactSection heading', () => {
    renderHome();
    expect(screen.getByRole('heading', { name: 'Get In Touch' })).toBeInTheDocument();
  });

  it('renders with theme background class', () => {
    const { container } = renderHome();
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveClass('bg-theme-background');
  });

  it('renders the hero CTA button', () => {
    renderHome();
    expect(screen.getByRole('button', { name: /explore architecture/i })).toBeInTheDocument();
  });

  it('has proper section accessibility with aria-labelledby', () => {
    renderHome();
    // CapabilityCards section
    expect(document.getElementById('capability-cards-heading')).toBeInTheDocument();
    // ProjectsSection
    expect(document.getElementById('projects-section-heading')).toBeInTheDocument();
    // ContactSection
    expect(document.getElementById('contact-section-heading')).toBeInTheDocument();
  });

  it('renders the hero tagline "Elite Serverless Engineering"', () => {
    renderHome();
    expect(screen.getByText('Elite Serverless Engineering')).toBeInTheDocument();
  });

  it('renders capability cards with proper h3 headings', () => {
    renderHome();
    const expectedHeadings = [
      'Serverless Architecture',
      'Infrastructure as Code',
      'CI/CD Pipelines',
      'API Design',
      'Cloud Security',
      'Performance Optimization',
    ];
    const h3s = screen.getAllByRole('heading', { level: 3 });
    const h3Texts = h3s.map((h) => h.textContent);
    for (const heading of expectedHeadings) {
      expect(h3Texts).toContain(heading);
    }
  });

  it('all sections use constrained max-width to prevent horizontal overflow', () => {
    const { container } = renderHome();
    const sections = container.querySelectorAll('section');
    for (const section of sections) {
      // Each section should either have max-w-* itself or contain a child with max-w-*
      const hasMaxWidth = section.className.includes('max-w-') ||
        section.querySelector('[class*="max-w-"]') !== null;
      expect(hasMaxWidth).toBe(true);
    }
  });
});
