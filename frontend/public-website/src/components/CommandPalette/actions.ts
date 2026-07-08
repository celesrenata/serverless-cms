import type { NavigateFunction } from 'react-router-dom';

export type { NavigateFunction };

export interface PaletteAction {
  id: string;
  title: string;
  keywords: string[];
  category: 'navigation' | 'theme' | 'action';
  icon?: string;
  shortcut?: string;
  execute: () => void;
}

const scrollToElement = (id: string): void => {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

export function createPaletteActions(
  navigate: NavigateFunction,
  setTheme: (id: string) => void,
  openThemePanel: () => void,
): PaletteAction[] {
  return [
    {
      id: 'navigate-home',
      title: 'Go to Home',
      keywords: ['home', 'landing', 'main', 'index', 'start'],
      category: 'navigation',
      icon: 'home',
      shortcut: 'G H',
      execute: () => navigate('/'),
    },
    {
      id: 'navigate-blog',
      title: 'Go to Blog',
      keywords: ['blog', 'posts', 'articles', 'writing', 'journal'],
      category: 'navigation',
      icon: 'blog',
      shortcut: 'G B',
      execute: () => navigate('/blog'),
    },
    {
      id: 'navigate-gallery',
      title: 'Go to Gallery',
      keywords: ['gallery', 'images', 'photos', 'visuals', 'art'],
      category: 'navigation',
      icon: 'gallery',
      shortcut: 'G G',
      execute: () => navigate('/gallery'),
    },
    {
      id: 'navigate-projects',
      title: 'Go to Projects',
      keywords: ['projects', 'work', 'portfolio', 'builds', 'apps'],
      category: 'navigation',
      icon: 'projects',
      shortcut: 'G P',
      execute: () => navigate('/projects'),
    },
    {
      id: 'theme-celestium-neon',
      title: 'Switch to Celestium Neon',
      keywords: ['theme', 'celestium', 'neon', 'glow', 'bright', 'cyberpunk'],
      category: 'theme',
      icon: 'theme',
      execute: () => setTheme('celestium-neon'),
    },
    {
      id: 'theme-aws-console-after-dark',
      title: 'Switch to AWS Console After Dark',
      keywords: ['theme', 'aws', 'console', 'dark', 'cloud', 'terminal'],
      category: 'theme',
      icon: 'theme',
      execute: () => setTheme('aws-console-after-dark'),
    },
    {
      id: 'theme-glass-circuit',
      title: 'Switch to Glass Circuit',
      keywords: ['theme', 'glass', 'circuit', 'transparent', 'frosted', 'tech'],
      category: 'theme',
      icon: 'theme',
      execute: () => setTheme('glass-circuit'),
    },
    {
      id: 'theme-paper-systems',
      title: 'Switch to Paper Systems',
      keywords: ['theme', 'paper', 'systems', 'light', 'clean', 'minimal'],
      category: 'theme',
      icon: 'theme',
      execute: () => setTheme('paper-systems'),
    },
    {
      id: 'theme-terminal-witchcraft',
      title: 'Switch to Terminal Witchcraft',
      keywords: ['theme', 'terminal', 'witchcraft', 'magic', 'cli', 'dark'],
      category: 'theme',
      icon: 'theme',
      execute: () => setTheme('terminal-witchcraft'),
    },
    {
      id: 'scroll-architecture-map',
      title: 'Scroll to Architecture Map',
      keywords: ['architecture', 'map', 'diagram', 'system', 'structure', 'scroll'],
      category: 'action',
      icon: 'scroll',
      execute: () => scrollToElement('architecture-map'),
    },
    {
      id: 'scroll-capabilities',
      title: 'Scroll to Capabilities',
      keywords: ['capabilities', 'features', 'skills', 'abilities', 'services', 'scroll'],
      category: 'action',
      icon: 'scroll',
      execute: () => scrollToElement('capabilities'),
    },
    {
      id: 'open-theme-panel',
      title: 'Open Theme Panel',
      keywords: ['theme', 'panel', 'settings', 'appearance', 'customize', 'palette'],
      category: 'action',
      icon: 'palette',
      shortcut: '⌘⇧T',
      execute: () => openThemePanel(),
    },
  ];
}
