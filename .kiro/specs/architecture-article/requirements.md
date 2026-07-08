# Requirements Document

## Introduction

This feature creates a comprehensive technical blog article about how the serverless CMS (serverless.celestium.life) was built. The article is stored as a 'post' type content item in DynamoDB and published via a creation script. It covers the full system architecture end-to-end, includes mermaid diagrams rendered by the existing MermaidRenderer component, and provides code examples demonstrating core concepts. The article targets a technical audience familiar with AWS, serverless patterns, and modern frontend development.

## Glossary

- **Article_Script**: A Python script that creates the architecture blog post as a content item in DynamoDB using the ContentRepository
- **Content_Item**: A record in the CMS content table (cms-content-{env}) of type 'post' with title, slug, content body, metadata, and status fields
- **Mermaid_Block**: A fenced code block with language identifier 'mermaid' embedded within the article HTML content, parsed and rendered by the MermaidRenderer component
- **Architecture_Article**: The comprehensive technical blog post describing how the serverless CMS was built
- **ContentRepository**: The shared Python module (lambda/shared/db.py) providing DynamoDB operations for content items
- **MermaidRenderer**: The React component (frontend/public-website/src/components/MermaidRenderer.tsx) that renders mermaid diagram syntax into SVG

## Requirements

### Requirement 1: Article Content Creation Script

**User Story:** As a site administrator, I want a script that creates the architecture article as a content item in DynamoDB, so that the article is published on the public website without manual data entry.

#### Acceptance Criteria

1. WHEN the Article_Script is executed, THE Article_Script SHALL create a Content_Item of type 'post' in the CMS content table with a unique UUID, slug 'how-we-built-this-serverless-cms', title, HTML content body, and metadata
2. WHEN the Article_Script is executed, THE Article_Script SHALL set the Content_Item status to 'published' and set published_at to the current Unix timestamp
3. IF a Content_Item with slug 'how-we-built-this-serverless-cms' already exists, THEN THE Article_Script SHALL update the existing Content_Item rather than creating a duplicate
4. WHEN the Article_Script completes successfully, THE Article_Script SHALL print the content ID and slug to stdout for verification
5. IF the DynamoDB write operation fails, THEN THE Article_Script SHALL print a descriptive error message and exit with a non-zero status code

### Requirement 2: System Architecture Coverage

**User Story:** As a technical reader, I want the article to cover the full system architecture, so that I understand how all components fit together.

#### Acceptance Criteria

1. THE Architecture_Article SHALL include a section describing Infrastructure as Code with AWS CDK written in TypeScript, including how the stack defines Lambda functions, API Gateway, DynamoDB tables, S3 buckets, Cognito user pools, and CloudFront distributions
2. THE Architecture_Article SHALL include a section describing the serverless backend architecture covering Python Lambda functions, DynamoDB data modeling, S3 media storage, and the request lifecycle from API Gateway through Lambda to DynamoDB
3. THE Architecture_Article SHALL include a section describing the frontend architecture covering React with TypeScript, Vite build tooling, Tailwind CSS styling, and the separation between admin panel and public website
4. THE Architecture_Article SHALL include a section describing authentication with AWS Cognito covering user pools, JWT token validation, role-based access control, and the auth middleware pattern
5. THE Architecture_Article SHALL include a section describing media handling covering S3 uploads, CloudFront CDN delivery, image processing, and thumbnail generation
6. THE Architecture_Article SHALL include a section describing CI/CD with GitHub Actions covering the pipeline from push to deployment across development, staging, and production environments

### Requirement 3: Extended Topics Coverage

**User Story:** As a technical reader, I want the article to cover advanced features and decisions, so that I understand the depth of the system beyond basic CRUD operations.

#### Acceptance Criteria

1. THE Architecture_Article SHALL include a section describing dark theme support covering CSS custom properties, theme context, and the ThemeProvider pattern
2. THE Architecture_Article SHALL include a section describing the plugin system covering hook-based architecture, plugin lifecycle management, and the PluginManager execution model
3. THE Architecture_Article SHALL include a section describing the comment system covering public comment submission, moderation workflow, status transitions, and optional CAPTCHA integration
4. THE Architecture_Article SHALL include a section describing the gallery album experience covering album organization, image grid layouts, and lightbox interaction
5. THE Architecture_Article SHALL include a section describing the WordPress migration story covering the migrate_wordpress.py script, content transformation, and media import
6. THE Architecture_Article SHALL include a section describing the property-based testing approach covering Hypothesis strategies, EARS-pattern requirements, and test coverage philosophy
7. THE Architecture_Article SHALL include a section describing backup and restore capabilities covering DynamoDB export, S3 sync, and restoration procedures

