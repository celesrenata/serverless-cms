"""Content validation tests for the architecture article HTML output."""

import re
import sys
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "lambda"))
from create_architecture_article import build_article_content  # noqa: E402


@pytest.fixture(scope="module")
def article_html() -> str:
    """Generate the article HTML once for all tests in this module."""
    return build_article_content()


@pytest.fixture(scope="module")
def soup(article_html: str) -> BeautifulSoup:
    """Parse the article HTML with BeautifulSoup."""
    return BeautifulSoup(article_html, "html.parser")


def test_exactly_one_h1(soup: BeautifulSoup):
    """Article must contain exactly one h1 element."""
    h1_tags = soup.find_all("h1")
    assert len(h1_tags) == 1, f"Expected exactly 1 <h1>, found {len(h1_tags)}"


def test_heading_hierarchy_no_level_skipping(soup: BeautifulSoup):
    """Heading hierarchy must not skip levels (e.g., h1 -> h3 without h2)."""
    headings = soup.find_all(re.compile(r"^h[1-6]$"))
    assert len(headings) > 0, "No headings found"

    levels = [int(tag.name[1]) for tag in headings]

    # Must start with h1
    assert levels[0] == 1, f"First heading must be h1, got h{levels[0]}"

    # Check no level skipping: each heading level <= previous + 1
    for i in range(1, len(levels)):
        prev_level = levels[i - 1]
        curr_level = levels[i]
        assert curr_level <= prev_level + 1, (
            f"Invalid heading hierarchy at position {i}: "
            f"h{prev_level} followed by h{curr_level} (skips a level)"
        )


def test_exactly_six_mermaid_blocks(soup: BeautifulSoup):
    """Article must contain exactly 6 mermaid diagram blocks with non-empty content."""
    mermaid_blocks = []
    for pre in soup.find_all("pre"):
        code = pre.find("code", class_=re.compile(r"language-mermaid"))
        if code:
            mermaid_blocks.append(code)

    assert len(mermaid_blocks) == 6, (
        f"Expected exactly 6 mermaid blocks, found {len(mermaid_blocks)}"
    )

    for i, block in enumerate(mermaid_blocks):
        text = block.get_text(strip=True)
        assert text, f"Mermaid block {i + 1} has empty content"


def test_all_code_blocks_have_language_class(soup: BeautifulSoup):
    """All <pre><code> blocks must have a language-* class or shiki styling."""
    for pre in soup.find_all("pre"):
        code = pre.find("code")
        if code is None:
            continue
        # Accept either language-* class on code element
        # or shiki class on pre element (pre-rendered syntax highlighting)
        code_classes = code.get("class", [])
        pre_classes = pre.get("class", [])
        has_language_class = any(
            cls.startswith("language-") for cls in code_classes
        )
        has_shiki_class = "shiki" in pre_classes
        assert has_language_class or has_shiki_class, (
            f"<pre><code> block missing language-* or shiki class. "
            f"Code classes: {code_classes}, Pre classes: {pre_classes}, "
            f"content starts with: {code.get_text()[:60]!r}"
        )


def test_article_contains_all_13_topic_keywords(article_html: str):
    """Article must reference all 13 topic areas via keywords."""
    topic_keywords = {
        "Infrastructure as Code / CDK": [
            "CDK", "Infrastructure as Code", "CloudFormation"
        ],
        "Serverless Backend / Lambda": [
            "Lambda", "serverless backend", "Serverless Backend"
        ],
        "Frontend Architecture / React": [
            "React", "frontend architecture", "Frontend Architecture"
        ],
        "Authentication / Cognito": [
            "Cognito", "authentication", "Authentication", "JWT"
        ],
        "Media Handling / S3 / CloudFront": [
            "S3", "CloudFront", "media", "Media"
        ],
        "CI/CD / GitHub Actions": [
            "CI/CD", "GitHub Actions", "pipeline", "Pipeline"
        ],
        "Dark Theme": [
            "dark theme", "dark mode", "Dark Theme", "ThemeProvider"
        ],
        "Plugin System": [
            "plugin", "Plugin", "PluginManager"
        ],
        "Comment System / Moderation": [
            "comment", "moderation", "Comment", "Moderation"
        ],
        "Gallery Album": [
            "gallery", "album", "Gallery", "Album"
        ],
        "WordPress Migration": [
            "WordPress", "migration", "migrate"
        ],
        "Property-Based Testing / Hypothesis": [
            "Hypothesis", "property-based", "property test", "Property-Based"
        ],
        "Backup and Restore": [
            "backup", "restore", "Backup", "Restore"
        ],
    }

    missing_topics = []
    for topic, keywords in topic_keywords.items():
        if not any(kw in article_html for kw in keywords):
            missing_topics.append(topic)

    assert not missing_topics, (
        f"Article missing keywords for topics: {missing_topics}"
    )


def test_references_to_domain_and_repo(article_html: str):
    """Article must reference the live domain and GitHub repository."""
    assert "serverless.celestium.life" in article_html, (
        "Article missing reference to 'serverless.celestium.life'"
    )
    assert "celesrenata/serverless-cms" in article_html, (
        "Article missing reference to 'celesrenata/serverless-cms'"
    )
