"""
Builtin theme definitions.

These themes are shipped with the application and returned from code constants.
They cannot be modified or deleted. They don't live in DynamoDB.
"""

from typing import Dict, Any, List, Optional


BUILTIN_THEMES: Dict[str, Dict[str, Any]] = {
    'celestium-neon': {
        'id': 'celestium-neon',
        'name': 'Celestium Neon',
        'description': 'Dark cyberpunk aesthetic with neon accents and glow effects',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '139 92 246',
                'primaryHover': '124 58 237',
                'secondary': '236 72 153',
                'background': '3 7 18',
                'backgroundAlt': '15 23 42',
                'surface': '30 41 59',
                'surfaceAlt': '51 65 85',
                'text': '248 250 252',
                'textMuted': '148 163 184',
                'textInverse': '15 23 42',
                'border': '71 85 105',
                'borderLight': '100 116 139',
                'accent': '34 211 238',
                'success': '52 211 153',
                'warning': '251 191 36',
                'error': '248 113 113',
                'info': '96 165 250',
            },
            'typography': {
                'fontFamily': '"Inter", system-ui, sans-serif',
                'fontFamilyMono': '"JetBrains Mono", "Fira Code", monospace',
                'fontSizeBase': '1rem',
                'fontSizeScale': 1.25,
                'lineHeight': '1.6',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0.375rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 3px rgba(139, 92, 246, 0.1)',
                'md': '0 4px 12px rgba(139, 92, 246, 0.15)',
                'lg': '0 12px 40px rgba(139, 92, 246, 0.2)',
                'glow': '0 0 20px rgba(139, 92, 246, 0.4)',
            },
            'motion': {
                'durationFast': '150ms',
                'durationNormal': '300ms',
                'durationSlow': '600ms',
                'easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'grid',
                'opacity': 0.05,
                'color': 'rgba(139, 92, 246, 0.3)',
            },
        },
    },
    'celestium-bromide': {
        'id': 'celestium-bromide',
        'name': 'Celestium Bromide',
        'description': 'Pure-black dark theme with electric purple accents, serif headings, and subtle texture inspired by celestium.life',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '130 36 227',
                'primaryHover': '149 65 237',
                'secondary': '171 113 245',
                'background': '0 0 0',
                'backgroundAlt': '8 8 12',
                'surface': '14 14 20',
                'surfaceAlt': '22 22 30',
                'text': '230 230 230',
                'textMuted': '180 180 190',
                'textInverse': '0 0 0',
                'border': '50 40 65',
                'borderLight': '38 30 50',
                'accent': '171 113 245',
                'success': '52 211 153',
                'warning': '251 191 36',
                'error': '248 113 113',
                'info': '141 162 251',
            },
            'typography': {
                'fontFamily': '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                'fontFamilyMono': '"JetBrains Mono", "Fira Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontSizeBase': '1.125rem',
                'fontSizeScale': 1.25,
                'lineHeight': '1.75',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0.25rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 3px rgba(0, 0, 0, 0.5)',
                'md': '0 8px 24px rgba(0, 0, 0, 0.6)',
                'lg': '0 20px 48px rgba(0, 0, 0, 0.7)',
                'glow': '0 0 24px rgba(130, 36, 227, 0.3)',
            },
            'motion': {
                'durationFast': '120ms',
                'durationNormal': '200ms',
                'durationSlow': '320ms',
                'easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'dots',
                'opacity': 0.04,
                'color': 'rgba(130, 36, 227, 0.15)',
            },
        },
    },
    'aws-console-after-dark': {
        'id': 'aws-console-after-dark',
        'name': 'AWS Console After Dark',
        'description': 'Professional dark interface inspired by cloud consoles with subdued amber accents and clean typography',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '245 158 11',
                'primaryHover': '251 191 36',
                'secondary': '148 163 184',
                'background': '11 18 32',
                'backgroundAlt': '15 23 42',
                'surface': '17 24 39',
                'surfaceAlt': '30 41 59',
                'text': '243 244 246',
                'textMuted': '203 213 225',
                'textInverse': '15 23 42',
                'border': '71 85 105',
                'borderLight': '51 65 85',
                'accent': '251 146 60',
                'success': '52 211 153',
                'warning': '251 191 36',
                'error': '248 113 113',
                'info': '56 189 248',
            },
            'typography': {
                'fontFamily': '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                'fontFamilyMono': '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontSizeBase': '1rem',
                'fontSizeScale': 1.2,
                'lineHeight': '1.5',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0.25rem',
                'md': '0.5rem',
                'lg': '0.75rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 2px rgba(0, 0, 0, 0.35)',
                'md': '0 8px 24px rgba(0, 0, 0, 0.32)',
                'lg': '0 18px 48px rgba(0, 0, 0, 0.38)',
                'glow': '0 0 28px rgba(245, 158, 11, 0.22)',
            },
            'motion': {
                'durationFast': '120ms',
                'durationNormal': '200ms',
                'durationSlow': '320ms',
                'easing': 'cubic-bezier(0.2, 0, 0, 1)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'dots',
                'opacity': 0.08,
                'color': 'rgba(245, 158, 11, 0.2)',
            },
        },
    },
    'glass-circuit': {
        'id': 'glass-circuit',
        'name': 'Glass Circuit',
        'description': 'Translucent panels with backdrop blur effects, circuit-grid background patterns, and frosted glass borders',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '45 212 191',
                'primaryHover': '94 234 212',
                'secondary': '96 165 250',
                'background': '5 15 25',
                'backgroundAlt': '8 25 40',
                'surface': '15 40 55',
                'surfaceAlt': '22 58 76',
                'text': '236 254 255',
                'textMuted': '174 219 224',
                'textInverse': '6 24 32',
                'border': '56 189 248',
                'borderLight': '34 211 238',
                'accent': '34 211 238',
                'success': '52 211 153',
                'warning': '250 204 21',
                'error': '251 113 133',
                'info': '125 211 252',
            },
            'typography': {
                'fontFamily': '"Inter", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                'fontFamilyMono': '"Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontSizeBase': '1rem',
                'fontSizeScale': 1.22,
                'lineHeight': '1.55',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0.375rem',
                'md': '0.75rem',
                'lg': '1rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 3px rgba(0, 0, 0, 0.35)',
                'md': '0 10px 30px rgba(0, 0, 0, 0.35)',
                'lg': '0 24px 64px rgba(0, 0, 0, 0.42)',
                'glow': '0 0 32px rgba(45, 212, 191, 0.3)',
            },
            'motion': {
                'durationFast': '140ms',
                'durationNormal': '240ms',
                'durationSlow': '420ms',
                'easing': 'cubic-bezier(0.16, 1, 0.3, 1)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'circuit',
                'opacity': 0.11,
                'color': 'rgba(34, 211, 238, 0.3)',
            },
        },
    },
    'paper-systems': {
        'id': 'paper-systems',
        'name': 'Paper Systems',
        'description': 'Light technical-document aesthetic with serif typography, paper-texture backgrounds, and minimal color',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '30 64 120',
                'primaryHover': '23 49 95',
                'secondary': '91 77 61',
                'background': '251 247 237',
                'backgroundAlt': '246 240 226',
                'surface': '255 252 245',
                'surfaceAlt': '241 235 221',
                'text': '23 32 51',
                'textMuted': '75 85 99',
                'textInverse': '255 252 245',
                'border': '190 180 160',
                'borderLight': '222 214 198',
                'accent': '127 85 57',
                'success': '22 101 52',
                'warning': '146 64 14',
                'error': '153 27 27',
                'info': '30 64 120',
            },
            'typography': {
                'fontFamily': 'Georgia, Cambria, "Times New Roman", Times, ui-serif, serif',
                'fontFamilyMono': '"IBM Plex Mono", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontSizeBase': '1.0625rem',
                'fontSizeScale': 1.2,
                'lineHeight': '1.65',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0.125rem',
                'md': '0.25rem',
                'lg': '0.5rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 2px rgba(23, 32, 51, 0.08)',
                'md': '0 6px 18px rgba(23, 32, 51, 0.1)',
                'lg': '0 16px 36px rgba(23, 32, 51, 0.14)',
                'glow': '0 0 24px rgba(30, 64, 120, 0.14)',
            },
            'motion': {
                'durationFast': '120ms',
                'durationNormal': '180ms',
                'durationSlow': '280ms',
                'easing': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'dots',
                'opacity': 0.035,
                'color': 'rgba(30, 64, 120, 0.15)',
            },
        },
    },
    'terminal-witchcraft': {
        'id': 'terminal-witchcraft',
        'name': 'Terminal Witchcraft',
        'description': 'Retro terminal aesthetic with monospace typography, green-on-black color scheme, scanline effects, and cursor-blink animations',
        'builtin': True,
        'tokens': {
            'colors': {
                'primary': '34 197 94',
                'primaryHover': '74 222 128',
                'secondary': '163 230 53',
                'background': '3 10 6',
                'backgroundAlt': '1 18 10',
                'surface': '2 24 14',
                'surfaceAlt': '3 36 20',
                'text': '187 247 208',
                'textMuted': '134 239 172',
                'textInverse': '0 20 8',
                'border': '22 101 52',
                'borderLight': '20 83 45',
                'accent': '217 249 157',
                'success': '74 222 128',
                'warning': '253 224 71',
                'error': '248 113 113',
                'info': '125 211 252',
            },
            'typography': {
                'fontFamily': '"IBM Plex Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontFamilyMono': '"IBM Plex Mono", "Fira Code", "Cascadia Code", "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                'fontSizeBase': '1rem',
                'fontSizeScale': 1.18,
                'lineHeight': '1.55',
                'fontWeightNormal': 400,
                'fontWeightBold': 700,
            },
            'radius': {
                'sm': '0rem',
                'md': '0.125rem',
                'lg': '0.25rem',
                'full': '9999px',
            },
            'shadow': {
                'sm': '0 1px 2px rgba(0, 0, 0, 0.45)',
                'md': '0 8px 22px rgba(0, 0, 0, 0.5)',
                'lg': '0 18px 48px rgba(0, 0, 0, 0.6)',
                'glow': '0 0 28px rgba(34, 197, 94, 0.38)',
            },
            'motion': {
                'durationFast': '80ms',
                'durationNormal': '140ms',
                'durationSlow': '260ms',
                'easing': 'steps(2, end)',
                'reducedMotion': False,
            },
            'patterns': {
                'type': 'scanlines',
                'opacity': 0.1,
                'color': 'rgba(34, 197, 94, 0.25)',
            },
        },
    },
}


