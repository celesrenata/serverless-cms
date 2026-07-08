# Implementation Plan: Architecture Article

## Overview

Create a Python script (`scripts/create_architecture_article.py`) that generates and publishes a comprehensive technical blog post about the serverless CMS architecture. The article is the primary deliverable — a ~6000-10000 word HTML document covering 13 topic areas with 6 Mermaid diagrams and 4+ code examples. The script handles idempotent upsert to DynamoDB via the existing ContentRepository.

## Tasks

- [x] 1. Create script infrastructure
  - [x] 1.1 Implement script skeleton with CLI and repository integration
    - Create `scripts/create_architecture_article.py` with argparse `--env` argument (default: `dev`)
    - Add `sys.path` manipulation to import `ContentRepository` from `lambda/shared/db.py`
    - Implement `parse_args()` returning namespace with `env` attribute
    - Implement `main()` that resolves table name, sets `CONTENT_TABLE` env var, instantiates repository
    - Add shebang line and `if __name__ == '__main__'` guard
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

  - [x] 1.2 Implement upsert logic
    - Implement `upsert_article(repo: ContentRepository)` function
    - Call `repo.get_by_slug("how-we-built-this-serverless-cms")` to check existence
    - If exists: preserve `id` and `created_at`, update content/metadata/timestamps via `repo.update()`
    - If not exists: generate new UUID, set all fields, call `repo.create()`
    - Print confirmation to stdout (action, environment, table, ID, slug)
    - Add error handling: catch exceptions, print descriptive error, exit non-zero
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Create article content builder
  - [x] 2.1 Implement `build_article_content()` function — Introduction and System Architecture sections
    - Write HTML content for the article introduction (what the CMS is, tech stack, motivation)
    - Write the "Big Picture: System Architecture" section with Mermaid Diagram 1 (system architecture flowchart)
    - Use `<pre><code class="language-mermaid">` format for diagrams
    - Reference `serverless.celestium.life` and `celesrenata/serverless-cms` repository
    - _Requirements: 2.1, 4.1, 4.7, 6.2, 6.5_

  - [x] 2.2 Implement article content — Infrastructure as Code and Backend sections
    - Write "Infrastructure as Code with AWS CDK" section with subsections for construct boundaries and deployment flow
    - Include Mermaid Diagram 2 (CDK construct tree) and Code Example 1 (CDK construct composition in TypeScript)
    - Write "Serverless Backend Architecture" section covering Lambda organization, @require_auth, DynamoDB access patterns
    - Include Mermaid Diagram 3 (request lifecycle sequence) and Code Example 2 (Lambda handler with @require_auth)
    - Include Code Example 4 (DynamoDB upsert pattern)
    - Use `html.escape()` for code content with generics/angle brackets
    - _Requirements: 2.1, 2.2, 4.2, 4.3, 4.7, 5.1, 5.2, 5.4, 5.5_

  - [x] 2.3 Implement article content — Frontend Architecture section
    - Write "Frontend Architecture" section with subsections for public website, admin panel, Mermaid rendering, dark theme
    - Include Mermaid Diagram 5 (frontend component architecture)
    - Include Code Example 3 (React BlogContent component in TSX)
    - Cover React, TypeScript, Vite, Tailwind CSS, and component separation
    - _Requirements: 2.3, 3.1, 4.5, 5.3, 5.5_

  - [x] 2.4 Implement article content — Auth, Media, Content Features sections
    - Write "Authentication and Authorization" section covering Cognito, JWT validation, role-based access, auth middleware
    - Write "Media Handling and CDN Delivery" section covering S3 uploads, CloudFront, image processing, thumbnails
    - Include Mermaid Diagram 6 (content data flow)
    - Write "Content Features" subsections: comment system/moderation, gallery album experience, plugin system
    - _Requirements: 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.6, 4.7_

  - [x] 2.5 Implement article content — Operations, CI/CD, and Conclusion sections
    - Write "Operations and Quality" subsections: WordPress migration, property-based testing with Hypothesis, backup and restore
    - Write "CI/CD Pipeline" section with Mermaid Diagram 4 (CI/CD pipeline flow)
    - Write "Lessons Learned and Conclusion" section summarizing key takeaways
    - _Requirements: 2.6, 3.5, 3.6, 3.7, 4.4, 6.3_

  - [x] 2.6 Implement `build_metadata()` function and wire content builder together
    - Implement `build_metadata()` returning dict with `seo_title`, `seo_description`, `tags`, `canonical_url`, `repository`
    - Ensure `build_article_content()` composes all sections into a single HTML string with proper heading hierarchy (h1 → h2 → h3)
    - Verify all 6 mermaid diagrams and 4+ code examples are included
    - Ensure HTML content uses `html.escape()` for code examples to prevent invalid HTML
    - _Requirements: 1.1, 6.1, 6.4_

