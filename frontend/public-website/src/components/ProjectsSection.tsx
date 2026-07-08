import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

type Project = {
  title: string;
  description: string;
  tags: string[];
};

const projects: Project[] = [
  {
    title: 'Serverless CMS Platform',
    description:
      'A full-featured content management system built on AWS Lambda, DynamoDB, and S3 with CDK infrastructure.',
    tags: ['AWS', 'CDK', 'Python'],
  },
  {
    title: 'Theme Engine',
    description:
      'Runtime CSS custom properties theming with five built-in themes, JSON import/export, and safe CSS upload.',
    tags: ['React', 'CSS', 'TypeScript'],
  },
  {
    title: 'Automation Pipeline',
    description:
      'GitHub Actions workflow with automated testing, multi-environment deployment, and rollback support.',
    tags: ['GitHub Actions', 'DevOps'],
  },
  {
    title: 'Cloud-Native Web Experience',
    description:
      'Performant frontend delivery, API integrations, and resilient managed cloud services.',
    tags: ['SVG', 'React', 'A11y'],
  },
];

export function ProjectsSection() {
  return (
    <section
      aria-labelledby="projects-section-heading"
      className="bg-theme-background px-4 py-16 text-theme-text sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-theme-text-muted">
              Build Notes
            </p>
            <h2
              id="projects-section-heading"
              className="text-3xl font-bold tracking-tight text-theme-text sm:text-4xl"
            >
              Recent Projects
            </h2>
          </div>

          <a
            href="/projects"
            className="inline-flex w-fit items-center rounded-md border border-theme-border px-4 py-2 text-sm font-medium text-theme-text transition hover:bg-theme-surface focus:outline-none focus:ring-2 focus:ring-theme-text focus:ring-offset-2 focus:ring-offset-theme-background"
          >
            View All Projects
            <span aria-hidden="true" className="ml-1">&rarr;</span>
          </a>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.title}
              className="h-full hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div className="flex h-full flex-col">
                <h3 className="text-xl font-semibold text-theme-text">
                  {project.title}
                </h3>
                <p className="mt-3 flex-1 text-sm leading-6 text-theme-text-muted">
                  {project.description}
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <Badge key={tag} variant="default">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
