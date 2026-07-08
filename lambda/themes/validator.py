"""
Theme token validation and CSS sanitization module.

Validates theme data against the ThemeTokens schema and sanitizes custom CSS
to prevent XSS and other injection attacks.
"""
import re
from typing import Any, Dict, List, Optional, Tuple


# ─── Constants ────────────────────────────────────────────────────────────────

MAX_NAME_LENGTH = 100
MAX_DESCRIPTION_LENGTH = 500
MAX_CUSTOM_CSS_BYTES = 100 * 1024  # 100KB

# All 17 color token keys (space-separated RGB format: "139 92 246")
COLOR_KEYS = [
    'primary',
    'primaryHover',
    'secondary',
    'background',
    'backgroundAlt',
    'surface',
    'surfaceAlt',
    'text',
    'textMuted',
    'textInverse',
    'border',
    'borderLight',
    'accent',
    'success',
    'warning',
    'error',
    'info',
]

TYPOGRAPHY_STRING_KEYS = [
    'fontFamily',
    'fontFamilyMono',
    'fontSizeBase',
    'lineHeight',
]

TYPOGRAPHY_NUMBER_KEYS = [
    'fontSizeScale',
    'fontWeightNormal',
    'fontWeightBold',
]

RADIUS_KEYS = ['sm', 'md', 'lg', 'full']

SHADOW_KEYS = ['sm', 'md', 'lg', 'glow']

MOTION_STRING_KEYS = [
    'durationFast',
    'durationNormal',
    'durationSlow',
    'easing',
]

VALID_PATTERN_TYPES = ['none', 'grid', 'dots', 'circuit', 'scanlines', 'noise']

# Space-separated RGB: three integers 0-255 separated by spaces
RGB_PATTERN = re.compile(r'^\d{1,3}\s+\d{1,3}\s+\d{1,3}$')

# CSS sanitization patterns
CSS_IMPORT_PATTERN = re.compile(r'@import\b', re.IGNORECASE)
CSS_EXPRESSION_PATTERN = re.compile(r'\bexpression\s*\(', re.IGNORECASE)
CSS_JAVASCRIPT_PATTERN = re.compile(r'javascript\s*:', re.IGNORECASE)
CSS_MOZ_BINDING_PATTERN = re.compile(r'-moz-binding\s*:', re.IGNORECASE)
# Match url() with absolute external URLs (http://, https://, //)
CSS_EXTERNAL_URL_PATTERN = re.compile(
    r'url\s*\(\s*["\']?\s*(https?://|//)', re.IGNORECASE
)


# ─── Validation Result ────────────────────────────────────────────────────────


class ValidationResult:
    """Holds validation errors for a theme."""

    def __init__(self) -> None:
        self.errors: List[Dict[str, str]] = []

    @property
    def valid(self) -> bool:
        return len(self.errors) == 0

    def add_error(self, path: str, message: str) -> None:
        self.errors.append({'path': path, 'message': message})

    def to_dict(self) -> Dict[str, Any]:
        return {
            'valid': self.valid,
            'errors': self.errors,
        }


# ─── CSS Sanitization ─────────────────────────────────────────────────────────


def sanitize_css(css: str) -> Tuple[bool, Optional[str]]:
    """
    Validate custom CSS for security.

    Returns:
        Tuple of (is_valid, error_message).
        If valid, error_message is None.
    """
    if not css:
        return True, None

    # Check size limit
    if len(css.encode('utf-8')) > MAX_CUSTOM_CSS_BYTES:
        return False, f'custom_css exceeds maximum size of {MAX_CUSTOM_CSS_BYTES // 1024}KB'

    # Check for @import directives
    if CSS_IMPORT_PATTERN.search(css):
        return False, 'custom_css contains forbidden @import directive'

    # Check for expression() (IE script execution)
    if CSS_EXPRESSION_PATTERN.search(css):
        return False, 'custom_css contains forbidden expression() function'

    # Check for javascript: protocol
    if CSS_JAVASCRIPT_PATTERN.search(css):
        return False, 'custom_css contains forbidden javascript: protocol'

    # Check for -moz-binding (Firefox XBL injection)
    if CSS_MOZ_BINDING_PATTERN.search(css):
        return False, 'custom_css contains forbidden -moz-binding property'

    # Check for external url() references
    if CSS_EXTERNAL_URL_PATTERN.search(css):
        return False, 'custom_css contains forbidden external url() reference'

    return True, None


