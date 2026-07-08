"""
Tests for the theme validator module.
"""
import sys
import os
import pytest

# Add lambda/themes to path so we can import validator
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'lambda', 'themes'))

from validator import (
    validate_theme,
    validate_tokens,
    sanitize_css,
    ValidationResult,
    MAX_NAME_LENGTH,
    MAX_DESCRIPTION_LENGTH,
    MAX_CUSTOM_CSS_BYTES,
)


# ─── Fixtures ─────────────────────────────────────────────────────────────────


def valid_tokens():
    """Return a fully valid ThemeTokens dict."""
    return {
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
            'fontFamilyMono': '"JetBrains Mono", monospace',
            'fontSizeBase': '1rem',
            'fontSizeScale': 1.25,
            'lineHeight': '1.6',
            'fontWeightNormal': 400,
            'fontWeightBold': 700,
        },
        'radius': {'sm': '0.375rem', 'md': '0.5rem', 'lg': '0.75rem', 'full': '9999px'},
        'shadow': {
            'sm': '0 1px 3px rgba(0,0,0,0.1)',
            'md': '0 4px 12px rgba(0,0,0,0.15)',
            'lg': '0 12px 40px rgba(0,0,0,0.2)',
            'glow': '0 0 20px rgba(139, 92, 246, 0.4)',
        },
        'motion': {
            'durationFast': '150ms',
            'durationNormal': '300ms',
            'durationSlow': '600ms',
            'easing': 'cubic-bezier(0.4, 0, 0.2, 1)',
            'reducedMotion': False,
        },
    }


def valid_theme_data():
    """Return a fully valid theme request body."""
    return {
        'name': 'Test Theme',
        'description': 'A test theme description',
        'tokens': valid_tokens(),
    }


# ─── Token Validation Tests ───────────────────────────────────────────────────


class TestValidateTokens:
    """Tests for validate_tokens function."""

    def test_valid_tokens_passes(self):
        result = validate_tokens(valid_tokens())
        assert result.valid
        assert result.errors == []

    def test_valid_tokens_with_patterns(self):
        tokens = valid_tokens()
        tokens['patterns'] = {
            'type': 'grid',
            'opacity': 0.05,
            'color': 'rgba(139, 92, 246, 0.3)',
        }
        result = validate_tokens(tokens)
        assert result.valid

    def test_non_dict_input_fails(self):
        result = validate_tokens("not a dict")
        assert not result.valid
        assert any(e['path'] == 'tokens' for e in result.errors)

    def test_none_input_fails(self):
        result = validate_tokens(None)
        assert not result.valid

    def test_missing_colors_group(self):
        tokens = valid_tokens()
        del tokens['colors']
        result = validate_tokens(tokens)
        assert not result.valid
        assert any('colors' in e['path'] for e in result.errors)

    def test_missing_typography_group(self):
        tokens = valid_tokens()
        del tokens['typography']
        result = validate_tokens(tokens)
        assert not result.valid
        assert any('typography' in e['path'] for e in result.errors)

    def test_missing_radius_group(self):
        tokens = valid_tokens()
        del tokens['radius']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_missing_shadow_group(self):
        tokens = valid_tokens()
        del tokens['shadow']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_missing_motion_group(self):
        tokens = valid_tokens()
        del tokens['motion']
        result = validate_tokens(tokens)
        assert not result.valid


