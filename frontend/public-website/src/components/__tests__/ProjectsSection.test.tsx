import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { ProjectsSection } from '../ProjectsSection';

describe('ProjectsSection', () => {
  it('renders the section heading "Recent Projects"', () => {
    renderWithProviders(<ProjectsSection />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'Recent Projects' })
    ).toHaveAttribute('id', 'projects-section-heading');
  });

  it('renders all 4 project card titles as h3', () => {
    renderWithProviders(<ProjectsSection />);

    [
      'Serverless CMS Platform',
      'Theme Engine',
      'Automation Pipeline',
      'Cloud-Native Web Experience',
    ].forEach((title) => {
      expect(
        screen.getByRole('heading', { level: 3, name: title })
      ).toBeInTheDocument();
    });
  });

  it('renders the "View All Projects" link with href="/projects"', () => {
    renderWithProviders(<ProjectsSection />);

    expect(
      screen.getByRole('link', { name: /view all projects/i })
    ).toHaveAttribute('href', '/projects');
  });

  it('renders tags as badges', () => {
    renderWithProviders(<ProjectsSection />);

    // Unique tags
    ['AWS', 'CDK', 'Python', 'GitHub Actions', 'A11y', 'SVG'].forEach((tag) => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });

    // "React" appears in two project cards
    expect(screen.getAllByText('React')).toHaveLength(2);
  });
});