# ─── Token Validation ─────────────────────────────────────────────────────────


def _is_valid_rgb(value: str) -> bool:
    """Check if a string is valid space-separated RGB (e.g., '139 92 246')."""
    if not RGB_PATTERN.match(value):
        return False
    parts = value.split()
    return all(0 <= int(p) <= 255 for p in parts)


def _validate_colors(colors: Any, result: ValidationResult) -> None:
    """Validate the colors token group."""
    if not isinstance(colors, dict):
        result.add_error('tokens.colors', 'Expected object')
        return

    for key in COLOR_KEYS:
        path = f'tokens.colors.{key}'
        if key not in colors:
            result.add_error(path, 'Missing required field')
        elif not isinstance(colors[key], str):
            result.add_error(path, f'Expected string, got {type(colors[key]).__name__}')
        elif not _is_valid_rgb(colors[key]):
            result.add_error(
                path,
                'Expected space-separated RGB format (e.g., "139 92 246")',
            )


def _validate_typography(typography: Any, result: ValidationResult) -> None:
    """Validate the typography token group."""
    if not isinstance(typography, dict):
        result.add_error('tokens.typography', 'Expected object')
        return

    for key in TYPOGRAPHY_STRING_KEYS:
        path = f'tokens.typography.{key}'
        if key not in typography:
            result.add_error(path, 'Missing required field')
        elif not isinstance(typography[key], str):
            result.add_error(path, f'Expected string, got {type(typography[key]).__name__}')

    for key in TYPOGRAPHY_NUMBER_KEYS:
        path = f'tokens.typography.{key}'
        if key not in typography:
            result.add_error(path, 'Missing required field')
        elif not isinstance(typography[key], (int, float)):
            result.add_error(path, f'Expected number, got {type(typography[key]).__name__}')


def _validate_radius(radius: Any, result: ValidationResult) -> None:
    """Validate the radius token group."""
    if not isinstance(radius, dict):
        result.add_error('tokens.radius', 'Expected object')
        return

    for key in RADIUS_KEYS:
        path = f'tokens.radius.{key}'
        if key not in radius:
            result.add_error(path, 'Missing required field')
        elif not isinstance(radius[key], str):
            result.add_error(path, f'Expected string, got {type(radius[key]).__name__}')


def _validate_shadow(shadow: Any, result: ValidationResult) -> None:
    """Validate the shadow token group."""
    if not isinstance(shadow, dict):
        result.add_error('tokens.shadow', 'Expected object')
        return

    for key in SHADOW_KEYS:
        path = f'tokens.shadow.{key}'
        if key not in shadow:
            result.add_error(path, 'Missing required field')
        elif not isinstance(shadow[key], str):
            result.add_error(path, f'Expected string, got {type(shadow[key]).__name__}')


def _validate_motion(motion: Any, result: ValidationResult) -> None:
    """Validate the motion token group."""
    if not isinstance(motion, dict):
        result.add_error('tokens.motion', 'Expected object')
        return

    for key in MOTION_STRING_KEYS:
        path = f'tokens.motion.{key}'
        if key not in motion:
            result.add_error(path, 'Missing required field')
        elif not isinstance(motion[key], str):
            result.add_error(path, f'Expected string, got {type(motion[key]).__name__}')

    # reducedMotion is a boolean
    path = 'tokens.motion.reducedMotion'
    if 'reducedMotion' not in motion:
        result.add_error(path, 'Missing required field')
    elif not isinstance(motion['reducedMotion'], bool):
        result.add_error(
            path, f'Expected boolean, got {type(motion["reducedMotion"]).__name__}'
        )


