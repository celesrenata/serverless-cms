#!/usr/bin/env python3
"""
Migrate WordPress content from a MySQL/MariaDB SQL dump into DynamoDB staging tables.

Target:
  - cms-content-{env}
  - cms-media-{env}
  - cms-users-{env}
  - S3 URL metadata for bucket serverless-cms-media-staging-776053071238

Notes:
  - IDs are deterministic via uuid5 so the script can be safely re-run.
  - Existing items with the same deterministic IDs are overwritten, except the
    admin user, which is checked first and left unchanged if it already exists.
"""

import argparse
import base64
import collections
import datetime
import html as html_lib
import json
import mimetypes
import os
import re
import sys
import time
import urllib.parse
import uuid

import boto3


DEFAULT_REGION = "us-west-2"
MEDIA_BUCKET = "serverless-cms-media-staging-776053071238"

CONTENT_TABLE_TEMPLATE = "cms-content-{env}"
MEDIA_TABLE_TEMPLATE = "cms-media-{env}"
USERS_TABLE_TEMPLATE = "cms-users-{env}"
SETTINGS_TABLE_TEMPLATE = "cms-settings-{env}"

ADMIN_EMAIL = "admin@celestium.life"
ADMIN_NAME = "Celes"
ADMIN_DISPLAY_NAME = "Celes"

# Fixed namespace for deterministic migration UUIDs.
MIGRATION_NAMESPACE = uuid.UUID("5ddf19b6-9b58-4a68-8f38-9df2dfb54742")

TARGET_TABLES = {
    "wp_posts",
    "wp_terms",
    "wp_term_taxonomy",
    "wp_term_relationships",
    "wp_ngg_gallery",
    "wp_ngg_pictures",
}


def deterministic_uuid(name):
    """Create a stable UUID for an imported WordPress/NextGEN object."""
    return str(uuid.uuid5(MIGRATION_NAMESPACE, str(name)))


def safe_str(value):
    if value is None:
        return ""
    return str(value)


def to_int(value, default=0):
    if value is None:
        return default
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if not text:
        return default
    try:
        return int(text)
    except ValueError:
        return default


