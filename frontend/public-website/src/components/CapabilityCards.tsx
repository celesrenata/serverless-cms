import { Card } from './ui/Card';

type Capability = {
  title: string;
  description: string;
  icon: React.ReactNode;
};

const iconClassName = 'h-6 w-6 text-theme-text';

const capabilities: Capability[] = [
  {
    title: 'Serverless Architecture',
    description:
      'Designing event-driven, autoscaling systems with managed compute, queues, storage, and cloud-native integrations.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17.5 19H8a5 5 0 0 1-.7-9.95A6.5 6.5 0 0 1 19.5 11.5H20a3.5 3.5 0 0 1 0 7h-2.5" />
        <path d="M13 11l-3 5h4l-3 5" />
      </svg>
    ),
  },
  {
    title: 'Infrastructure as Code',
    description:
      'Building repeatable, version-controlled infrastructure with modular templates, policy guardrails, and reliable deployments.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 6l-4 6 4 6" />
        <path d="M16 6l4 6-4 6" />
        <path d="M12 4v16" />
        <path d="M9 8h6" />
        <path d="M9 16h6" />
      </svg>
    ),
  },
  {
    title: 'CI/CD Pipelines',
    description:
      'Automating build, test, security scanning, and release workflows to ship software safely and consistently.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M17 2l4 4-4 4" />
        <path d="M3 11V8a2 2 0 0 1 2-2h16" />
        <path d="M7 22l-4-4 4-4" />
        <path d="M21 13v3a2 2 0 0 1-2 2H3" />
      </svg>
    ),
  },
  {
    title: 'API Design',
    description:
      'Creating clear, secure, and maintainable APIs with strong contracts, predictable patterns, and developer-friendly documentation.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M8 8l-4 4 4 4" />
        <path d="M16 8l4 4-4 4" />
        <path d="M14 4l-4 16" />
        <path d="M7 20h10" />
      </svg>
    ),
  },
  {
    title: 'Cloud Security',
    description:
      'Applying identity, network, encryption, monitoring, and least-privilege controls across cloud environments.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <path d="M9 12l2 2 4-5" />
      </svg>
    ),
  },
  {
    title: 'Performance Optimization',
    description:
      'Improving latency, throughput, cost efficiency, and user experience through measurement-driven tuning.',
    icon: (
      <svg
        className={iconClassName}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 13a9 9 0 1 0-18 0" />
        <path d="M12 13l4-5" />
        <path d="M12 17h.01" />
        <path d="M7 13h.01" />
        <path d="M17 13h.01" />
        <path d="M11 3h2" />
      </svg>
    ),
  },
];

export function CapabilityCards() {
  return (
    <section
      className="bg-theme-surface px-4 py-16 text-theme-text sm:px-6 lg:px-8"
      aria-labelledby="capability-cards-heading"
    >
      <div className="mx-auto max-w-7xl">
        <h2
          id="capability-cards-heading"
          className="mb-10 text-center text-3xl font-bold tracking-tight text-theme-text sm:text-4xl"
        >
          What I Build
        </h2>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {capabilities.map((capability) => (
            <Card
              key={capability.title}
              className="h-full hover:-translate-y-1 hover:shadow-lg transition-all"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg border border-theme-border bg-theme-surface text-theme-text">
                {capability.icon}
              </div>

              <h3 className="mb-3 text-xl font-semibold text-theme-text">
                {capability.title}
              </h3>

              <p
                className="text-sm leading-6 text-theme-text"
                data-testid="capability-description"
              >
                {capability.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
