import { Helmet } from 'react-helmet-async';
import { useContentList } from '../hooks/useContent';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { CodeBlock } from '../components/CodeBlock';
import { Content } from '../types';

export const Projects = () => {
  const { data: settings } = useSiteSettings();
  const { data: projects, isLoading } = useContentList({
    type: 'project',
    status: 'published',
  });

  // Parse code blocks from project content
  const parseCodeBlocks = (content: string) => {
    const codeBlockRegex = /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g;
    const blocks: { language: string; code: string }[] = [];
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1],
        code: match[2],
      });
    }

    return blocks;
  };

  return (
    <>
      <Helmet>
        <title>Projects - {settings?.site_title || 'My Website'}</title>
        <meta
          name="description"
          content={`Code projects and technical work from ${settings?.site_title || 'our website'}`}
        />
      </Helmet>

      <div className="bg-white min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">Projects</h1>

          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : projects && projects.items.length > 0 ? (
            <div className="space-y-12">
              {projects.items.map((project: Content) => {
                const codeBlocks = parseCodeBlocks(project.content);

                return (
                  <article
                    key={project.id}
                    id={project.slug}
                    className="border-b border-gray-200 pb-12 last:border-b-0"
                  >
                    <header className="mb-6">
                      <h2 className="text-3xl font-bold text-gray-900 mb-2">
                        {project.title}
                      </h2>
                      {project.metadata?.tags && project.metadata.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {project.metadata.tags.map((tag: string) => (
                            <span
                              key={tag}
                              className="text-sm px-3 py-1 bg-gray-100 text-gray-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      {project.excerpt && (
                        <p className="text-lg text-gray-600">{project.excerpt}</p>
                      )}
                    </header>

                    {project.featured_image && (
                      <img
                        src={project.featured_image}
                        alt={project.title}
                        className="w-full rounded-lg mb-6 shadow-md"
                      />
                    )}

                    {/* Project Description */}
                    <div
                      className="prose prose-lg max-w-none mb-6"
                      dangerouslySetInnerHTML={{
                        __html: project.content.replace(
                          /<pre><code class="language-\w+">[\s\S]*?<\/code><\/pre>/g,
                          ''
                        ),
                      }}
                    />

                    {/* Code Blocks */}
                    {codeBlocks.length > 0 && (
                      <div className="space-y-4">
                        <h3 className="text-xl font-semibold text-gray-900">
                          Code Examples
                        </h3>
                        {codeBlocks.map((block, index) => (
                          <CodeBlock
                            key={index}
                            code={block.code}
                            language={block.language}
                            showLineNumbers={true}
                          />
                        ))}
                      </div>
                    )}

                    {/* Project Links */}
                    {project.metadata?.custom_fields?.github_url && (
                      <div className="mt-6">
                        <a
                          href={project.metadata.custom_fields.github_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
                        >
                          <svg
                            className="w-5 h-5 mr-2"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              fillRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                          View on GitHub
                        </a>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No projects found.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
