import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '../../test/utils/renderWithProviders';
import { ArchitectureMap } from '../ArchitectureMap/ArchitectureMap';
import { architectureMapData } from '../ArchitectureMap/data';

describe('ArchitectureMap', () => {
  const renderComponent = () =>
    renderWithProviders(
      <ArchitectureMap
        nodes={architectureMapData.nodes}
        edges={architectureMapData.edges}
        title="Architecture map"
        description="System architecture overview"
      />,
    );

  it('renders the SVG with role="img" and aria-labelledby pointing to title and desc IDs', () => {
    renderComponent();

    const svg = screen.getByRole('img');
    expect(svg.tagName.toLowerCase()).toBe('svg');

    const ariaLabelledBy = svg.getAttribute('aria-labelledby');
    expect(ariaLabelledBy).toBeTruthy();

    const ids = ariaLabelledBy!.split(' ');
    expect(ids).toHaveLength(2);

    expect(svg.querySelector(`#${ids[0]}`)?.tagName.toLowerCase()).toBe('title');
    expect(svg.querySelector(`#${ids[1]}`)?.tagName.toLowerCase()).toBe('desc');
  });

  it('renders a title element inside the SVG', () => {
    renderComponent();

    const svg = screen.getByRole('img');
    expect(svg.querySelector('title')).toBeInTheDocument();
  });

  it('renders a desc element inside the SVG', () => {
    renderComponent();

    const svg = screen.getByRole('img');
    expect(svg.querySelector('desc')).toBeInTheDocument();
  });

  it('renders all node labels from the data inside the SVG', () => {
    const { container } = renderComponent();

    const svg = container.querySelector('svg')!;
    const svgTextContent = svg.textContent ?? '';

    architectureMapData.nodes.forEach((node) => {
      // Labels may be split across tspan elements, check all words are present
      const words = node.label.split(/\s+/);
      words.forEach((word) => {
        expect(svgTextContent).toContain(word);
      });
    });
  });

  it('renders edges as path elements', () => {
    renderComponent();

    const svg = screen.getByRole('img');
    const paths = svg.querySelectorAll('path');

    expect(paths.length).toBeGreaterThanOrEqual(architectureMapData.edges.length);
  });

  it('renders a wrapper div with overflow-x-auto class', () => {
    renderComponent();

    const svg = screen.getByRole('img');
    const wrapper = svg.closest('div');

    expect(wrapper).toHaveClass('overflow-x-auto');
  });

  it('sets a minWidth style of 768 on the SVG', () => {
    renderComponent();

    const svg = screen.getByRole('img');

    expect(svg).toHaveStyle({ minWidth: '768px' });
  });

  describe('data model validation', () => {
    it('every node has a non-empty label, descriptionSimple, and descriptionTechnical', () => {
      architectureMapData.nodes.forEach((node) => {
        expect(node.label).toBeTruthy();
        expect(node.descriptionSimple).toBeTruthy();
        expect(node.descriptionTechnical).toBeTruthy();
      });
    });

    it('has at least one node defined', () => {
      expect(architectureMapData.nodes.length).toBeGreaterThan(0);
    });
  });

  it('renders the expected number of interactive nodes in the SVG', () => {
    const { container } = renderComponent();

    const nodeElements = container.querySelectorAll('[data-node-id]');
    expect(nodeElements).toHaveLength(architectureMapData.nodes.length);
  });

  describe('mode toggle', () => {
    it('renders Non-Technical and Technical toggle buttons', () => {
      renderComponent();

      expect(screen.getByRole('button', { name: 'Non-Technical' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Technical' })).toBeInTheDocument();
    });

    it('defaults to Non-Technical mode (aria-pressed=true)', () => {
      renderComponent();

      const nonTechBtn = screen.getByRole('button', { name: 'Non-Technical' });
      const techBtn = screen.getByRole('button', { name: 'Technical' });

      expect(nonTechBtn).toHaveAttribute('aria-pressed', 'true');
      expect(techBtn).toHaveAttribute('aria-pressed', 'false');
    });

    it('switches mode when Technical button is clicked', () => {
      renderComponent();

      const techBtn = screen.getByRole('button', { name: 'Technical' });
      fireEvent.click(techBtn);

      expect(techBtn).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Non-Technical' })).toHaveAttribute('aria-pressed', 'false');
    });
  });

  describe('tooltip', () => {
    it('shows tooltip with node description on click', () => {
      const { container } = renderComponent();

      // Click the first node (Client Browser)
      const nodeElement = container.querySelector('[data-node-id="client"]');
      expect(nodeElement).toBeInTheDocument();
      fireEvent.click(nodeElement!);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toBeInTheDocument();
      expect(tooltip).toHaveTextContent('Client Browser');
      expect(tooltip).toHaveTextContent(architectureMapData.nodes[0].descriptionSimple);
    });

    it('shows technical description when in technical mode', () => {
      const { container } = renderComponent();

      // Switch to technical mode
      fireEvent.click(screen.getByRole('button', { name: 'Technical' }));

      // Click a node
      const nodeElement = container.querySelector('[data-node-id="client"]');
      fireEvent.click(nodeElement!);

      const tooltip = screen.getByRole('tooltip');
      expect(tooltip).toHaveTextContent(architectureMapData.nodes[0].descriptionTechnical);
    });

    it('dismisses tooltip when clicking the same node again', () => {
      const { container } = renderComponent();

      const nodeElement = container.querySelector('[data-node-id="client"]');
      fireEvent.click(nodeElement!);
      expect(screen.getByRole('tooltip')).toBeInTheDocument();

      fireEvent.click(nodeElement!);
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('screen reader fallback', () => {
    it('renders a visually hidden section with node descriptions for screen readers', () => {
      renderComponent();

      const fallback = screen.getByRole('region', { name: /architecture map node descriptions/i });
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveClass('sr-only');
    });

    it('lists all nodes in the screen reader fallback', () => {
      renderComponent();

      const fallback = screen.getByRole('region', { name: /architecture map node descriptions/i });

      architectureMapData.nodes.forEach((node) => {
        expect(fallback).toHaveTextContent(node.label);
      });
    });
  });

  describe('node accessibility', () => {
    it('nodes have role="button" and aria-label with description', () => {
      const { container } = renderComponent();

      const nodeElement = container.querySelector('[data-node-id="client"]');
      expect(nodeElement).toHaveAttribute('role', 'button');
      expect(nodeElement).toHaveAttribute('aria-label');

      const ariaLabel = nodeElement!.getAttribute('aria-label')!;
      expect(ariaLabel).toContain('Client Browser');
      expect(ariaLabel).toContain(architectureMapData.nodes[0].descriptionSimple);
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown moves focus to next node', () => {
      const { container } = renderComponent();

      const firstNode = container.querySelector('[data-node-id="client"]') as HTMLElement;
      firstNode.focus();

      fireEvent.keyDown(firstNode, { key: 'ArrowDown' });

      const secondNodeId = architectureMapData.nodes[1].id;
      const secondNode = container.querySelector(`[data-node-id="${secondNodeId}"]`);
      expect(document.activeElement).toBe(secondNode);
    });

    it('ArrowRight moves focus to next node', () => {
      const { container } = renderComponent();

      const firstNode = container.querySelector('[data-node-id="client"]') as HTMLElement;
      firstNode.focus();

      fireEvent.keyDown(firstNode, { key: 'ArrowRight' });

      const secondNodeId = architectureMapData.nodes[1].id;
      const secondNode = container.querySelector(`[data-node-id="${secondNodeId}"]`);
      expect(document.activeElement).toBe(secondNode);
    });

    it('ArrowUp moves focus to previous node', () => {
      const { container } = renderComponent();

      const secondNodeId = architectureMapData.nodes[1].id;
      const secondNode = container.querySelector(`[data-node-id="${secondNodeId}"]`) as HTMLElement;
      secondNode.focus();

      fireEvent.keyDown(secondNode, { key: 'ArrowUp' });

      const firstNode = container.querySelector('[data-node-id="client"]');
      expect(document.activeElement).toBe(firstNode);
    });

    it('ArrowLeft moves focus to previous node', () => {
      const { container } = renderComponent();

      const secondNodeId = architectureMapData.nodes[1].id;
      const secondNode = container.querySelector(`[data-node-id="${secondNodeId}"]`) as HTMLElement;
      secondNode.focus();

      fireEvent.keyDown(secondNode, { key: 'ArrowLeft' });

      const firstNode = container.querySelector('[data-node-id="client"]');
      expect(document.activeElement).toBe(firstNode);
    });

    it('ArrowDown wraps from last node to first', () => {
      const { container } = renderComponent();

      const lastNodeId = architectureMapData.nodes[architectureMapData.nodes.length - 1].id;
      const lastNode = container.querySelector(`[data-node-id="${lastNodeId}"]`) as HTMLElement;
      lastNode.focus();

      fireEvent.keyDown(lastNode, { key: 'ArrowDown' });

      const firstNode = container.querySelector('[data-node-id="client"]');
      expect(document.activeElement).toBe(firstNode);
    });

    it('ArrowUp wraps from first node to last', () => {
      const { container } = renderComponent();

      const firstNode = container.querySelector('[data-node-id="client"]') as HTMLElement;
      firstNode.focus();

      fireEvent.keyDown(firstNode, { key: 'ArrowUp' });

      const lastNodeId = architectureMapData.nodes[architectureMapData.nodes.length - 1].id;
      const lastNode = container.querySelector(`[data-node-id="${lastNodeId}"]`);
      expect(document.activeElement).toBe(lastNode);
    });
  });
});