def _validate_patterns(patterns: Any, result: ValidationResult) -> None:
    """Validate the optional patterns token group."""
    if not isinstance(patterns, dict):
        result.add_error('tokens.patterns', 'Expected object')
        return

    # type
    path = 'tokens.patterns.type'
    if 'type' not in patterns:
        result.add_error(path, 'Missing required field')
    elif patterns['type'] not in VALID_PATTERN_TYPES:
        result.add_error(
            path,
            f'Expected one of {VALID_PATTERN_TYPES}, got \'{patterns["type"]}\'',
        )

    # opacity
    path = 'tokens.patterns.opacity'
    if 'opacity' not in patterns:
        result.add_error(path, 'Missing required field')
    elif not isinstance(patterns['opacity'], (int, float)):
        result.add_error(path, f'Expected number, got {type(patterns["opacity"]).__name__}')
    elif not (0 <= patterns['opacity'] <= 1):
        result.add_error(path, 'Expected number between 0 and 1')

    # color
    path = 'tokens.patterns.color'
    if 'color' not in patterns:
        result.add_error(path, 'Missing required field')
    elif not isinstance(patterns['color'], str):
        result.add_error(path, f'Expected string, got {type(patterns["color"]).__name__}')


def validate_tokens(tokens: Any) -> ValidationResult:
    """
    Validate a ThemeTokens object.

    Args:
        tokens: The tokens dict to validate.

    Returns:
        ValidationResult with any errors found.
    """
    result = ValidationResult()

    if not isinstance(tokens, dict):
        result.add_error('tokens', 'Expected object')
        return result

    # Validate required top-level groups
    required_groups = ['colors', 'typography', 'radius', 'shadow', 'motion']
    for group in required_groups:
        if group not in tokens:
            result.add_error(f'tokens.{group}', 'Missing required field')

    # Validate each group if present
    if 'colors' in tokens:
        _validate_colors(tokens['colors'], result)

    if 'typography' in tokens:
        _validate_typography(tokens['typography'], result)

    if 'radius' in tokens:
        _validate_radius(tokens['radius'], result)

    if 'shadow' in tokens:
        _validate_shadow(tokens['shadow'], result)

    if 'motion' in tokens:
        _validate_motion(tokens['motion'], result)

    # Patterns is optional
    if 'patterns' in tokens:
        _validate_patterns(tokens['patterns'], result)

    return result


# ─── Full Theme Validation ────────────────────────────────────────────────────


def validate_theme(data: Any) -> ValidationResult:
    """
    Validate a complete theme payload (name, description, tokens, custom_css).

    Args:
        data: The full theme request body dict.

    Returns:
        ValidationResult with any errors found.
    """
    result = ValidationResult()

    if not isinstance(data, dict):
        result.add_error('', 'Request body must be a JSON object')
        return result

    # Validate name
    name = data.get('name')
    if name is None:
        result.add_error('name', 'Missing required field')
    elif not isinstance(name, str):
        result.add_error('name', f'Expected string, got {type(name).__name__}')
    elif len(name.strip()) == 0:
        result.add_error('name', 'Name cannot be empty')
    elif len(name) > MAX_NAME_LENGTH:
        result.add_error('name', f'Name exceeds maximum length of {MAX_NAME_LENGTH} characters')

    # Validate description (optional but has max length)
    description = data.get('description')
    if description is not None:
        if not isinstance(description, str):
            result.add_error(
                'description', f'Expected string, got {type(description).__name__}'
            )
        elif len(description) > MAX_DESCRIPTION_LENGTH:
            result.add_error(
                'description',
                f'Description exceeds maximum length of {MAX_DESCRIPTION_LENGTH} characters',
            )

    # Validate tokens
    tokens = data.get('tokens')
    if tokens is None:
        result.add_error('tokens', 'Missing required field')
    else:
        token_result = validate_tokens(tokens)
        result.errors.extend(token_result.errors)

    # Validate custom_css (optional)
    custom_css = data.get('custom_css')
    if custom_css is not None:
        if not isinstance(custom_css, str):
            result.add_error(
                'custom_css', f'Expected string, got {type(custom_css).__name__}'
            )
        else:
            css_valid, css_error = sanitize_css(custom_css)
            if not css_valid:
                result.add_error('custom_css', css_error)

    return result
