import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "lambda"))
from create_architecture_article import (  # noqa: E402
    SLUG,
    build_article_content,
    build_metadata,
    parse_args,
    upsert_article,
)

TEST_CDN_BASE = "https://d391evgc81s5g2.cloudfront.net"


def test_parse_args_default_env():
    with patch("sys.argv", ["script"]):
        args = parse_args()

    assert args.env == "dev"


def test_parse_args_explicit_env():
    with patch("sys.argv", ["script", "--env", "prod"]):
        args = parse_args()

    assert args.env == "prod"


def test_build_metadata_has_required_fields():
    metadata = build_metadata()

    assert "seo_title" in metadata
    assert "seo_description" in metadata
    assert "tags" in metadata
    assert isinstance(metadata["tags"], list)
    assert metadata["tags"]


def test_build_article_content_non_empty_with_key_terms():
    content = build_article_content(TEST_CDN_BASE)

    assert content
    assert "CDK" in content
    assert "Lambda" in content
    assert "DynamoDB" in content
    assert "React" in content
    assert "Cognito" in content


def test_upsert_creates_when_no_existing():
    repo = MagicMock()
    repo.get_by_slug.return_value = None

    upsert_article(repo, "dev", "cms-content-dev")

    repo.get_by_slug.assert_called_once_with(SLUG)
    assert repo.create.called
    repo.update.assert_not_called()


def test_upsert_updates_when_existing():
    repo = MagicMock()
    repo.get_by_slug.return_value = {
        "id": "test-id",
        "created_at": 1000,
        "published_at": 2000,
    }

    upsert_article(repo, "dev", "cms-content-dev")

    repo.get_by_slug.assert_called_once_with(SLUG)
    repo.update.assert_called_once()
    args = repo.update.call_args.args
    assert args[0] == "test-id"
    assert args[1] == 1000
    repo.create.assert_not_called()


def test_upsert_exits_on_error(capsys):
    repo = MagicMock()
    repo.get_by_slug.side_effect = Exception("DB error")

    with pytest.raises(SystemExit) as exc_info:
        upsert_article(repo, "dev", "cms-content-dev")

    assert exc_info.value.code != 0
    captured = capsys.readouterr()
    assert "DB error" in captured.out
    repo.create.assert_not_called()
    repo.update.assert_not_called()