- [x] 3. Checkpoint - Verify script runs locally
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Write tests
  - [x] 4.1 Create unit tests for script infrastructure
    - Create `tests/test_architecture_article.py`
    - Test `parse_args()`: default env resolves to `dev`, explicit `--env prod` resolves to `prod`
    - Test `build_metadata()`: returns object with `seo_title`, `seo_description`, non-empty `tags`
    - Test `build_article_content()`: returns non-empty HTML containing key terms (CDK, Lambda, DynamoDB, React, Cognito)
    - Test upsert logic with mocked repository: create path (get_by_slug returns None → create called)
    - Test upsert logic with mocked repository: update path (get_by_slug returns item → update called, id/created_at preserved)
    - Test error handling: repository raises exception → script exits non-zero with error message
    - _Requirements: 1.1, 1.3, 1.4, 1.5, 7.3_

  - [x] 4.2 Create content validation tests
    - Parse generated HTML with BeautifulSoup
    - Assert exactly one `<h1>` element
    - Assert heading hierarchy follows valid ordering (no level skipping)
    - Assert exactly 6 `<pre><code class="language-mermaid">` blocks with non-empty content
    - Assert all `<pre><code>` blocks have a `language-*` class
    - Assert article contains expected section keywords for all 13 topic areas
    - Assert references to `serverless.celestium.life` and `celesrenata/serverless-cms` are present
    - _Requirements: 4.7, 5.5, 6.1, 6.5_

  - [x] 4.3 Write property-based tests with Hypothesis
    - **Property 6: Environment Targeting** — For any valid environment name, table resolves to `cms-content-{env}`
    - **Validates: Requirements 7.3**
    - **Property 5: Heading Hierarchy Validity** — Heading sequence has exactly one h1, no level skipping
    - **Validates: Requirements 6.1**
    - **Property 2: Script Idempotency** — Two sequential upserts against moto-mocked DynamoDB yield exactly one item with target slug
    - **Validates: Requirements 1.3**
    - **Property 3: Mermaid Block Format Consistency** — All mermaid blocks use `<pre><code class="language-mermaid">` format
    - **Validates: Requirements 4.7**
    - **Property 4: Code Block Language Annotation** — All code blocks include a language identifier class
    - **Validates: Requirements 5.5**
    - **Property 1: Content Item Structural Validity** — Generated item has all required fields with correct types
    - **Validates: Requirements 1.1, 6.4**

  - [x] 4.4 Write integration tests with moto
    - Use `moto` to mock DynamoDB
    - Run upsert once → verify 1 item with correct slug exists, all fields populated
    - Run upsert again → verify still exactly 1 item, `id` preserved, `updated_at` refreshed
    - Verify `type#timestamp` composite key is correctly formed
    - _Requirements: 1.3_

- [x] 5. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- The article content (task 2) is the primary deliverable — a ~6000-10000 word technical blog post
- The script infrastructure (task 1) is the mechanism to publish it
- All code examples in the article must be HTML-escaped using `html.escape()` to prevent invalid HTML from TypeScript generics and JSX
- Mermaid diagrams use `<pre><code class="language-mermaid">` format required by the existing MermaidRenderer component
- The script targets DynamoDB table `cms-content-{env}` using the existing ContentRepository from `lambda/shared/db.py`
- After implementation, run `python scripts/create_architecture_article.py --env dev` to publish to dev, then `--env prod` for production

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["2.4", "2.5"] },
    { "id": 4, "tasks": ["2.6"] },
    { "id": 5, "tasks": ["4.1", "4.2"] },
    { "id": 6, "tasks": ["4.3", "4.4"] }
  ]
}
```
