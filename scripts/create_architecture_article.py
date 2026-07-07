#!/usr/bin/env python3
"""Create or update the architecture article content entry."""

import sys
import os
import argparse
import time
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR / "lambda"))
from shared.db import ContentRepository

SLUG = "how-we-built-this-serverless-cms"

CDN_URLS = {
    "dev": "https://d391evgc81s5g2.cloudfront.net",
    "staging": "https://d27ovunfkwufk9.cloudfront.net",
    "prod": "https://d2cbtkeb5df7ne.cloudfront.net",
    "production": "https://d2cbtkeb5df7ne.cloudfront.net",
}


def get_cdn_base(env: str) -> str:
    """Get the media CDN base URL for the given environment."""
    return CDN_URLS.get(env, CDN_URLS["dev"])


def parse_args() -> argparse.Namespace:
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Create or update the architecture article."
    )
    parser.add_argument("--env", default="dev", help="Deployment environment.")
    return parser.parse_args()


def build_article_content(cdn_base: str) -> str:
    """Build the article body content."""
    CDN = f"{cdn_base}/architecture-article"

    def figure(filename: str, alt: str, caption: str) -> str:
        return (
            f'<figure class="my-8">'
            f'<img src="{CDN}/{filename}" alt="{alt}" class="w-full rounded-lg shadow-lg" />'
            f'<figcaption class="text-center text-sm text-slate-400 mt-2">{caption}</figcaption>'
            f'</figure>\n'
        )

    img_homepage = figure(
        "01-homepage-2026-07-07T04-05-59-855Z.png",
        "The serverless CMS landing page delivered through CloudFront",
        "The serverless CMS landing page &mdash; everything delivered through CloudFront",
    )
    img_blog_listing = figure(
        "02-blog-listing-2026-07-07T04-06-09-812Z.png",
        "Blog listing with automatic metadata extraction and responsive cards",
        "Blog listing with automatic metadata extraction and responsive cards",
    )
    img_article_hero = figure(
        "03-article-hero-2026-07-07T04-06-20-068Z.png",
        "This very article rendered live on the platform",
        "This very article, rendered live on the platform",
    )
    img_mermaid_system = figure(
        "04-mermaid-system-architecture-2026-07-07T04-06-29-771Z.png",
        "Mermaid diagrams rendered client-side with theme-aware colors",
        "Mermaid diagrams rendered client-side with theme-aware colors",
    )
    img_mermaid_cdk = figure(
        "05-mermaid-cdk-construct-tree-2026-07-07T04-06-39-709Z.png",
        "CDK construct tree visualized as a live Mermaid diagram",
        "CDK construct tree visualized as a live Mermaid diagram",
    )
    img_code_typescript = figure(
        "06-code-block-typescript-2026-07-07T04-06-51-481Z.png",
        "Syntax-highlighted TypeScript with the Nord color scheme",
        "Syntax-highlighted TypeScript with the Nord color scheme",
    )
    img_mermaid_request = figure(
        "07-mermaid-request-lifecycle-2026-07-07T04-07-02-034Z.png",
        "Request lifecycle from browser to DynamoDB and back",
        "Request lifecycle from browser to DynamoDB and back",
    )
    img_code_python = figure(
        "08-code-block-python-lambda-2026-07-07T04-07-12-594Z.png",
        "Python Lambda handlers with the @require_auth decorator pattern",
        "Python Lambda handlers with the @require_auth decorator pattern",
    )
    img_gallery = figure(
        "09-gallery-page-2026-07-07T04-07-23-651Z.png",
        "The gallery experience with responsive image grids and album navigation",
        "The gallery experience with responsive image grids and album navigation",
    )
    img_admin_login = figure(
        "10-admin-login-2026-07-07T04-07-38-739Z.png",
        "AWS Cognito-powered authentication for the admin panel",
        "AWS Cognito-powered authentication for the admin panel",
    )
    img_comments = figure(
        "11-comments-section-2026-07-07T04-07-54-928Z.png",
        "Public comment submission with moderation workflow",
        "Public comment submission with moderation workflow",
    )
    img_mermaid_frontend = figure(
        "12-mermaid-frontend-components-2026-07-07T04-08-04-730Z.png",
        "Frontend component architecture showing shared rendering between public and admin",
        "Frontend component architecture showing shared rendering between public and admin",
    )
    img_mermaid_data_flow = figure(
        "13-mermaid-data-flow-2026-07-07T04-08-14-405Z.png",
        "Content data flow from admin creation to public delivery",
        "Content data flow from admin creation to public delivery",
    )
    img_mermaid_cicd = figure(
        "14-mermaid-cicd-pipeline-2026-07-07T04-08-25-480Z.png",
        "The deployment pipeline from git push to production",
        "The deployment pipeline from git push to production",
    )
    img_blog_nixos = figure(
        "15-blog-post-nixos-2026-07-07T04-08-36-425Z.png",
        "Another article with WordPress-migrated content and Nord-themed code blocks",
        "Another article with WordPress-migrated content and Nord-themed code blocks",
    )
    img_nixos_code = figure(
        "16-nixos-code-block-nord-2026-07-07T04-08-48-029Z.png",
        "Pre-rendered Shiki Nord syntax highlighting preserved from WordPress migration",
        "Pre-rendered Shiki Nord syntax highlighting preserved from WordPress migration",
    )

    title = '<h1>How We Built This Serverless CMS</h1>\n'

    introduction_section = (
        '<h2>Introduction</h2>\n'
        '<p>For years, WordPress has been the default answer to a deceptively simple question: '
        'how do I publish content on the web without building an entire editorial platform from '
        'scratch? It is mature, extensible, familiar, and supported by an enormous ecosystem. But '
        'that convenience comes with operational gravity. A traditional WordPress installation '
        'wants a server, a database, patch management, plugin hygiene, caching layers, backups, '
        'login hardening, and constant attention to the long tail of security updates. For a small '
        'publication, personal technical site, or focused content project, the operational model '
        'can feel disproportionate to the actual job: store articles, manage media, authenticate '
        'editors, and deliver pages quickly to readers.</p>\n'
        '<p>This project began as a deliberate replacement for that model: a serverless CMS built '
        'on AWS, deployed with infrastructure as code, and designed around the idea that the '
        'platform should be quiet when nobody is using it. The live site, '
        '<a href="https://serverless.celestium.life">serverless.celestium.life</a>, is both the '
        'publishing target and the demonstration environment. The source code lives at '
        '<a href="https://github.com/celesrenata/serverless-cms">github.com/celesrenata/serverless-cms</a>, '
        'with AWS CDK in TypeScript defining the infrastructure, Python 3.12 Lambda functions '
        'implementing the backend, DynamoDB storing content and media metadata, Amazon Cognito '
        'handling authentication, and a React/TypeScript frontend providing the administrative '
        'experience.</p>\n'
        '<p>The goal is not to recreate every WordPress feature as a collection of managed '
        'services. The more interesting goal is to ask what a modern CMS looks like when it is '
        'designed from first principles for serverless primitives. Instead of treating compute, '
        'storage, authentication, and delivery as components to install and maintain, the system '
        'composes managed AWS services with narrowly scoped application code. CloudFront and S3 '
        'handle public delivery. API Gateway and Lambda provide a small backend surface area. '
        'DynamoDB supplies predictable, low-maintenance persistence. WAF adds an explicit edge '
        'protection layer. The result is an architecture that is easier to reason about, cheaper '
        'to leave idle, and reproducible through code rather than console configuration.</p>\n'
    )

    architecture_section = (
        '<h2>The Big Picture: System Architecture</h2>\n'
        '<p>At a high level, the system separates publishing concerns into three paths: public '
        'content delivery, authenticated editorial administration, and backend API operations. '
        'Public readers arrive through CloudFront, which acts as the global entry point for cached '
        'assets and site traffic. Editors use the same edge distribution to reach the admin panel, '
        'but their write operations flow through a protected API path backed by API Gateway, AWS '
        'WAF, Lambda, DynamoDB, S3, and Cognito. This keeps the externally visible surface area '
        'small while still allowing the frontend and backend to evolve independently.</p>\n'
        '<p>The infrastructure is defined with AWS CDK using TypeScript, which is a crucial design '
        'choice rather than an implementation detail. A CMS accumulates permissions, buckets, '
        'tables, distributions, user pools, and deployment settings quickly; defining those '
        'resources in code makes the system reviewable, repeatable, and safer to change. The '
        'application code then stays focused on content workflows. Python 3.12 Lambda functions '
        'implement API behavior, the React/TypeScript frontend handles editor interactions, and '
        'AWS managed services absorb the undifferentiated operational work that would otherwise '
        'belong to a server or traditional CMS runtime.</p>\n'
        '<pre><code class="language-mermaid">flowchart TD\n'
        '    Reader[Public Reader] --> CF[CloudFront CDN]\n'
        '    Editor[Admin / Editor] --> CF\n'
        '    CF --> PublicSite[S3 Public Website]\n'
        '    CF --> AdminSite[S3 Admin Panel]\n'
        '    CF --> WAF[AWS WAF]\n'
        '    WAF --> API[API Gateway]\n'
        '    API --> Lambda[Lambda Functions - Python 3.12]\n'
        '    Lambda --> Content[(DynamoDB cms-content)]\n'
        '    Lambda --> Media[(DynamoDB cms-media)]\n'
        '    Lambda --> S3Media[S3 Media Bucket]\n'
        '    Lambda --> Cognito[Amazon Cognito]</code></pre>\n'
        '<p>The diagram shows the intentionally narrow waist of the architecture. CloudFront is '
        'the first hop for both readers and editors, giving the system a single CDN-backed entry '
        'point. Static assets for the public website and the admin panel are served from S3 '
        'origins, which means the frontend does not require a running web server. When an editor '
        'performs an action that changes state, that request passes through AWS WAF before reaching '
        'API Gateway. From there, Lambda functions execute the CMS operations: creating and '
        'updating content, working with media metadata, coordinating uploads, and consulting '
        'Cognito for authentication-related concerns.</p>\n'
        '<p>DynamoDB is split into purpose-specific tables for content and media metadata. This '
        'keeps access patterns explicit and avoids forcing all CMS state into a relational schema '
        'simply because a traditional CMS would do so. The media bucket stores the actual binary '
        'assets, while DynamoDB stores the information needed to reference, organize, and render '
        'those assets inside published content. This division is a natural fit for serverless '
        'systems: object storage handles objects, a key-value and document database handles '
        'metadata and application state, and Lambda provides the glue code at the API boundary.</p>\n'
        '<p>What makes this architecture appealing is not only that it scales, but that it scales '
        'down. A WordPress replacement for a modest technical publication should not need to run a '
        'database server all night just in case someone edits a paragraph tomorrow. With this '
        'design, the public side can be aggressively cached, the admin side is static until used, '
        'and the backend consumes compute only when API requests occur. Infrastructure as code '
        'turns the environment into something that can be recreated, inspected, and evolved, while '
        'the managed services provide the durability, availability, and security foundations '
        'expected from an AWS-native application.</p>\n'
    )

    frontend_section = (
        '<h2>Frontend Architecture</h2>\n'
        '<p>The frontend architecture is designed to make a serverless CMS feel fast, '
        'predictable, and maintainable across both public publishing and administrative '
        'authoring workflows. The system separates the public website from the admin panel '
        'while allowing both applications to share core rendering concepts, especially '
        'around rich article content, embedded diagrams, and theme behavior. React and '
        'TypeScript provide the component model and type safety, Vite supplies a lightweight '
        'build pipeline with fast local development, and Tailwind CSS handles the majority '
        'of layout and utility styling without forcing business logic into stylesheets.</p>\n'
        '<p>At a high level, the frontend treats content as structured HTML delivered by '
        'the backend from DynamoDB. The storage layer owns persistence, but the browser owns '
        'presentation. This division is important in a serverless CMS because the frontend '
        'must remain resilient even when content includes complex elements such as code blocks, '
        'diagrams, callouts, or admin-generated markup. Instead of requiring a heavyweight '
        'runtime CMS renderer, the application uses a small number of focused React components '
        'that transform stored HTML into safe, styled, interactive page content.</p>\n'
        '<h3>Public Website</h3>\n'
        '<p>The public website is optimized for readers. It uses React Router to map clean '
        'URLs to content pages such as blog posts, architecture articles, and landing pages. '
        'When a visitor opens a post, the page component requests the published record from '
        'the API, which reads the corresponding item from DynamoDB. The response includes '
        'metadata such as title, slug, description, publication date, tags, and the HTML body '
        'generated by the CMS editor. The public route then passes that HTML body into a '
        'dedicated content renderer rather than inserting it directly into the page.</p>\n'
        '<p>This extra rendering layer is deliberate. Blog content is not just plain text; '
        'it may include headings, paragraphs, lists, code examples, links, and Mermaid '
        'diagrams. A simple <code>dangerouslySetInnerHTML</code> call would render ordinary '
        'HTML, but it would not allow the frontend to attach specialized behavior to embedded '
        'diagrams or other enhanced blocks. The system therefore routes all article bodies '
        'through a <code>BlogContent</code> component that understands the conventions used '
        'by the CMS. This keeps the public pages simple while centralizing the parsing rules '
        'in one place.</p>\n'
        '<p>TypeScript helps protect the boundary between content data and presentation. '
        'Page components can type API responses, loading states, and route parameters, '
        'reducing the likelihood that a missing field or malformed response produces a runtime '
        'error. Vite complements this by keeping the development loop fast: content rendering '
        'changes, Tailwind class updates, and component refactors are reflected quickly during '
        'local development. For a CMS, this matters because frontend iteration often happens '
        'alongside content modeling and editorial workflow changes.</p>\n'
        '<h3>Admin Panel</h3>\n'
        '<p>The admin panel serves a different audience and therefore has a different set of '
        'responsibilities. Its purpose is to make content creation and review efficient without '
        'exposing editors to implementation details such as DynamoDB item structure or HTML '
        'serialization. The admin interface includes routes for listing posts, creating drafts, '
        'editing existing content, managing metadata, and previewing the final article before '
        'publication. While the public website focuses on minimal reader-facing functionality, '
        'the admin panel emphasizes forms, validation, preview behavior, and clear editorial '
        'feedback.</p>\n'
        '<p>The editor experience follows a WYSIWYG model: authors compose rich content '
        'visually, and the application serializes that content into HTML for storage. This '
        'approach keeps the saved representation portable. The HTML body can be rendered by '
        'the public website, previewed inside the admin panel, indexed for search, or migrated '
        'later without coupling every consumer to editor-specific state. The admin panel can '
        'still preserve higher-level editing conveniences, but the persistence contract remains '
        'straightforward: metadata plus a renderable article body.</p>\n'
        '<p>Preview is the key bridge between authoring and publishing. The admin preview uses '
        'the same <code>BlogContent</code> component as the public website, which ensures that '
        'headings, code blocks, Mermaid diagrams, and theme styles behave consistently before '
        'and after publication. This shared renderer avoids the common CMS problem where the '
        'editor preview looks correct but the published page behaves differently. By reusing '
        'the public content pipeline, the admin panel becomes a realistic staging surface '
        'rather than a separate approximation.</p>\n'
        '<h3>Mermaid Diagram Rendering</h3>\n'
        '<p>Mermaid diagrams are stored inside article HTML as fenced code blocks with the '
        '<code>language-mermaid</code> class. This makes them easy to author, inspect, and '
        'preserve in DynamoDB as part of the normal article body. However, Mermaid diagrams '
        'should not remain static code snippets on the public page. They need to be detected, '
        'extracted, and passed to a renderer that can initialize Mermaid, generate SVG, and '
        'apply theme-aware styling.</p>\n'
        '<p>The frontend component architecture therefore treats Mermaid blocks as special '
        'content segments. The <code>BlogContent</code> component scans the HTML for '
        '<code>&lt;pre&gt;&lt;code class="language-mermaid"&gt;</code> blocks and splits '
        'the article into an ordered list of segments. Normal HTML segments are rendered with '
        'the standard HTML renderer, while Mermaid segments are rendered through '
        '<code>MermaidRenderer</code>. The output order is preserved, so diagrams appear '
        'exactly where the author placed them in the article.</p>\n'
        '<p>This pattern keeps the article format simple while giving the frontend enough '
        'control to enhance specific blocks. It also isolates Mermaid lifecycle concerns. '
        'The Mermaid renderer can manage initialization, unique diagram IDs, error states, '
        'and re-rendering when the theme changes without spreading that logic across every '
        'blog page. If the system later supports additional enhanced blocks, such as '
        'interactive charts or live API examples, the same segmentation model can be extended '
        'without rewriting the page architecture.</p>\n'
        '<pre><code class="language-mermaid">flowchart TD\n'
        '    PublicApp[Public Website] --> Router[React Router]\n'
        '    Router --> BlogPage[BlogPostPage]\n'
        '    BlogPage --> BlogContent[BlogContent]\n'
        '    BlogContent --> HtmlSegment[HTML Renderer]\n'
        '    BlogContent --> MermaidSegment[MermaidRenderer]\n'
        '\n'
        '    AdminApp[Admin Panel] --> AdminRouter[Admin Router]\n'
        '    AdminRouter --> ContentEditor[Content Editor]\n'
        '    ContentEditor --> Preview[Preview]\n'
        '    Preview --> BlogContent</code></pre>\n'
        '<p>The diagram shows the shared rendering path between the public and administrative '
        'applications. The public website enters through reader-facing routes, loads a post '
        'page, and delegates article body rendering to <code>BlogContent</code>. The admin '
        'panel enters through its own routing layer and content editor, but its preview path '
        'converges on the same renderer. That convergence is one of the most important frontend '
        'architecture decisions because it reduces duplicated rendering logic and makes the CMS '
        'behavior easier to test.</p>\n'
        '<div class="not-prose my-6 overflow-x-auto rounded-lg"><pre class="shiki nord overflow-x-auto rounded-lg text-sm" style="background-color: #2e3440ff" tabindex="0"><code>'
        '<span class="line"><span style="color: #81A1C1">export</span> <span style="color: #81A1C1">const</span> <span style="color: #88C0D0">BlogContent</span> <span style="color: #81A1C1">=</span> <span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">html</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">:</span> <span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">html</span><span style="color: #ECEFF4">:</span> <span style="color: #8FBCBB">string</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span> <span style="color: #81A1C1">=&gt;</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">  <span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">segments</span> <span style="color: #81A1C1">=</span> <span style="color: #88C0D0">useMemo</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span> <span style="color: #81A1C1">=&gt;</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">    <span style="color: #616E88">// Split HTML into html and mermaid segments</span></span>'
        '<span class="line">    <span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">mermaidRegex</span> <span style="color: #81A1C1">=</span> <span style="color: #A3BE8C">/&lt;pre&gt;&lt;code class=&quot;language-mermaid&quot;&gt;([\\s\\S]*?)&lt;\\/code&gt;&lt;\\/pre&gt;/gi</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line">    <span style="color: #616E88">// ... parsing logic</span></span>'
        '<span class="line">    <span style="color: #81A1C1">return</span> <span style="color: #D8DEE9">result</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line">  <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">[</span><span style="color: #D8DEE9">html</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"></span>'
        '<span class="line">  <span style="color: #81A1C1">return</span> <span style="color: #ECEFF4">(</span></span>'
        '<span class="line">    <span style="color: #ECEFF4">&lt;</span><span style="color: #D8DEE9FF">&gt;</span></span>'
        '<span class="line">      <span style="color: #ECEFF4">{</span><span style="color: #D8DEE9">segments</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">map</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">segment</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">index</span><span style="color: #ECEFF4">)</span> <span style="color: #81A1C1">=&gt;</span></span>'
        '<span class="line">        <span style="color: #D8DEE9">segment</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">type</span> <span style="color: #81A1C1">===</span> <span style="color: #A3BE8C">&#39;mermaid&#39;</span></span>'
        '<span class="line">          <span style="color: #81A1C1">?</span> <span style="color: #ECEFF4">&lt;</span><span style="color: #88C0D0">MermaidRenderer</span> <span style="color: #D8DEE9">key</span><span style="color: #81A1C1">=</span><span style="color: #ECEFF4">{</span><span style="color: #D8DEE9">index</span><span style="color: #ECEFF4">}</span> <span style="color: #D8DEE9">chart</span><span style="color: #81A1C1">=</span><span style="color: #ECEFF4">{</span><span style="color: #D8DEE9">segment</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">content</span><span style="color: #ECEFF4">}</span> <span style="color: #ECEFF4">/</span><span style="color: #ECEFF4">&gt;</span></span>'
        '<span class="line">          <span style="color: #ECEFF4">:</span> <span style="color: #ECEFF4">&lt;</span><span style="color: #88C0D0">div</span> <span style="color: #D8DEE9">key</span><span style="color: #81A1C1">=</span><span style="color: #ECEFF4">{</span><span style="color: #D8DEE9">index</span><span style="color: #ECEFF4">}</span> <span style="color: #D8DEE9">dangerouslySetInnerHTML</span><span style="color: #81A1C1">=</span><span style="color: #ECEFF4">{</span><span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">__html</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">segment</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">content</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">}</span> <span style="color: #ECEFF4">/</span><span style="color: #ECEFF4">&gt;</span></span>'
        '<span class="line">      <span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">}</span></span>'
        '<span class="line">    <span style="color: #ECEFF4">&lt;/</span><span style="color: #D8DEE9FF">&gt;</span></span>'
        '<span class="line">  <span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"><span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">;</span></span>'
        '</code></pre></div>\n'
        '<p>The example illustrates the central idea without including every parsing detail. '
        'The component memoizes segmentation so the article body is only reprocessed when the '
        'HTML changes. Each segment is then mapped to the correct renderer. Mermaid content is '
        'passed as plain chart definition text to <code>MermaidRenderer</code>, while ordinary '
        'HTML is injected as a preserved article fragment. In a production implementation, this '
        'component can also normalize encoded entities, handle empty segments, and wrap rendered '
        'output with typography classes from Tailwind CSS.</p>\n'
        '<h3>Dark Theme Support</h3>\n'
        '<p>Dark theme support is implemented as a first-class frontend concern rather than an '
        'afterthought. The system uses CSS custom properties to define semantic color tokens '
        'such as background, foreground, border, muted text, card surfaces, and accent colors. '
        'Tailwind CSS utilities then reference those tokens, allowing components to remain '
        'expressive while the actual color values change by theme. This approach avoids '
        'duplicating every class for light and dark modes and makes it easier to keep public '
        'pages and admin screens visually consistent.</p>\n'
        '<p>A <code>ThemeProvider</code> context manages the current theme, exposes a toggle '
        'function, and applies the selected mode at the document root. Persisting the preference '
        'in local storage gives returning users a stable experience, while still allowing the '
        'system to respect browser defaults during the first visit. Because the theme state '
        'lives in context, both the public navigation and admin controls can read and update it '
        'without passing props through unrelated layout components.</p>\n'
        '<p>Mermaid rendering also participates in theming. Diagram SVG output must remain '
        'legible against both light and dark backgrounds, so the renderer can select Mermaid '
        'theme variables based on the active frontend theme. This is another reason diagrams '
        'are rendered as React components instead of static HTML. When the user changes from '
        'light to dark mode, the Mermaid component can reinitialize or redraw the diagram with '
        'the correct colors, keeping architecture diagrams, flowcharts, and process maps '
        'aligned with the rest of the article.</p>\n'
        '<p>The result is a frontend architecture that is intentionally modular. React '
        'components define behavior, TypeScript documents contracts, Vite keeps builds fast, '
        'Tailwind CSS keeps styling consistent, and shared rendering components ensure that '
        'content behaves the same in preview and production. For a serverless CMS backed by '
        'DynamoDB, this frontend structure provides the flexibility needed for rich technical '
        'publishing while keeping the runtime lightweight and maintainable.</p>\n'
    )

    infrastructure_section = (
        '<h2>Infrastructure as Code with AWS CDK</h2>\n'
        '<p>The CMS infrastructure is defined with the AWS Cloud Development Kit using TypeScript. '
        'Instead of manually creating resources in the console or maintaining a collection of '
        'disconnected deployment scripts, the entire platform is described as code: DynamoDB tables, '
        'S3 buckets, Cognito authentication, Lambda functions, API Gateway routes, CloudFront '
        'distributions, WAF rules, monitoring alarms, and email infrastructure. This gives the '
        'project a repeatable deployment model where the same source code can create a development, '
        'staging, or production environment with predictable naming, permissions, and '
        'configuration.</p>\n'
        '<p>The main benefit of this approach is that infrastructure changes follow the same '
        'engineering workflow as application changes. A new table index, Lambda permission, cache '
        'behavior, or environment variable can be reviewed in a pull request, synthesized into a '
        'CloudFormation template, and deployed consistently. CDK also makes it practical to encode '
        'architectural decisions directly into reusable constructs, so the stack reads more like a '
        'system design document than a long list of individual AWS resources.</p>\n'
        '<h3>CDK Construct Boundaries</h3>\n'
        '<p>The stack is split into domain-specific constructs rather than being implemented as one '
        'large file. Each construct owns a coherent part of the architecture and exposes only the '
        'resources other constructs need. For example, the database construct creates and configures '
        'the DynamoDB tables, then exposes table references to the API construct. The storage '
        'construct owns the S3 buckets and bucket policies. The authentication construct owns '
        'Cognito configuration. This keeps dependencies explicit and prevents unrelated '
        'infrastructure concerns from becoming tightly coupled.</p>\n'
        '<p>This boundary style also makes the system easier to evolve. If the media pipeline later '
        'needs image processing queues or additional bucket lifecycle rules, those changes stay '
        'inside the storage construct. If the API grows new Lambda functions, the Lambda API '
        'construct can add them without forcing the CDN or WAF definitions to change. In practice, '
        'this turns the CDK application into a set of small architectural modules that can be '
        'reasoned about independently while still composing into one deployable stack.</p>\n'
        '<pre><code class="language-mermaid">'
        'flowchart LR\n'
        '    Stack[ServerlessCmsStack] --> Database[DatabaseConstruct]\n'
        '    Stack --> Storage[StorageConstruct]\n'
        '    Stack --> Auth[AuthConstruct]\n'
        '    Stack --> LambdaApi[LambdaApiConstruct]\n'
        '    Stack --> Cdn[CdnConstruct]\n'
        '    Stack --> Waf[WafConstruct]\n'
        '    Stack --> Monitoring[MonitoringConstruct]\n'
        '    Stack --> Email[EmailConstruct]\n'
        '    Database --> Tables[(6 DynamoDB Tables)]\n'
        '    Storage --> Buckets[(S3 Buckets)]\n'
        '    Auth --> UserPool[Cognito User Pool]\n'
        '    LambdaApi --> Functions[Lambda Functions + API GW]\n'
        '    Cdn --> Distributions[CloudFront Distributions]\n'
        '</code></pre>\n'
        '<p><strong>Code Example 1: CDK construct composition in TypeScript</strong></p>\n'
        '<div class="not-prose my-6 overflow-x-auto rounded-lg"><pre class="shiki nord overflow-x-auto rounded-lg text-sm" style="background-color: #2e3440ff" tabindex="0"><code>'
        '<span class="line"><span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">database</span> <span style="color: #81A1C1">=</span> <span style="color: #81A1C1">new</span> <span style="color: #88C0D0">DatabaseConstruct</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">this</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;Database&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">environment</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"><span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">storage</span> <span style="color: #81A1C1">=</span> <span style="color: #81A1C1">new</span> <span style="color: #88C0D0">StorageConstruct</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">this</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;Storage&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">environment</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"><span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">auth</span> <span style="color: #81A1C1">=</span> <span style="color: #81A1C1">new</span> <span style="color: #88C0D0">AuthConstruct</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">this</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;Auth&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span> <span style="color: #D8DEE9">environment</span> <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"></span>'
        '<span class="line"><span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">lambdaApi</span> <span style="color: #81A1C1">=</span> <span style="color: #81A1C1">new</span> <span style="color: #88C0D0">LambdaApiConstruct</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">this</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;LambdaApi&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">environment</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">contentTable</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">database</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">contentTable</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">mediaTable</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">database</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">mediaTable</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">mediaBucket</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">storage</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">mediaBucket</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">userPool</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">auth</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">userPool</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line"><span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '<span class="line"></span>'
        '<span class="line"><span style="color: #81A1C1">const</span> <span style="color: #D8DEE9">cdn</span> <span style="color: #81A1C1">=</span> <span style="color: #81A1C1">new</span> <span style="color: #88C0D0">CdnConstruct</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">this</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;Cdn&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">environment</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">api</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">lambdaApi</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">api</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">publicBucket</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">storage</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">publicBucket</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">  <span style="color: #D8DEE9">adminBucket</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">storage</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">adminBucket</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line"><span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">;</span></span>'
        '</code></pre></div>\n'
        '<p>The composition code is intentionally straightforward. Constructs are instantiated in '
        'dependency order, and resources are passed across boundaries only when another construct '
        'needs to integrate with them. The API construct receives table and bucket references so it '
        'can grant Lambda functions the least-privilege permissions required for content and media '
        'operations. The CDN construct receives the API and bucket origins it needs to define cache '
        'behaviors and routing rules. This keeps ownership clear: one construct creates a resource, '
        'another construct may consume it, but resource policy and permission grants remain '
        'deliberate.</p>\n'
        '<h3>Deployment Flow</h3>\n'
        '<p>Each deployment starts with environment parameterization. The stack receives an '
        'environment value such as development, staging, or production, and that value is used to '
        'derive names, removal policies, domain settings, cache durations, and operational '
        'thresholds. Development environments can be optimized for fast iteration and lower cost, '
        'while production can use stricter retention, stronger monitoring, and more conservative '
        'deletion policies. The important point is that these differences are expressed in code '
        'rather than remembered as manual deployment steps.</p>\n'
        '<p>Running <code>cdk synth</code> turns the TypeScript construct tree into a '
        'CloudFormation template. This step is useful not only as part of deployment, but also as a '
        'validation tool. Engineers can inspect the generated template, verify IAM policies, confirm '
        'that routes and origins are wired correctly, and catch synthesis errors before anything is '
        'deployed. Running <code>cdk deploy</code> then applies the change set to AWS. Because CDK '
        'tracks resources through CloudFormation, incremental updates are handled safely: adding a '
        'Lambda function, changing an environment variable, or introducing a new index becomes a '
        'controlled stack update.</p>\n'
        '<p>The result is an infrastructure workflow that is repeatable, reviewable, and aligned '
        'with the application code. The CMS can be recreated from source, deployed into isolated '
        'environments, and evolved through small, auditable changes. For a serverless system with '
        'many managed services, that consistency is what keeps the architecture maintainable over '
        'time.</p>\n'
    )

    backend_section = (
        '<h2>Serverless Backend Architecture</h2>\n'
        '<p>The backend is implemented with Python 3.12 Lambda functions behind API Gateway, with '
        'DynamoDB as the primary data store and a small set of shared utilities for authentication, '
        'persistence, validation, and response formatting. The goal is to keep each function '
        'focused on a single business capability while avoiding copy-and-paste infrastructure code '
        'inside every handler. Lambda provides the execution boundary, API Gateway provides the '
        'HTTP surface area, and DynamoDB provides low-latency persistence without requiring '
        'database servers, connection pools, or capacity planning in the traditional sense.</p>\n'
        '<p>This design fits the operational profile of a CMS well. Administrative traffic tends '
        'to be bursty, public content reads benefit from caching at CloudFront, and write paths '
        'need to be reliable without requiring always-on compute. By using small functions and '
        'shared libraries, the backend stays easy to test locally and simple to deploy. Each '
        'handler is just Python code that receives an API Gateway event, validates input, calls a '
        'repository, and returns a JSON response.</p>\n'
        '<h3>Lambda Function Organization</h3>\n'
        '<p>The Lambda source tree is organized by domain. The <code>content/</code> directory '
        'contains handlers for posts, pages, revisions, publishing workflows, and lookup '
        'operations. The <code>media/</code> directory handles uploads, media metadata, and S3 '
        'object references. The <code>users/</code> directory contains profile and administrative '
        'user operations. The <code>plugins/</code> directory provides extension points for '
        'optional CMS features. The <code>scheduler/</code> directory handles background tasks '
        'such as publishing scheduled content or running maintenance jobs. Finally, the '
        '<code>shared/</code> directory contains cross-cutting utilities used by all of the '
        'handlers.</p>\n'
        '<p>This layout creates a useful separation between HTTP entry points and reusable backend '
        'behavior. Handlers remain thin: they parse requests, authorize the caller, validate the '
        'payload, and delegate persistence to repository classes. The shared layer owns common '
        'concerns such as DynamoDB query construction, Cognito token verification, CORS responses, '
        'structured logging, and error serialization. Keeping those concerns out of individual '
        'handlers makes the codebase easier to audit and reduces the chance that one endpoint '
        'implements authentication or response formatting differently from another.</p>\n'
        '<h3>Authenticated APIs with @require_auth</h3>\n'
        '<p>Authenticated endpoints use a custom <code>@require_auth</code> decorator. The '
        'decorator wraps the Lambda handler, extracts the bearer token from the incoming API '
        'Gateway event, validates the token against the Cognito user pool, checks issuer and '
        'claim information, and enforces role-based access rules before the handler is allowed to '
        'run. If validation fails, the wrapper returns a consistent unauthorized or forbidden '
        'response. If validation succeeds, it injects the authenticated <code>user_id</code> and '
        '<code>role</code> into the handler arguments.</p>\n'
        '<p>This pattern keeps authorization close to the endpoint declaration without making '
        'every handler reimplement JWT parsing. It is also easy to read during code review. A '
        "handler decorated with <code>@require_auth(roles=['admin', 'editor', 'author'])</code> "
        'clearly communicates who can call it. The business logic inside the handler can then '
        'assume that authentication has already happened and focus on the content operation '
        'itself.</p>\n'
        '<pre><code class="language-mermaid">'
        'sequenceDiagram\n'
        '    participant Browser\n'
        '    participant CloudFront\n'
        '    participant APIGateway as API Gateway\n'
        '    participant Lambda\n'
        '    participant Auth as @require_auth\n'
        '    participant Cognito\n'
        '    participant DynamoDB\n'
        '\n'
        '    Browser->>CloudFront: HTTPS request\n'
        '    CloudFront->>APIGateway: Forward /api/v1/*\n'
        '    APIGateway->>Lambda: Invoke handler\n'
        '    Lambda->>Auth: Validate JWT token\n'
        '    Auth->>Cognito: Verify issuer + claims\n'
        '    Cognito-->>Auth: Valid claims\n'
        '    Auth-->>Lambda: user_id, role\n'
        '    Lambda->>DynamoDB: Query/Put content\n'
        '    DynamoDB-->>Lambda: Result\n'
        '    Lambda-->>APIGateway: JSON response\n'
        '    APIGateway-->>CloudFront: HTTP response\n'
        '    CloudFront-->>Browser: Response\n'
        '</code></pre>\n'
        '<p><strong>Code Example 2: Lambda handler with @require_auth</strong></p>\n'
        '<div class="not-prose my-6 overflow-x-auto rounded-lg"><pre class="shiki nord overflow-x-auto rounded-lg text-sm" style="background-color: #2e3440ff" tabindex="0"><code>'
        '<span class="line"><span style="color: #81A1C1">from</span> <span style="color: #D8DEE9">shared</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">auth</span> <span style="color: #81A1C1">import</span> <span style="color: #D8DEE9">require_auth</span></span>'
        '<span class="line"><span style="color: #81A1C1">from</span> <span style="color: #D8DEE9">shared</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">db</span> <span style="color: #81A1C1">import</span> <span style="color: #D8DEE9">ContentRepository</span></span>'
        '<span class="line"></span>'
        '<span class="line"><span style="color: #D8DEE9">content_repo</span> <span style="color: #81A1C1">=</span> <span style="color: #88C0D0">ContentRepository</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line"></span>'
        '<span class="line"><span style="color: #D08770">@require_auth</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">roles</span><span style="color: #81A1C1">=</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;admin&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;editor&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;author&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line"><span style="color: #81A1C1">def</span> <span style="color: #88C0D0">handler</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">event</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">context</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">user_id</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">role</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">:</span></span>'
        '<span class="line">    <span style="color: #D8DEE9">body</span> <span style="color: #81A1C1">=</span> <span style="color: #D8DEE9">json</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">loads</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">event</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">get</span><span style="color: #ECEFF4">(</span><span style="color: #A3BE8C">&#39;body&#39;</span><span style="color: #ECEFF4">)</span> <span style="color: #81A1C1">or</span> <span style="color: #A3BE8C">&#39;{}&#39;</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line">    <span style="color: #D8DEE9">item</span> <span style="color: #81A1C1">=</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;id&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #88C0D0">str</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">uuid</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">uuid4</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;type&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;post&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;title&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">body</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;title&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;slug&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">body</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;slug&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;content&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">body</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;content&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;status&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;draft&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;author&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">user_id</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;created_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #88C0D0">int</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">time</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">time</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;updated_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #88C0D0">int</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">time</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">time</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">    <span style="color: #ECEFF4">}</span></span>'
        '<span class="line">    <span style="color: #D8DEE9">result</span> <span style="color: #81A1C1">=</span> <span style="color: #D8DEE9">content_repo</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">create</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">item</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line">    <span style="color: #81A1C1">return</span> <span style="color: #ECEFF4">{</span><span style="color: #A3BE8C">&#39;statusCode&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #B48EAD">201</span><span style="color: #ECEFF4">,</span> <span style="color: #A3BE8C">&#39;body&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">json</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">dumps</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">result</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">}</span></span>'
        '</code></pre></div>\n'
        '<p>The handler above is deliberately small. It does not know how to verify Cognito '
        'tokens, how to build DynamoDB expressions, or how to serialize unexpected exceptions. '
        'Those responsibilities live in shared utilities and repository classes. The handler owns '
        'the workflow: accept a request, construct a content item, persist it, and return the '
        'created resource. This makes the endpoint easy to test with representative API Gateway '
        'events and easy to modify when the content model changes.</p>\n'
        '<h3>DynamoDB Access Patterns</h3>\n'
        '<p>The content storage model uses DynamoDB with access patterns designed up front. Rather '
        'than modeling the database like a relational schema, the table is optimized around the '
        'queries the CMS actually needs: fetch a post by ID, resolve a post by slug, list content '
        'by type in chronological order, list published content, and update an item without losing '
        'immutable creation metadata. Items include a primary identifier, a content type, '
        'timestamps, publication state, and denormalized fields that support efficient reads.</p>\n'
        '<p>Composite attributes make the access patterns explicit. A value such as '
        '<code>type#timestamp</code> can combine the logical content type with a time component, '
        'allowing lists like recent posts or pages to be queried efficiently. Global secondary '
        'indexes provide alternate lookup paths. A <code>slug-index</code> supports resolving '
        'public URLs without scanning the table. A <code>type-published_at-index</code> supports '
        'listing published items by type and publication date, which is a common path for blogs, '
        'feeds, archives, and sitemap generation.</p>\n'
        '<p>This approach avoids table scans and keeps Lambda execution predictable. It also keeps '
        'the application code honest: repository methods are named around access patterns such as '
        '<code>get_by_slug</code>, <code>list_published_by_type</code>, and <code>update</code>, '
        'rather than exposing arbitrary database operations throughout the codebase. When a new '
        'feature requires a new query, it becomes an architectural decision: either it fits an '
        'existing index, or the data model is extended intentionally.</p>\n'
        '<p><strong>Code Example 4: DynamoDB upsert pattern</strong></p>\n'
        '<div class="not-prose my-6 overflow-x-auto rounded-lg"><pre class="shiki nord overflow-x-auto rounded-lg text-sm" style="background-color: #2e3440ff" tabindex="0"><code>'
        '<span class="line"><span style="color: #D8DEE9">existing</span> <span style="color: #81A1C1">=</span> <span style="color: #D8DEE9">repo</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">get_by_slug</span><span style="color: #ECEFF4">(</span><span style="color: #A3BE8C">&quot;how-we-built-this-serverless-cms&quot;</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line"><span style="color: #D8DEE9">now</span> <span style="color: #81A1C1">=</span> <span style="color: #88C0D0">int</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">time</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">time</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line"></span>'
        '<span class="line"><span style="color: #81A1C1">if</span> <span style="color: #D8DEE9">existing</span><span style="color: #ECEFF4">:</span></span>'
        '<span class="line">    <span style="color: #D8DEE9">repo</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">update</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">existing</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;id&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">existing</span><span style="color: #ECEFF4">[</span><span style="color: #A3BE8C">&#39;created_at&#39;</span><span style="color: #ECEFF4">]</span><span style="color: #ECEFF4">,</span> <span style="color: #ECEFF4">{</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;title&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">title</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;content&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">html_content</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;metadata&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">metadata</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;status&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;published&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;published_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">existing</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">get</span><span style="color: #ECEFF4">(</span><span style="color: #A3BE8C">&#39;published_at&#39;</span><span style="color: #ECEFF4">,</span> <span style="color: #D8DEE9">now</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;updated_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">now</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">    <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span></span>'
        '<span class="line"><span style="color: #81A1C1">else</span><span style="color: #ECEFF4">:</span></span>'
        '<span class="line">    <span style="color: #D8DEE9">repo</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">create</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">{</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;id&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #88C0D0">str</span><span style="color: #ECEFF4">(</span><span style="color: #D8DEE9">uuid</span><span style="color: #ECEFF4">.</span><span style="color: #8FBCBB">uuid4</span><span style="color: #ECEFF4">(</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">)</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;type&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;post&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;type#timestamp&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">f&#39;post#{now}&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;title&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">title</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;slug&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;how-we-built-this-serverless-cms&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;content&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">html_content</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;status&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #A3BE8C">&#39;published&#39;</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;metadata&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">metadata</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;created_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">now</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;updated_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">now</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">        <span style="color: #A3BE8C">&#39;published_at&#39;</span><span style="color: #ECEFF4">:</span> <span style="color: #D8DEE9">now</span><span style="color: #ECEFF4">,</span></span>'
        '<span class="line">    <span style="color: #ECEFF4">}</span><span style="color: #ECEFF4">)</span></span>'
        '</code></pre></div>\n'
        '<p>The upsert pattern is useful for deployment scripts, content migrations, and '
        'repeatable article publishing jobs. The script first looks up an item by slug. If it '
        'already exists, it updates mutable fields while preserving original creation metadata and '
        'publication date. If it does not exist, it creates a new item with the attributes '
        'required by the table and its indexes. This makes content deployment idempotent: the same '
        'script can run multiple times without creating duplicates.</p>\n'
        '<p>Together, the Lambda organization, authentication decorator, and DynamoDB repositories '
        'create a backend that is small, composable, and operationally simple. Each endpoint has a '
        'clear purpose, each shared utility removes duplicated boilerplate, and each database '
        'query maps to a known access pattern. That combination is what makes the serverless CMS '
        'practical to maintain as it grows beyond the first set of features.</p>\n'
    )

    auth_section = (
        '<h2>Authentication and Authorization</h2>\n'
        '<p>A serverless CMS needs an identity layer that is secure by default, easy to '
        'operate, and independent from the application runtime. AWS Cognito user pools provide '
        'that foundation by managing user registration, sign-in, password policies, MFA options, '
        'account recovery, and token issuance without requiring the CMS to store credentials '
        'directly. In this architecture, Cognito is the system of record for authenticated '
        'identities, while the application tables store CMS-specific profile attributes such as '
        'display name, publishing preferences, and role assignments. This separation keeps '
        'credential handling inside a managed AWS service and allows the CMS API to focus on '
        'content operations rather than authentication plumbing.</p>\n'
        '<p>After a user signs in, Cognito issues JSON Web Tokens that are presented to API '
        'Gateway and Lambda-backed endpoints. Each protected Lambda function validates the token '
        'signature, issuer, audience, expiration, and token use before processing the request. '
        'The validation step happens before any business logic executes, which prevents '
        'unauthenticated requests from reaching content mutation paths. In practice, the decoded '
        'token becomes the request identity context: it contains the subject identifier, '
        'username, groups or custom claims, and any attributes required to correlate the request '
        'with the CMS user profile. Lambda functions can then make authorization decisions using '
        'a consistent identity object rather than re-parsing headers in every handler.</p>\n'
        '<p>A common implementation pattern is a <code>@require_auth</code> decorator that wraps '
        'protected handlers. The decorator is responsible for extracting the bearer token, '
        'validating it, loading the user record or role metadata, and attaching an authorization '
        'context to the request. This middleware-style approach keeps the handler code readable '
        'and makes access control easier to audit. For example, a create article function can '
        'declare that it requires an author, editor, or admin role, while a comment moderation '
        'function can require editor or admin privileges. Failed validation returns a clear '
        'unauthorized response; failed permission checks return a forbidden response. That '
        'distinction matters for client behavior and for operational observability.</p>\n'
        '<p>Role-based access control gives the CMS a predictable permission model. The admin '
        'role has full access to users, settings, content, comments, media, plugins, and '
        'destructive maintenance actions. The editor role can manage content across the site, '
        'review and publish submissions, moderate comments, and organize media, but does not '
        'administer security-sensitive settings. The author role can create and update owned '
        'content, upload supporting media, and submit work for review, but cannot publish or '
        'modify content owned by others unless granted explicit workflow permissions. The viewer '
        'role is read-only and is useful for preview users, stakeholders, or authenticated '
        'members who can access private content without changing it. By keeping the role '
        'definitions small and mapping them to explicit permissions, the architecture avoids '
        'scattered one-off checks and remains maintainable as the CMS grows.</p>\n'
    )

    media_section = (
        '<h2>Media Handling and CDN Delivery</h2>\n'
        '<p>Binary assets belong in object storage, not in the content database. Amazon S3 '
        'provides durable, cost-effective storage for images, documents, and other uploaded '
        'files, while DynamoDB stores the searchable metadata that describes those assets. The '
        'media record can include the asset identifier, owner, original filename, MIME type, '
        'byte size, dimensions, alt text, caption, upload timestamp, storage key, derivative '
        'keys, and publication status. Keeping metadata in DynamoDB makes it efficient to list, '
        'filter, and attach media to articles, while S3 remains the authoritative location for '
        'the actual file bytes.</p>\n'
        '<p>CloudFront sits in front of the S3 media bucket to provide global delivery, '
        'caching, TLS termination, and predictable public URLs. The CMS can generate canonical '
        'media URLs that point to the distribution rather than directly to S3, which allows '
        'cache behavior, compression, origin access controls, and invalidation strategy to '
        'evolve independently from the application code. For private or embargoed assets, the '
        'same architecture can be extended with signed URLs or signed cookies. For public '
        'editorial media, long-lived cache headers combined with content-addressed or versioned '
        'object keys reduce origin load and improve page performance for visitors across '
        'regions.</p>\n'
        '<p>The upload workflow is coordinated by media Lambda functions. A client requests an '
        'upload operation, the Lambda validates the caller, records an initial media item, and '
        'either accepts the file through the API or returns a pre-signed S3 upload target '
        'depending on the size and client capability. Once the original file lands in S3, an '
        'image processing step creates derivative renditions such as small, medium, and large '
        'thumbnails for responsive layouts. These renditions are written back to S3 and linked '
        'from the DynamoDB media metadata record. The result is a clean split of '
        'responsibilities: Lambda enforces policy and orchestrates processing, S3 stores '
        'originals and derivatives, DynamoDB indexes the library, and CloudFront delivers '
        'optimized assets to readers.</p>\n'
    )

    content_features_section = (
        '<h2>Content Features</h2>\n'
        '<p>The content layer is more than article storage. A practical CMS needs editorial '
        'feedback, rich media presentation, and extension points that let teams adapt the '
        'platform without rewriting the core. The following features show how the serverless '
        'architecture supports public interaction, visual storytelling, and modular '
        'customization while preserving the same operational model: small Lambda functions, '
        'DynamoDB-backed state, S3-backed assets, and clear API boundaries.</p>\n'
        '<pre><code class="language-mermaid">flowchart LR\n'
        '    Admin[Admin Panel] --> CreateAPI[Content Lambda - create.py]\n'
        '    CreateAPI --> ContentTable[(cms-content-env)]\n'
        '\n'
        '    Admin --> UploadAPI[Media Lambda - upload.py]\n'
        '    UploadAPI --> S3[(S3 Media Bucket)]\n'
        '    UploadAPI --> MediaTable[(cms-media-env)]\n'
        '\n'
        '    Public[Public Website] --> GetAPI[Content Lambda - get.py]\n'
        '    GetAPI --> ContentTable\n'
        '    Public --> CDN[CloudFront]\n'
        '    CDN --> S3</code></pre>\n'
        '<h3>Comment System and Moderation</h3>\n'
        '<p>The comment system allows public visitors or authenticated users to submit '
        'responses to published content while keeping moderation controls in the administrative '
        'workflow. A comment submission endpoint validates the target content item, normalizes '
        'the author fields, captures request metadata, and writes the comment to a DynamoDB '
        'table with an initial status. For trusted authenticated users, the CMS may allow '
        'immediate approval based on policy, but the safer default is to create comments in a '
        'pending state. This gives editors a review queue and prevents untrusted input from '
        'appearing on public pages before it is evaluated.</p>\n'
        '<p>Moderation is modeled as a set of explicit status transitions: pending to approved, '
        'pending to rejected, pending to spam, and approved to rejected when a previously '
        'visible comment must be removed. Each transition is performed through a moderation '
        'Lambda function that checks editor or admin permissions, records the moderator '
        'identity, and updates timestamps for auditability. Approved comments become visible '
        'through public read endpoints, while rejected and spam comments remain hidden but '
        'available for administrative review and reporting. This approach keeps the public '
        'query path simple because it only needs to request approved comments for a content '
        'item.</p>\n'
        '<p>Spam prevention can be layered into the submission path without changing the core '
        'moderation model. AWS WAF can provide rate limiting, IP reputation rules, bot control '
        'features, and optional CAPTCHA challenges before traffic reaches API Gateway. The '
        'Lambda function can also apply lightweight checks such as maximum link counts, repeated '
        'submission detection, or blocked terms. These measures reduce noise in the moderation '
        'queue, but they do not replace the state machine. The status-driven workflow remains '
        'the source of truth for whether a comment is pending, approved, rejected, or '
        'classified as spam.</p>\n'
        '<h3>Gallery Album Experience</h3>\n'
        '<p>Gallery albums organize media assets into curated collections with their own '
        'metadata. An album record can store the title, description, slug, cover image, sort '
        'order, visibility, and references to the selected media items. Because the actual '
        'images remain in S3 and the media metadata remains in DynamoDB, albums can reuse the '
        'same asset across multiple contexts without copying files. Editors can build '
        'portfolios, event recaps, product galleries, or visual essays by arranging existing '
        'images and adding album-level narrative context.</p>\n'
        '<p>On the public website, albums are rendered as responsive image grids that use the '
        'generated thumbnail sizes for efficient loading. The small rendition can power dense '
        'grid previews, while medium or large renditions are used as the viewport expands. A '
        'lightbox interaction lets visitors open an image, navigate through the album, read '
        'captions, and view higher-resolution renditions without leaving the page. This design '
        'balances performance and immersion: the initial page stays fast because it loads '
        'optimized thumbnails, and the richer viewing experience is requested only when the '
        'reader engages with the gallery.</p>\n'
        '<h3>Plugin System</h3>\n'
        '<p>A plugin system gives the CMS a controlled way to extend behavior without modifying '
        'the core application. The most flexible model is hook-based: the platform defines '
        'named extension points such as before content save, after content publish, media '
        'uploaded, comment approved, or page rendered. Plugins register handlers for those hooks '
        'and receive a structured context object that contains the relevant content, user, '
        'request, and environment data. This keeps the integration surface deliberate and avoids '
        'tight coupling between plugin code and internal implementation details.</p>\n'
        '<p>Plugin lifecycle management should be explicit. Installing a plugin stores its '
        'manifest, configuration schema, version, and required permissions. Activating a plugin '
        'makes its hooks eligible for execution, while deactivating it leaves the configuration '
        'intact but removes it from the runtime path. This distinction allows administrators to '
        'troubleshoot safely and roll back behavior without deleting plugin state. The lifecycle '
        'can also include compatibility checks so a plugin declares the CMS versions, hooks, '
        'and capabilities it expects before activation is allowed.</p>\n'
        '<p>The <code>PluginManager</code> execution model is responsible for discovering '
        'active plugins, ordering handlers, enforcing timeouts, and isolating failures. In a '
        'serverless architecture, the manager should be lightweight and deterministic because it '
        'may run inside many Lambda invocations. A plugin that enriches SEO metadata, sends a '
        'webhook, transforms a content field, or adds analytics annotations should not be able '
        'to destabilize the publishing path. By treating plugins as hook subscribers with '
        'constrained permissions and observable execution, the CMS can evolve through extensions '
        'while preserving the reliability and security posture of the core platform.</p>\n'
    )

    operations_section = (
        '<h2>Operations and Quality</h2>\n'
        '<p>Operational quality in this serverless CMS comes from treating migration, testing, '
        'backup, and recovery as first-class architecture concerns rather than afterthoughts. The '
        'platform behind serverless.celestium.life is small enough to remain understandable, but '
        'it still has to protect content, deploy safely, and prove that core behavior remains '
        'correct as the implementation evolves. AWS CDK, Python Lambda functions, DynamoDB, S3, '
        'and automated tests all contribute to an operating model where the system can be rebuilt, '
        'validated, and recovered with repeatable processes.</p>\n'
        '<h3>WordPress Migration</h3>\n'
        '<p>The migration path was anchored by the <code>migrate_wordpress.py</code> script, '
        'which converts a WordPress export into the content model used by the serverless CMS. '
        'WordPress export files are XML documents with posts, pages, authors, taxonomies, '
        'publication dates, slugs, excerpts, and body content represented in a format designed '
        'around the WordPress database schema. The migration script acts as an anti-corruption '
        'layer: it reads that source format, normalizes the fields that matter to the new '
        'application, and emits DynamoDB-ready items that match the access patterns of the CMS '
        'rather than the tables of the old system.</p>\n'
        '<p>That transformation step is where most of the preservation work happens. Titles, '
        'slugs, status values, timestamps, rendered content, categories, and metadata need to '
        'survive the move without forcing the new system to behave like WordPress internally. '
        'The script can map legacy identifiers to stable new keys, preserve canonical URLs where '
        'appropriate, and carry forward publication state so that drafts and published articles '
        'remain distinct. By doing the work in an explicit migration program, the project avoids '
        'a risky manual copy process and creates a repeatable import path that can be tested, '
        'reviewed, and rerun when necessary.</p>\n'
        '<p>Media migration is handled as a related but separate concern. WordPress uploads that '
        'were previously served from the old site are imported into S3 so the serverless '
        'application can reference durable object storage instead of a WordPress filesystem. '
        'During the transition, content references can be rewritten to point at the new asset '
        'locations, while the original article bodies and media relationships are retained. This '
        'approach allowed existing content to remain intact during the move to DynamoDB and S3, '
        'while giving the new platform the operational benefits of managed storage and a simpler '
        'runtime.</p>\n'
        '<h3>Property-Based Testing with Hypothesis</h3>\n'
        '<p>The backend test strategy uses Hypothesis to exercise behavior across broad input '
        'spaces rather than relying only on hand-picked examples. Strategies generate '
        'representative content records, slugs, publication states, timestamps, request payloads, '
        'and boundary cases that are easy to miss in conventional tests. For a CMS, this is '
        'especially valuable because user-generated content tends to contain surprising '
        'combinations of empty fields, unusual Unicode, long strings, reordered metadata, and '
        'partially updated objects. Property-based tests make those combinations routine instead '
        'of exceptional.</p>\n'
        '<p>The project also benefits from writing requirements in an EARS-style pattern, where '
        'behavior is stated in precise forms such as event-driven, state-driven, optional-feature, '
        'and unwanted-behavior requirements. Those statements translate naturally into properties: '
        'when a valid article is saved, it should be retrievable by its key; while an article is '
        'unpublished, it should not appear in public listing queries; if a slug is normalized, '
        'repeated normalization should be stable; when invalid input is submitted, the system '
        'should reject it without corrupting stored state. The result is a closer connection '
        'between requirements and executable tests.</p>\n'
        '<p>This does not eliminate example-based tests; it changes their role. Example tests '
        'remain useful for documenting specific scenarios, regression cases, and integration '
        'boundaries, while Hypothesis tests search the larger space around those examples. In '
        'the CMS, property tests provide confidence that serializers, validators, repository '
        'functions, and request handlers preserve invariants across many generated inputs. That '
        'confidence is important in a serverless architecture, where small functions are '
        'independently deployable and correctness depends on consistent contracts between API '
        'Gateway, Lambda, DynamoDB, and the frontends.</p>\n'
        '<h3>Backup and Restore</h3>\n'
        '<p>Backup strategy follows the storage boundaries of the system. DynamoDB provides '
        'export capabilities that can capture table data to S3 without requiring custom scanning '
        'jobs or application downtime, making it a practical foundation for periodic content '
        'backups. Media assets already live in S3, so backup can be implemented with versioning, '
        'lifecycle policies, replication, or scheduled sync jobs to another bucket or account. '
        'Together, those mechanisms protect both structured CMS records and the binary assets '
        'that articles depend on.</p>\n'
        '<p>Restoration is simpler because the infrastructure is defined in AWS CDK rather than '
        'reconstructed from a console checklist. In a disaster recovery scenario, the stack can '
        'be redeployed, DynamoDB data can be restored or imported, S3 media can be synchronized '
        'back into the expected bucket structure, and application configuration can be reapplied '
        'through the same deployment pipeline. Infrastructure as code does not remove the need to '
        'practice recovery, but it does turn recovery into an executable procedure. For a content '
        'system, that repeatability is as important as the backup files themselves.</p>\n'
    )

    cicd_section = (
        '<h2>CI/CD Pipeline</h2>\n'
        '<p>The CI/CD pipeline for the serverless CMS is designed to verify each layer before '
        'infrastructure changes are deployed. A git push starts GitHub Actions, which runs the '
        'Python backend tests, the admin panel tests, and the public website tests as separate '
        'quality gates. This separation reflects the architecture: Lambda handlers and persistence '
        'logic have different failure modes than React components, routing, forms, and rendering '
        'behavior. Keeping the jobs distinct makes failures easier to diagnose while still '
        'requiring the full system to pass before deployment continues.</p>\n'
        '<p>After the test suites complete, the pipeline runs CDK synthesis to convert the '
        'TypeScript infrastructure definition into a deployable CloudFormation template. Synthesis '
        'is a meaningful validation step because it catches broken constructs, missing '
        'configuration, invalid references, and environment-specific assumptions before AWS '
        'deployment begins. It also reinforces the idea that infrastructure changes are reviewed '
        'and tested in the same workflow as application code. Backend code, frontend code, and '
        'infrastructure code move through one delivery path instead of being managed as unrelated '
        'release processes.</p>\n'
        '<p>The deployment stages then depend on the branch. Development branches can be deployed '
        'to a development environment quickly, while main is promoted more carefully through '
        'staging and then production. That distinction keeps feedback fast for routine work '
        'without treating production as just another automatic target. The manual approval before '
        'production is intentionally conservative: the system is serverless and inexpensive to '
        'redeploy, but the content it serves is still production content.</p>\n'
        '<pre><code class="language-mermaid">flowchart TD\n'
        '    Push[git push] --> GHA[GitHub Actions]\n'
        '    GHA --> TestBackend[pytest backend tests]\n'
        '    GHA --> TestAdmin[vitest admin panel]\n'
        '    GHA --> TestPublic[vitest public website]\n'
        '    TestBackend --> Synth[CDK synth]\n'
        '    TestAdmin --> Synth\n'
        '    TestPublic --> Synth\n'
        '    Synth --> Branch{Branch?}\n'
        '    Branch -- develop --> DeployDev[Deploy to dev]\n'
        '    Branch -- main --> DeployStaging[Deploy staging]\n'
        '    DeployStaging --> Approval{Manual approval}\n'
        '    Approval --> DeployProd[Deploy production]</code></pre>\n'
        '<p>The branch strategy provides a clear promotion model without requiring a heavyweight '
        'release train. The develop path is optimized for integration and early validation, while '
        'the main path represents a candidate that has already passed automated checks and is '
        'ready for staging. Staging gives the team a final environment to validate configuration, '
        'permissions, generated assets, and infrastructure behavior before approving production. '
        'Because the same CDK application defines each environment, differences are intentional '
        'and visible rather than accidental.</p>\n'
        '<p>Deployment is also where the serverless model pays off operationally. There are no '
        'long-lived application servers to patch or roll manually, and most changes resolve to '
        'Lambda versions, API configuration, DynamoDB permissions, S3 assets, and CloudFront or '
        'frontend updates. The pipeline still has to be disciplined, but the blast radius is '
        'easier to reason about when the stack is composed of managed services with explicit IAM '
        'permissions and declarative infrastructure. The result is a release process that is '
        'small, auditable, and appropriate for a CMS that should be reliable without demanding '
        'constant operational attention.</p>\n'
    )

    conclusion_section = (
        '<h2>Lessons Learned and Conclusion</h2>\n'
        '<p>Building the serverless CMS behind '
        '<a href="https://serverless.celestium.life">serverless.celestium.life</a> demonstrated '
        'that a content platform does not need a traditional server fleet to be maintainable, '
        'testable, and production-ready. The strongest architectural decision was to let managed '
        'services do the work they are good at: DynamoDB stores content with predictable access '
        'patterns, S3 stores media durably, Lambda runs focused backend operations, and CDK keeps '
        'the infrastructure reproducible. React and TypeScript provide a clean frontend '
        'development model, while GitHub Actions gives the project a consistent path from commit '
        'to deployment. The result is not a miniature clone of a monolithic CMS; it is a system '
        'shaped around serverless constraints and strengths.</p>\n'
        '<p>Several choices worked especially well. CDK made the infrastructure understandable '
        'as code, which matters when permissions, tables, buckets, functions, and deployment '
        'environments all have to evolve together. Property-based testing with Hypothesis raised '
        'the quality bar by checking invariants across generated inputs instead of trusting a '
        'narrow set of examples. The WordPress migration script gave the project a pragmatic '
        'bridge from an existing content archive to the new DynamoDB and S3 model. Those pieces '
        'combined to make the platform feel less like an experiment and more like an operational '
        'system with a clear lifecycle.</p>\n'
        '<p>The trade-offs were real. DynamoDB rewards careful access-pattern design, but it is '
        'less forgiving than a relational database when the model is vague or future queries are '
        'unknown. Lambda cold starts are manageable for this scale and runtime, but they still '
        'influence handler design, dependency size, and expectations around latency. Testing also '
        'becomes more nuanced when the system spans generated infrastructure, cloud permissions, '
        'frontend bundles, and backend properties. The surprise was not that any one layer was '
        'difficult; it was that quality depended on keeping the contracts between layers '
        'explicit.</p>\n'
        '<p>The final lesson is that serverless is most effective when it is treated as an '
        'architectural style, not simply a hosting option. A successful serverless CMS should '
        'embrace event boundaries, managed persistence, repeatable deployments, automated '
        'verification, and recovery procedures that match the services in use. For this project, '
        'that approach produced a compact platform that can publish content, preserve migrated '
        'history, and evolve without carrying the operational weight of a traditional CMS stack. '
        'The implementation is visible in the '
        '<a href="https://github.com/celesrenata/serverless-cms">celesrenata/serverless-cms</a> '
        'repository, and the running result at '
        '<a href="https://serverless.celestium.life">serverless.celestium.life</a> shows how far '
        'a focused serverless architecture can go when infrastructure, application code, testing, '
        'and operations are designed together.</p>\n'
    )

    return (
        title + img_article_hero + introduction_section
        + img_blog_listing + img_homepage
        + architecture_section + img_mermaid_system
        + infrastructure_section + img_mermaid_cdk + img_code_typescript
        + backend_section + img_mermaid_request + img_code_python
        + frontend_section + img_mermaid_frontend + img_blog_nixos
        + auth_section + img_admin_login
        + media_section + content_features_section
        + img_mermaid_data_flow + img_gallery + img_comments
        + operations_section + img_nixos_code
        + cicd_section + img_mermaid_cicd
        + conclusion_section
    )