class TestColorValidation:
    """Tests for RGB color token validation."""

    def test_valid_rgb_formats(self):
        """All 17 color tokens with valid space-separated RGB pass."""
        result = validate_tokens(valid_tokens())
        assert result.valid

    def test_invalid_rgb_value_over_255(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = '300 0 0'
        result = validate_tokens(tokens)
        assert not result.valid
        assert any('primary' in e['path'] for e in result.errors)

    def test_invalid_rgb_format_hex(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = '#8B5CF6'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_invalid_rgb_format_comma_separated(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = '139, 92, 246'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_invalid_rgb_format_missing_component(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = '139 92'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_invalid_rgb_non_string(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = 123
        result = validate_tokens(tokens)
        assert not result.valid

    def test_missing_color_key(self):
        tokens = valid_tokens()
        del tokens['colors']['accent']
        result = validate_tokens(tokens)
        assert not result.valid
        assert any('accent' in e['path'] for e in result.errors)

    def test_colors_not_dict(self):
        tokens = valid_tokens()
        tokens['colors'] = 'not a dict'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_valid_rgb_boundary_values(self):
        """RGB values of 0 and 255 should be valid."""
        tokens = valid_tokens()
        tokens['colors']['primary'] = '0 0 0'
        tokens['colors']['text'] = '255 255 255'
        result = validate_tokens(tokens)
        assert result.valid

    def test_negative_rgb_value(self):
        tokens = valid_tokens()
        tokens['colors']['primary'] = '-1 0 0'
        result = validate_tokens(tokens)
        assert not result.valid


class TestTypographyValidation:
    """Tests for typography token validation."""

    def test_valid_typography(self):
        result = validate_tokens(valid_tokens())
        assert result.valid

    def test_missing_font_family(self):
        tokens = valid_tokens()
        del tokens['typography']['fontFamily']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_font_size_scale_not_number(self):
        tokens = valid_tokens()
        tokens['typography']['fontSizeScale'] = 'not a number'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_font_weight_not_number(self):
        tokens = valid_tokens()
        tokens['typography']['fontWeightNormal'] = '400'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_font_size_base_not_string(self):
        tokens = valid_tokens()
        tokens['typography']['fontSizeBase'] = 16
        result = validate_tokens(tokens)
        assert not result.valid


class TestRadiusValidation:
    """Tests for radius token validation."""

    def test_valid_radius(self):
        result = validate_tokens(valid_tokens())
        assert result.valid

    def test_missing_radius_key(self):
        tokens = valid_tokens()
        del tokens['radius']['lg']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_radius_value_not_string(self):
        tokens = valid_tokens()
        tokens['radius']['sm'] = 4
        result = validate_tokens(tokens)
        assert not result.valid


class TestShadowValidation:
    """Tests for shadow token validation."""

    def test_valid_shadow(self):
        result = validate_tokens(valid_tokens())
        assert result.valid

    def test_missing_shadow_key(self):
        tokens = valid_tokens()
        del tokens['shadow']['glow']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_shadow_value_not_string(self):
        tokens = valid_tokens()
        tokens['shadow']['sm'] = 123
        result = validate_tokens(tokens)
        assert not result.valid


class TestMotionValidation:
    """Tests for motion token validation."""

    def test_valid_motion(self):
        result = validate_tokens(valid_tokens())
        assert result.valid

    def test_missing_motion_key(self):
        tokens = valid_tokens()
        del tokens['motion']['easing']
        result = validate_tokens(tokens)
        assert not result.valid

    def test_reduced_motion_not_boolean(self):
        tokens = valid_tokens()
        tokens['motion']['reducedMotion'] = 'false'
        result = validate_tokens(tokens)
        assert not result.valid

    def test_duration_not_string(self):
        tokens = valid_tokens()
        tokens['motion']['durationFast'] = 150
        result = validate_tokens(tokens)
        assert not result.valid


class TestPatternsValidation:
    """Tests for optional patterns token validation."""

    def test_patterns_omitted_is_valid(self):
        """patterns is optional — omitting it is fine."""
        tokens = valid_tokens()
        assert 'patterns' not in tokens
        result = validate_tokens(tokens)
        assert result.valid

    def test_valid_patterns(self):
        tokens = valid_tokens()
        tokens['patterns'] = {'type': 'dots', 'opacity': 0.5, 'color': '139 92 246'}
        result = validate_tokens(tokens)
        assert result.valid

    def test_invalid_pattern_type(self):
        tokens = valid_tokens()
        tokens['patterns'] = {'type': 'sparkle', 'opacity': 0.5, 'color': '0 0 0'}
        result = validate_tokens(tokens)
        assert not result.valid

    def test_opacity_out_of_range(self):
        tokens = valid_tokens()
        tokens['patterns'] = {'type': 'grid', 'opacity': 1.5, 'color': '0 0 0'}
        result = validate_tokens(tokens)
        assert not result.valid

    def test_patterns_not_dict(self):
        tokens = valid_tokens()
        tokens['patterns'] = 'grid'
        result = validate_tokens(tokens)
        assert not result.valid


# ─── CSS Sanitization Tests ───────────────────────────────────────────────────


class TestSanitizeCSS:
    """Tests for CSS sanitization."""

    def test_valid_css_passes(self):
        valid, error = sanitize_css('.container { color: red; padding: 1rem; }')
        assert valid
        assert error is None

    def test_empty_css_passes(self):
        valid, error = sanitize_css('')
        assert valid
        assert error is None

    def test_none_like_empty(self):
        """Empty string is treated as valid."""
        valid, error = sanitize_css('')
        assert valid

    def test_rejects_import(self):
        valid, error = sanitize_css('@import url("evil.css");')
        assert not valid
        assert '@import' in error

    def test_rejects_import_case_insensitive(self):
        valid, error = sanitize_css('@IMPORT url("evil.css");')
        assert not valid

    def test_rejects_expression(self):
        valid, error = sanitize_css('div { width: expression(alert(1)); }')
        assert not valid
        assert 'expression' in error

    def test_rejects_expression_case_insensitive(self):
        valid, error = sanitize_css('div { width: Expression(alert(1)); }')
        assert not valid

    def test_rejects_javascript_protocol(self):
        valid, error = sanitize_css('div { background: url(javascript:alert(1)); }')
        assert not valid
        assert 'javascript' in error

    def test_rejects_javascript_with_spaces(self):
        valid, error = sanitize_css('div { background: url(javascript :void(0)); }')
        assert not valid

    def test_rejects_moz_binding(self):
        valid, error = sanitize_css('div { -moz-binding: url("evil.xml#xss"); }')
        assert not valid
        assert '-moz-binding' in error

    def test_rejects_external_url_https(self):
        valid, error = sanitize_css('div { background: url(https://evil.com/bg.png); }')
        assert not valid
        assert 'url()' in error

    def test_rejects_external_url_http(self):
        valid, error = sanitize_css('div { background: url(http://evil.com/bg.png); }')
        assert not valid

    def test_rejects_external_url_protocol_relative(self):
        valid, error = sanitize_css('div { background: url(//evil.com/bg.png); }')
        assert not valid

    def test_allows_relative_url(self):
        valid, error = sanitize_css('div { background: url(./images/bg.png); }')
        assert valid

    def test_allows_data_uri(self):
        valid, error = sanitize_css('div { background: url(data:image/png;base64,abc); }')
        assert valid

    def test_rejects_oversized_css(self):
        large_css = 'a' * (MAX_CUSTOM_CSS_BYTES + 1)
        valid, error = sanitize_css(large_css)
        assert not valid
        assert '100KB' in error

    def test_css_at_size_limit_passes(self):
        """CSS exactly at the limit should pass (if content is safe)."""
        # Use simple safe CSS that's exactly at limit
        css = 'a' * MAX_CUSTOM_CSS_BYTES
        valid, error = sanitize_css(css)
        assert valid


# ─── Full Theme Validation Tests ──────────────────────────────────────────────


class TestValidateTheme:
    """Tests for validate_theme (full payload validation)."""

    def test_valid_theme_passes(self):
        result = validate_theme(valid_theme_data())
        assert result.valid

    def test_valid_theme_with_custom_css(self):
        data = valid_theme_data()
        data['custom_css'] = '.my-class { color: blue; }'
        result = validate_theme(data)
        assert result.valid

    def test_missing_name(self):
        data = valid_theme_data()
        del data['name']
        result = validate_theme(data)
        assert not result.valid
        assert any(e['path'] == 'name' for e in result.errors)

    def test_empty_name(self):
        data = valid_theme_data()
        data['name'] = '   '
        result = validate_theme(data)
        assert not result.valid

    def test_name_too_long(self):
        data = valid_theme_data()
        data['name'] = 'x' * 101
        result = validate_theme(data)
        assert not result.valid
        assert any('100' in e['message'] for e in result.errors)

    def test_name_at_max_length(self):
        data = valid_theme_data()
        data['name'] = 'x' * 100
        result = validate_theme(data)
        assert result.valid

    def test_description_too_long(self):
        data = valid_theme_data()
        data['description'] = 'x' * 501
        result = validate_theme(data)
        assert not result.valid

    def test_description_at_max_length(self):
        data = valid_theme_data()
        data['description'] = 'x' * 500
        result = validate_theme(data)
        assert result.valid

    def test_description_optional(self):
        data = valid_theme_data()
        del data['description']
        result = validate_theme(data)
        assert result.valid

    def test_missing_tokens(self):
        data = valid_theme_data()
        del data['tokens']
        result = validate_theme(data)
        assert not result.valid

    def test_non_dict_body(self):
        result = validate_theme("not a dict")
        assert not result.valid

    def test_custom_css_malicious(self):
        data = valid_theme_data()
        data['custom_css'] = '@import url("https://evil.com/inject.css");'
        result = validate_theme(data)
        assert not result.valid

    def test_custom_css_not_string(self):
        data = valid_theme_data()
        data['custom_css'] = 123
        result = validate_theme(data)
        assert not result.valid

    def test_name_not_string(self):
        data = valid_theme_data()
        data['name'] = 123
        result = validate_theme(data)
        assert not result.valid