def get_builtin_theme(theme_id: str) -> Optional[Dict[str, Any]]:
    """Get a builtin theme by ID. Returns None if not found."""
    return BUILTIN_THEMES.get(theme_id)


def is_builtin_theme(theme_id: str) -> bool:
    """Check whether a theme ID belongs to a builtin theme."""
    return theme_id in BUILTIN_THEMES


def get_all_builtin_themes() -> List[Dict[str, Any]]:
    """Get all builtin themes as a list."""
    return list(BUILTIN_THEMES.values())


def get_builtin_theme_metadata(theme_id: str) -> Optional[Dict[str, Any]]:
    """
    Get builtin theme metadata (without full tokens) for gallery listing.
    Returns preview_colors from the token colors.
    """
    theme = BUILTIN_THEMES.get(theme_id)
    if not theme:
        return None

    colors = theme['tokens']['colors']
    return {
        'id': theme['id'],
        'name': theme['name'],
        'description': theme['description'],
        'builtin': True,
        'preview_colors': {
            'primary': colors['primary'],
            'background': colors['background'],
            'surface': colors['surface'],
            'accent': colors['accent'],
        },
    }


def get_all_builtin_metadata() -> List[Dict[str, Any]]:
    """Get metadata for all builtin themes (for gallery listing)."""
    result = []
    for theme_id in BUILTIN_THEMES:
        metadata = get_builtin_theme_metadata(theme_id)
        if metadata:
            result.append(metadata)
    return result
