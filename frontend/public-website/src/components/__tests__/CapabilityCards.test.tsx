import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { CapabilityCards } from '../CapabilityCards';

const capabilityTitles = [
  'Serverless Architecture',
  'Infrastructure as Code',
  'CI/CD Pipelines',
  'API Design',
  'Cloud Security',
  'Performance Optimization',
];

describe('CapabilityCards', () => {
  it('renders the section heading', () => {
    renderWithProviders(<CapabilityCards />);

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'What I Build',
      }),
    ).toBeInTheDocument();
  });

  it('renders all capability card titles', () => {
    renderWithProviders(<CapabilityCards />);

    capabilityTitles.forEach((title) => {
      expect(
        screen.getByRole('heading', {
          level: 3,
          name: title,
        }),
      ).toBeInTheDocument();
    });
  });

  it('renders a non-empty description for each capability card', () => {
    renderWithProviders(<CapabilityCards />);

    const descriptions = screen.getAllByTestId('capability-description');

    expect(descriptions).toHaveLength(capabilityTitles.length);

    descriptions.forEach((description) => {
      expect(description).toHaveTextContent(/\S/);
    });
  });

  it('uses proper heading hierarchy with h2 for the section and h3 for cards', () => {
    renderWithProviders(<CapabilityCards />);

    const sectionHeading = screen.getByRole('heading', {
      level: 2,
      name: 'What I Build',
    });

    const cardHeadings = screen.getAllByRole('heading', {
      level: 3,
    });

    expect(sectionHeading.tagName).toBe('H2');
    expect(cardHeadings).toHaveLength(capabilityTitles.length);

    cardHeadings.forEach((heading) => {
      expect(heading.tagName).toBe('H3');
      expect(capabilityTitles).toContain(heading.textContent);
    });
  });
});
