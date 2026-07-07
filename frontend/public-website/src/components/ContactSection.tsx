import { Card } from './ui/Card';

type ContactLink = {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const iconClassName = 'h-5 w-5 text-theme-text';

const contactLinks: ContactLink[] = [
  {
    label: 'GitHub',
    description: 'Open-source work and engineering examples.',
    href: 'https://github.com/celesrenata',
    icon: (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.463-1.11-1.463-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    description: 'Professional connections and collaboration.',
    href: 'https://www.linkedin.com/in/celesrenata',
    icon: (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Email',
    description: 'Direct inquiries about serverless engineering.',
    href: 'mailto:hello@celestium.dev',
    icon: (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 6L2 7" />
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    description: 'Thoughts on cloud-native and serverless tech.',
    href: 'https://x.com',
    icon: (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  {
    label: 'Blog',
    description: 'Technical writing on architecture and automation.',
    href: 'https://celestium.dev/blog',
    icon: (
      <svg className={iconClassName} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
      </svg>
    ),
  },
];

export function ContactSection() {
  return (
    <section
      aria-labelledby="contact-section-heading"
      className="bg-theme-surface px-4 py-16 sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 max-w-3xl">
          <h2
            id="contact-section-heading"
            className="text-3xl font-bold tracking-tight text-theme-text sm:text-4xl"
          >
            Get In Touch
          </h2>
          <p className="mt-4 text-base leading-7 text-theme-text-muted">
            Professional profiles, social references, and direct inquiries.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {contactLinks.map((link) => (
            <Card key={link.label} className="h-full">
              <a
                href={link.href}
                className="flex flex-col gap-3 text-theme-text transition hover:text-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-text focus:ring-offset-2 focus:ring-offset-theme-surface"
                target={link.href.startsWith('http') ? '_blank' : undefined}
                rel={
                  link.href.startsWith('http')
                    ? 'noopener noreferrer'
                    : undefined
                }
              >
                {link.icon}
                <span className="text-lg font-semibold">{link.label}</span>
                <span className="text-sm text-theme-text-muted">
                  {link.description}
                </span>
              </a>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