def parse_wp_datetime(value, default=0):
    """Convert WordPress datetime strings to Unix timestamps."""
    if value is None:
        return default
    if isinstance(value, int):
        return value
    text = str(value).strip()
    if not text or text in {"0000-00-00", "0000-00-00 00:00:00"}:
        return default
    if re.fullmatch(r"-?\d+", text):
        return to_int(text, default)
    formats = (
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d",
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
    )
    for fmt in formats:
        try:
            dt = datetime.datetime.strptime(text, fmt)
            dt = dt.replace(tzinfo=datetime.timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            pass
    return default


def strip_html(value):
    text = safe_str(value)
    text = re.sub(r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", " ", text, flags=re.I)
    text = re.sub(r"<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\[[^\]]+\]", " ", text)  # WordPress shortcodes
    text = html_lib.unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def strip_wordpress_shortcodes(content):
    """Remove or convert WordPress shortcodes from content."""
    text = safe_str(content)

    # Convert [simple_icon name="github"] to a GitHub icon/link
    text = re.sub(
        r'\[simple_icon\s+name="github"\s*\]',
        '\U0001f517',
        text
    )

    # Remove NextGEN Gallery shortcodes [ngg ...]
    text = re.sub(r'\[ngg[^\]]*\]', '', text)

    # Remove any remaining WordPress shortcodes [anything ...]
    # But be careful not to strip code blocks that look like [brackets]
    text = re.sub(r'\[/?(?:simple_icon|ngg|gallery|caption|embed|video|audio|playlist|jetpack)[^\]]*\]', '', text)

    return text


def make_excerpt(content, length=200):
    text = strip_html(content)
    if len(text) <= length:
        return text
    return text[:length].rstrip() + "..."


def slugify(value):
    text = html_lib.unescape(safe_str(value)).strip().lower()
    text = re.sub(r"['']", "", text)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-+", "-", text).strip("-")
    return text


def guess_mime_type(filename, fallback="application/octet-stream"):
    mime_type, _ = mimetypes.guess_type(filename or "")
    return mime_type or fallback


def s3_url(bucket, region, key):
    quoted = urllib.parse.quote(key, safe="/-_.~")
    return f"https://{bucket}.s3.{region}.amazonaws.com/{quoted}"


def normalize_s3_key(key):
    key = safe_str(key).replace("\\", "/")
    key = re.sub(r"/+", "/", key)
    return key.strip("/")


def attachment_s3_key_from_guid(guid, fallback_filename):
    """Convert a WordPress attachment guid into a stable S3 key."""
    guid = safe_str(guid)
    parsed = urllib.parse.urlparse(guid)
    path = urllib.parse.unquote(parsed.path or guid)
    path = path.replace("\\", "/")
    marker = "/wp-content/uploads/"
    if marker in path:
        rel = path.split(marker, 1)[1]
        return normalize_s3_key(f"uploads/{rel}")
    filename = os.path.basename(path) or fallback_filename
    return normalize_s3_key(f"uploads/{filename}")


def gallery_s3_key(gallery_path, filename):
    """Convert a NextGEN gallery path/filename into a target gallery S3 key."""
    path = normalize_s3_key(gallery_path)
    filename = os.path.basename(safe_str(filename).replace("\\", "/"))
    if path.startswith("wp-content/gallery/"):
        path = path[len("wp-content/gallery/"):]
    elif path.startswith("/wp-content/gallery/"):
        path = path[len("/wp-content/gallery/"):]
    elif path.startswith("gallery/"):
        path = path[len("gallery/"):]
    if path:
        return normalize_s3_key(f"gallery/{path}/{filename}")
    return normalize_s3_key(f"gallery/{filename}")


def decode_ngg_metadata(value):
    """Decode NextGEN meta_data (base64 encoded JSON)."""
    text = safe_str(value).strip()
    if not text:
        return {}
    try:
        raw = base64.b64decode(text, validate=False)
        decoded = raw.decode("utf-8", errors="replace")
        data = json.loads(decoded)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


class SQLDumpParser:
    """Parse INSERT statements from WordPress SQL dumps."""

    SQL_ESCAPES = {
        "0": "\0", "'": "'", '"': '"', "b": "\b",
        "n": "\n", "r": "\r", "t": "\t", "Z": "\x1a",
        "\\": "\\", "%": "%", "_": "_",
    }

    INSERT_START_RE = re.compile(
        r"^\s*INSERT\s+INTO\s+`([^`]+)`(?:\s*\([^)]*\))?\s+VALUES\b", re.I,
    )

    INSERT_RE = re.compile(
        r"^\s*INSERT\s+INTO\s+`([^`]+)`(?:\s*\([^)]*\))?\s+VALUES\s*(.*)\s*$", re.I | re.S,
    )

    def __init__(self, target_tables=None):
        self.target_tables = set(target_tables or TARGET_TABLES)
        self.records = {table: [] for table in self.target_tables}
        self.insert_statement_counts = collections.Counter()

    def parse_file(self, path):
        if not os.path.exists(path):
            raise FileNotFoundError(f"SQL dump file does not exist: {path}")

        current_table = None
        statement_lines = []
        total_lines = 0

        print(f"Reading SQL dump: {path}")

        with open(path, "r", encoding="utf-8", errors="replace") as handle:
            for line in handle:
                total_lines += 1
                if current_table is None:
                    match = self.INSERT_START_RE.search(line)
                    if not match:
                        continue
                    table_name = match.group(1)
                    if table_name not in self.target_tables:
                        continue
                    current_table = table_name
                    statement_lines = [line]
                    if self._statement_complete("".join(statement_lines)):
                        self._process_statement("".join(statement_lines))
                        current_table = None
                        statement_lines = []
                else:
                    statement_lines.append(line)
                    if self._statement_complete("".join(statement_lines)):
                        self._process_statement("".join(statement_lines))
                        current_table = None
                        statement_lines = []

        print(f"Read {total_lines:,} lines")
        for table in sorted(self.records):
            print(f"  {table}: {len(self.records[table]):,} rows")
        return self.records

    def _statement_complete(self, text):
        in_string = False
        escaped = False
        for index, char in enumerate(text):
            if in_string:
                if escaped:
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == "'":
                    next_char = text[index + 1] if index + 1 < len(text) else ""
                    if next_char == "'":
                        continue
                    in_string = False
            else:
                if char == "'":
                    in_string = True
                elif char == ";":
                    return text[index + 1:].strip() == "" or text[index + 1:].strip().startswith("\n")
        return False

    def _process_statement(self, statement):
        match = self.INSERT_RE.match(statement)
        if not match:
            return
        table_name = match.group(1)
        if table_name not in self.target_tables:
            return
        values_text = match.group(2).strip()
        if values_text.endswith(";"):
            values_text = values_text[:-1].rstrip()
        rows = self._parse_values(values_text)
        self.records[table_name].extend(rows)
        self.insert_statement_counts[table_name] += 1

    def _parse_values(self, values_text):
        rows = []
        index = 0
        length = len(values_text)
        while index < length:
            while index < length and values_text[index] in " \t\r\n,":
                index += 1
            if index >= length:
                break
            if values_text[index] != "(":
                index += 1
                continue
            depth = 0
            in_string = False
            escaped = False
            tuple_start = None
            end = None
            i = index
            while i < length:
                char = values_text[i]
                if in_string:
                    if escaped:
                        escaped = False
                    elif char == "\\":
                        escaped = True
                    elif char == "'":
                        next_char = values_text[i + 1] if i + 1 < length else ""
                        if next_char == "'":
                            i += 1
                        else:
                            in_string = False
                else:
                    if char == "'":
                        in_string = True
                    elif char == "(":
                        depth += 1
                        if depth == 1:
                            tuple_start = i + 1
                    elif char == ")":
                        depth -= 1
                        if depth == 0:
                            end = i
                            break
                i += 1
            if end is None or tuple_start is None:
                break
            tuple_text = values_text[tuple_start:end]
            rows.append(self._parse_tuple(tuple_text))
            index = end + 1
        return rows

    def _parse_tuple(self, tuple_text):
        values = []
        buffer = []
        in_string = False
        escaped = False
        was_quoted = False
        index = 0
        length = len(tuple_text)

        def finalize_field():
            raw = "".join(buffer)
            if was_quoted:
                return raw
            token = raw.strip()
            if token.upper() == "NULL":
                return None
            if re.fullmatch(r"-?\d+", token):
                return int(token)
            return token

        while index < length:
            char = tuple_text[index]
            if in_string:
                if escaped:
                    buffer.append(self.SQL_ESCAPES.get(char, char))
                    escaped = False
                elif char == "\\":
                    escaped = True
                elif char == "'":
                    next_char = tuple_text[index + 1] if index + 1 < length else ""
                    if next_char == "'":
                        buffer.append("'")
                        index += 1
                    else:
                        in_string = False
                else:
                    buffer.append(char)
            else:
                if char == "'":
                    in_string = True
                    was_quoted = True
                    buffer = []  # discard any whitespace before the quote
                elif char == ",":
                    values.append(finalize_field())
                    buffer = []
                    was_quoted = False
                else:
                    buffer.append(char)
            index += 1

        values.append(finalize_field())
        return values


class WordPressMigrator:
    def __init__(self, records, environment, region):
        self.records = records
        self.environment = environment
        self.region = region
        self.content_table_name = CONTENT_TABLE_TEMPLATE.format(env=environment)
        self.media_table_name = MEDIA_TABLE_TEMPLATE.format(env=environment)
        self.users_table_name = USERS_TABLE_TEMPLATE.format(env=environment)
        self.dynamodb = boto3.resource("dynamodb", region_name=region)
        self.content_table = self.dynamodb.Table(self.content_table_name)
        self.media_table = self.dynamodb.Table(self.media_table_name)
        self.users_table = self.dynamodb.Table(self.users_table_name)
        self.stats = collections.Counter()

    def run(self):
        print(f"\nMigration target:")
        print(f"  Environment: {self.environment}")
        print(f"  Region:      {self.region}")
        print(f"  Content:     {self.content_table_name}")
        print(f"  Media:       {self.media_table_name}")
        print(f"  Users:       {self.users_table_name}")
        print(f"  S3 bucket:   {MEDIA_BUCKET}\n")

        admin_user_id = self.ensure_admin_user()
        taxonomy_index = self.build_taxonomy_index()

        content_items = []
        media_items_by_id = {}

        post_items, attachment_items = self.build_post_and_attachment_items(
            admin_user_id, taxonomy_index
        )
        content_items.extend(post_items)
        for item in attachment_items:
            media_items_by_id[item["id"]] = item

        gallery_items, gallery_media = self.build_gallery_items(admin_user_id)
        content_items.extend(gallery_items)
        for item in gallery_media:
            media_items_by_id[item["id"]] = item

        # Deduplicate
        content_by_id = {item["id"]: item for item in content_items}
        content_items = list(content_by_id.values())
        media_items = list(media_items_by_id.values())

        print(f"\nPrepared items:")
        print(f"  Content: {len(content_items):,} (posts/pages: {self.stats['posts_pages']:,}, galleries: {self.stats['galleries']:,})")
        print(f"  Media:   {len(media_items):,} (attachments: {self.stats['attachments']:,}, NGG: {self.stats['ngg_pictures']:,})")
        print(f"  Skipped: {self.stats['skipped']:,}\n")

        written_content = self.batch_put_items(self.content_table, content_items, "content")
        written_media = self.batch_put_items(self.media_table, media_items, "media")

        print(f"\n{'='*60}")
        print(f"MIGRATION COMPLETE")
        print(f"{'='*60}")
        print(f"  Content items written: {written_content:,}")
        print(f"  Media items written:   {written_media:,}")
        print(f"  Admin user id:         {admin_user_id}")
        print(f"{'='*60}")

    def ensure_admin_user(self):
        admin_user_id = deterministic_uuid(f"user:{ADMIN_EMAIL}")
        try:
            response = self.users_table.get_item(Key={"id": admin_user_id})
            if response.get("Item"):
                print(f"Admin user already exists: {ADMIN_EMAIL} ({admin_user_id})")
                return admin_user_id
        except Exception as exc:
            print(f"WARNING: Failed checking admin user: {exc}", file=sys.stderr)

        item = {
            "id": admin_user_id,
            "email": ADMIN_EMAIL,
            "name": ADMIN_NAME,
            "display_name": ADMIN_DISPLAY_NAME,
            "role": "admin",
            "created_at": int(time.time()),
            "last_login": 0,
        }
        self.users_table.put_item(Item=item)
        print(f"Created admin user: {ADMIN_EMAIL} ({admin_user_id})")
        return admin_user_id

    def build_taxonomy_index(self):
        terms = {}
        taxonomies = {}
        relationships_by_post_id = collections.defaultdict(list)

        for row in self.records.get("wp_terms", []):
            if len(row) < 3:
                continue
            term_id = to_int(row[0])
            terms[term_id] = {"name": safe_str(row[1]), "slug": safe_str(row[2])}

        for row in self.records.get("wp_term_taxonomy", []):
            if len(row) < 3:
                continue
            term_taxonomy_id = to_int(row[0])
            term_id = to_int(row[1])
            taxonomy = safe_str(row[2])
            taxonomies[term_taxonomy_id] = {"term_id": term_id, "taxonomy": taxonomy}

        for row in self.records.get("wp_term_relationships", []):
            if len(row) < 2:
                continue
            object_id = to_int(row[0])
            term_taxonomy_id = to_int(row[1])
            relationships_by_post_id[object_id].append(term_taxonomy_id)

        print(f"Taxonomy index: {len(terms)} terms, {len(taxonomies)} taxonomies, "
              f"{sum(len(v) for v in relationships_by_post_id.values())} relationships")
        return {"terms": terms, "taxonomies": taxonomies, "rels": relationships_by_post_id}

    def terms_for_post(self, post_id, taxonomy_index):
        terms = taxonomy_index["terms"]
        taxonomies = taxonomy_index["taxonomies"]
        categories, tags = [], []
        for tt_id in taxonomy_index["rels"].get(post_id, []):
            tax = taxonomies.get(tt_id)
            if not tax:
                continue
            term = terms.get(tax["term_id"])
            if not term:
                continue
            name = term["name"].strip()
            if not name or name in ("Uncategorized", "null - null"):
                continue
            if tax["taxonomy"] == "category" and name not in categories:
                categories.append(name)
            elif tax["taxonomy"] == "post_tag" and name not in tags:
                tags.append(name)
        return categories, tags

    def build_post_and_attachment_items(self, admin_user_id, taxonomy_index):
        content_items = []
        media_items = []

        for row in self.records.get("wp_posts", []):
            if len(row) < 22:
                continue

            wp_post_id = to_int(row[0])
            post_date = row[2]
            post_content = safe_str(row[4])
            post_title = safe_str(row[5]).strip()
            post_excerpt = safe_str(row[6]).strip()
            post_status = safe_str(row[7]).strip()
            post_name = safe_str(row[11]).strip()
            post_modified = row[14]
            guid = safe_str(row[18])
            post_type = safe_str(row[20]).strip()
            post_mime_type = safe_str(row[21]).strip()

            if post_type in ("post", "page"):
                if post_status != "publish":
                    continue
                if not post_title or not post_name:
                    self.stats["skipped"] += 1
                    continue

                created_at = parse_wp_datetime(post_date)
                updated_at = parse_wp_datetime(post_modified, created_at)
                categories, tags = self.terms_for_post(wp_post_id, taxonomy_index)

                content_items.append({
                    "id": deterministic_uuid(f"wp_post:{wp_post_id}"),
                    "type#timestamp": f"{post_type}#{created_at}",
                    "type": post_type,
                    "title": post_title,
                    "slug": post_name,
                    "content": strip_wordpress_shortcodes(post_content),
                    "excerpt": post_excerpt or make_excerpt(post_content),
                    "author": admin_user_id,
                    "status": "published",
                    "featured_image": "",
                    "metadata": {"categories": categories, "tags": tags},
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "published_at": created_at,
                    "scheduled_at": 0,
                })
                self.stats["posts_pages"] += 1

            elif post_type == "attachment":
                filename = self._attachment_filename(guid, post_title, post_name)
                if not filename:
                    self.stats["skipped"] += 1
                    continue
                key = attachment_s3_key_from_guid(guid, filename)
                uploaded_at = parse_wp_datetime(post_date)

                media_items.append({
                    "id": deterministic_uuid(f"wp_attachment:{wp_post_id}"),
                    "filename": filename,
                    "s3_key": key,
                    "s3_url": s3_url(MEDIA_BUCKET, self.region, key),
                    "mime_type": post_mime_type or guess_mime_type(filename),
                    "size": 0,
                    "uploaded_by": admin_user_id,
                    "uploaded_at": uploaded_at,
                })
                self.stats["attachments"] += 1

        return content_items, media_items

    def _attachment_filename(self, guid, post_title, post_name):
        parsed = urllib.parse.urlparse(safe_str(guid))
        path = urllib.parse.unquote(parsed.path or safe_str(guid))
        filename = os.path.basename(path.replace("\\", "/"))
        if filename and "." in filename:
            return filename
        if post_title and "." in post_title:
            return os.path.basename(post_title.replace("\\", "/"))
        if post_name:
            return post_name
        return ""

    def build_gallery_items(self, admin_user_id):
        gallery_rows = self.records.get("wp_ngg_gallery", [])
        picture_rows = self.records.get("wp_ngg_pictures", [])

        pictures_by_gallery = collections.defaultdict(list)
        for row in picture_rows:
            if len(row) < 7:
                continue
            gallery_id = to_int(row[3])  # galleryid is column index 3
            pictures_by_gallery[gallery_id].append(row)

        # Sort pictures by sortorder (col 9) then pid (col 0)
        for gid in pictures_by_gallery:
            pictures_by_gallery[gid].sort(
                key=lambda r: (to_int(r[9], 0) if len(r) > 9 else 0, to_int(r[0], 0))
            )

        content_items = []
        media_items = []

        for row in gallery_rows:
            if len(row) < 6:
                continue

            gallery_id = to_int(row[0])
            name = safe_str(row[1]).strip()
            slug_col = safe_str(row[2]).strip()
            path = safe_str(row[3]).strip()
            title = safe_str(row[4]).strip() or name or slug_col
            description = safe_str(row[5]) if row[5] else ""
            date_created = row[10] if len(row) > 10 else None
            date_modified = row[11] if len(row) > 11 else None

            gallery_slug = slugify(name) or slugify(slug_col) or slugify(title)
            if not title or not gallery_slug:
                self.stats["skipped"] += 1
                continue

            created_at = parse_wp_datetime(date_created)
            updated_at = parse_wp_datetime(date_modified, created_at)

            gallery_media_metadata = []
            for picture in pictures_by_gallery.get(gallery_id, []):
                if len(picture) < 7:
                    continue
                # Columns: pid(0), image_slug(1), post_id(2), galleryid(3),
                #   filename(4), description(5), alttext(6), imagedate(7),
                #   exclude(8), sortorder(9), meta_data(10), extras_post_id(11), updated_at(12)
                picture_id = to_int(picture[0])
                filename = safe_str(picture[4]).strip()
                pic_description = safe_str(picture[5]).strip() if picture[5] else ""
                alt_text = safe_str(picture[6]).strip() if picture[6] else ""
                image_date = picture[7] if len(picture) > 7 else None
                meta_encoded = safe_str(picture[10]) if len(picture) > 10 else ""

                if not filename:
                    self.stats["skipped"] += 1
                    continue

                key = gallery_s3_key(path, filename)
                metadata = decode_ngg_metadata(meta_encoded)
                uploaded_at = parse_wp_datetime(image_date) or created_at

                gallery_media_metadata.append({
                    "id": deterministic_uuid(f"ngg_picture:{picture_id}"),
                    "filename": filename,
                    "s3_key": key,
                    "s3_url": s3_url(MEDIA_BUCKET, self.region, key),
                    "mime_type": guess_mime_type(filename),
                    "size": 0,
                    "metadata": {"alt_text": alt_text or pic_description},
                    "uploaded_by": admin_user_id,
                    "uploaded_at": uploaded_at,
                })

                media_items.append({
                    "id": deterministic_uuid(f"ngg_picture:{picture_id}"),
                    "filename": filename,
                    "s3_key": key,
                    "s3_url": s3_url(MEDIA_BUCKET, self.region, key),
                    "mime_type": guess_mime_type(filename),
                    "size": 0,
                    "uploaded_by": admin_user_id,
                    "uploaded_at": uploaded_at,
                })
                self.stats["ngg_pictures"] += 1

            content_items.append({
                "id": deterministic_uuid(f"ngg_gallery:{gallery_id}"),
                "type#timestamp": f"gallery#{created_at}",
                "type": "gallery",
                "title": title,
                "slug": gallery_slug,
                "content": description,
                "excerpt": make_excerpt(description),
                "author": admin_user_id,
                "status": "published",
                "featured_image": "",
                "metadata": {
                    "categories": [],
                    "tags": [],
                    "media": gallery_media_metadata,
                },
                "created_at": created_at,
                "updated_at": updated_at,
                "published_at": created_at,
                "scheduled_at": 0,
            })
            self.stats["galleries"] += 1

        return content_items, media_items

    def batch_put_items(self, table, items, label):
        if not items:
            print(f"No {label} items to write.")
            return 0
        print(f"Writing {len(items):,} {label} items to `{table.name}`...")
        try:
            with table.batch_writer() as batch:
                for index, item in enumerate(items, start=1):
                    batch.put_item(Item=item)
                    if index % 100 == 0:
                        print(f"  {index:,}/{len(items):,} {label} items queued")
            print(f"  Done writing {len(items):,} {label} items.")
            return len(items)
        except Exception as exc:
            print(f"ERROR: Batch write failed for {label}: {exc}", file=sys.stderr)
            print("Retrying one-by-one...", file=sys.stderr)
            written = 0
            for item in items:
                try:
                    table.put_item(Item=item)
                    written += 1
                except Exception as item_exc:
                    print(f"  FAILED: {item.get('id')}: {item_exc}", file=sys.stderr)
            print(f"  Wrote {written:,}/{len(items):,} {label} items after retry.")
            return written


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        description="Import WordPress content from SQL dump into DynamoDB."
    )
    parser.add_argument("--environment", required=True, help="Target env (staging, dev, prod)")
    parser.add_argument("--sql-file", required=True, help="Path to WordPress SQL dump")
    parser.add_argument("--region", default=DEFAULT_REGION, help=f"AWS region (default: {DEFAULT_REGION})")
    return parser.parse_args(argv)


def main(argv=None):
    args = parse_args(argv)
    try:
        parser = SQLDumpParser()
        records = parser.parse_file(args.sql_file)
        migrator = WordPressMigrator(
            records=records,
            environment=args.environment,
            region=args.region,
        )
        migrator.run()
    except KeyboardInterrupt:
        print("\nMigration interrupted.", file=sys.stderr)
        return 130
    except Exception as exc:
        print(f"\nMigration failed: {exc}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