### Requirement 4: Mermaid Diagrams

**User Story:** As a technical reader, I want architecture diagrams rendered inline with the article text, so that I can visually understand system relationships and data flows.

#### Acceptance Criteria

1. THE Architecture_Article SHALL include a Mermaid_Block showing the overall system architecture with API Gateway, Lambda functions, DynamoDB, S3, CloudFront, and Cognito as interconnected nodes
2. THE Architecture_Article SHALL include a Mermaid_Block showing the CDK infrastructure flow from stack definition through construct tree to deployed AWS resources
3. THE Architecture_Article SHALL include a Mermaid_Block showing the request lifecycle as a sequence diagram from client request through API Gateway, Lambda authorizer, handler function, DynamoDB operation, and response
4. THE Architecture_Article SHALL include a Mermaid_Block showing the CI/CD pipeline flow from git push through GitHub Actions workflow steps to AWS deployment
5. THE Architecture_Article SHALL include a Mermaid_Block showing the frontend component architecture depicting the relationship between pages, components, contexts, and services
6. THE Architecture_Article SHALL include a Mermaid_Block showing the data flow from content creation through storage to public rendering
7. WHEN a Mermaid_Block is embedded in the article HTML, THE Mermaid_Block SHALL use a fenced code block with the 'mermaid' language identifier so that the existing MermaidRenderer component can parse and render the diagram

### Requirement 5: Code Examples

**User Story:** As a technical reader, I want inline code examples demonstrating core concepts, so that I can understand implementation patterns used in the CMS.

#### Acceptance Criteria

1. THE Architecture_Article SHALL include at least one code example in TypeScript demonstrating a CDK construct definition pattern
2. THE Architecture_Article SHALL include at least one code example in Python demonstrating a Lambda handler with the @require_auth decorator pattern
3. THE Architecture_Article SHALL include at least one code example in TypeScript/React demonstrating a frontend component pattern used in the CMS
4. THE Architecture_Article SHALL include at least one code example demonstrating the DynamoDB single-table access pattern with composite sort keys
5. WHEN a code example is embedded in the article HTML, THE Architecture_Article SHALL use a fenced code block with the appropriate language identifier for syntax highlighting

### Requirement 6: Technical Writing Quality

**User Story:** As a site owner, I want the article to be publication-ready, so that it represents the quality expected of a professional technical blog.

#### Acceptance Criteria

1. THE Architecture_Article SHALL use a logical heading hierarchy starting with an H1 title, H2 for major sections, and H3 for subsections
2. THE Architecture_Article SHALL include an introductory section summarizing what the CMS is, the technology stack, and what motivates the architecture choices
3. THE Architecture_Article SHALL include a conclusion section summarizing key takeaways and lessons learned
4. THE Architecture_Article SHALL include descriptive metadata with seo_title, seo_description, and tags fields set in the Content_Item metadata object
5. THE Architecture_Article SHALL reference the domain 'serverless.celestium.life' and GitHub repository 'celesrenata/serverless-cms' where appropriate for reader context

### Requirement 7: Script Integration with Project

**User Story:** As a developer, I want the creation script to follow existing project patterns, so that it integrates cleanly with the codebase and deployment workflow.

#### Acceptance Criteria

1. THE Article_Script SHALL be located in the scripts/ directory following the naming convention of existing scripts in that directory
2. THE Article_Script SHALL import and use the ContentRepository from lambda/shared/db.py for DynamoDB operations
3. THE Article_Script SHALL accept an optional --env argument defaulting to 'dev' to target the correct DynamoDB table (cms-content-{env})
4. WHEN the Article_Script is executed with --env production, THE Article_Script SHALL write to the production content table
5. THE Article_Script SHALL be executable with Python 3.12 using only dependencies already present in the project's requirements.txt