def build_metadata() -> dict:
    """Build the article metadata."""
    return {
        "seo_title": "How We Built This Serverless CMS | Celestium",
        "seo_description": "A technical deep dive into the AWS CDK, Lambda, DynamoDB, Cognito, React, and CI/CD architecture behind serverless.celestium.life.",
        "tags": ["serverless", "aws", "cdk", "lambda", "dynamodb", "react", "typescript", "architecture", "cognito", "ci-cd"],
        "canonical_url": "https://serverless.celestium.life/blog/how-we-built-this-serverless-cms",
        "repository": "https://github.com/celesrenata/serverless-cms"
    }


def upsert_article(repo: ContentRepository, env: str, table_name: str) -> None:
    """Create or update the article in the content repository."""
    try:
        now = int(time.time())

        cdn_base = get_cdn_base(env)
        html_content = build_article_content(cdn_base)
        metadata = build_metadata()

        title = "How We Built This Serverless CMS"
        excerpt = "A technical deep dive into the serverless architecture behind serverless.celestium.life..."
        author = ""
        featured_image = ""
        status = "published"

        existing = repo.get_by_slug(SLUG)

        if existing:
            content_id = existing["id"]
            created_at = existing["created_at"]

            updates = {
                "title": title,
                "slug": SLUG,
                "content": html_content,
                "excerpt": excerpt,
                "author": author,
                "featured_image": featured_image,
                "status": status,
                "metadata": metadata,
                "published_at": existing.get("published_at") or now,
                "updated_at": now,
            }

            repo.update(content_id, created_at, updates)
            action = "Updated"

        else:
            content_id = str(uuid.uuid4())

            item = {
                "id": content_id,
                "type": "post",
                "type#timestamp": f"post#{now}",
                "title": title,
                "slug": SLUG,
                "content": html_content,
                "excerpt": excerpt,
                "author": author,
                "featured_image": featured_image,
                "status": status,
                "metadata": metadata,
                "created_at": now,
                "updated_at": now,
                "published_at": now,
            }

            repo.create(item)
            action = "Created"

        print(f"{action} architecture article.")
        print(f"Environment: {env}")
        print(f"Table: {table_name}")
        print(f"ID: {content_id}")
        print(f"Slug: {SLUG}")

    except Exception as exc:
        print(
            f"Error upserting architecture article. "
            f"Environment: {env}, Table: {table_name}, Slug: {SLUG}, Error: {exc}"
        )
        sys.exit(1)


def main() -> None:
    """Run the article creation script."""
    args = parse_args()
    table_name = f"cms-content-{args.env}"
    os.environ["CONTENT_TABLE"] = table_name

    repo = ContentRepository()
    upsert_article(repo, args.env, table_name)


if __name__ == "__main__":
    main()
