export type NodeType = 'client' | 'cdn' | 'api-gateway' | 'lambda' | 'database' | 'storage' | 'auth' | 'monitoring' | 'ci-cd';

export interface ArchNode {
  id: string;
  type: NodeType;
  label: string;
  descriptionSimple: string;
  descriptionTechnical: string;
  x: number;  // Position as percentage (0-100)
  y: number;
  icon: string;
}

export interface ArchEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  style: 'solid' | 'dashed' | 'animated';
}

export interface ArchitectureMapData {
  nodes: ArchNode[];
  edges: ArchEdge[];
}

export const architectureMapData: ArchitectureMapData = {
  nodes: [
    {
      id: 'client',
      type: 'client',
      label: 'Client Browser',
      descriptionSimple: 'The visitor uses a web browser to view and manage content. It sends secure requests and displays the CMS interface.',
      descriptionTechnical: 'A browser-based client communicates over HTTPS using TLS. It loads static assets from CloudFront and sends REST or JSON API requests for dynamic CMS operations.',
      x: 6,
      y: 50,
      icon: 'globe',
    },
    {
      id: 'cloudfront',
      type: 'cdn',
      label: 'CloudFront CDN',
      descriptionSimple: 'CloudFront speeds up the website by serving content from locations close to users. It routes requests to the right backend service.',
      descriptionTechnical: 'Amazon CloudFront acts as the CDN and edge entry point, terminating HTTPS, caching static content, and routing path-based origins to S3 for assets or API Gateway for dynamic API calls.',
      x: 24,
      y: 50,
      icon: 'cloud',
    },
    {
      id: 's3-static',
      type: 'storage',
      label: 'S3 Static Assets',
      descriptionSimple: 'This stores the website files such as HTML, CSS, JavaScript, and images used by the CMS interface.',
      descriptionTechnical: 'Amazon S3 hosts versioned static build artifacts for the frontend. CloudFront retrieves objects from the S3 origin using HTTPS and can apply origin access controls to keep the bucket private.',
      x: 64,
      y: 20,
      icon: 'bucket',
    },
    {
      id: 'api-gateway',
      type: 'api-gateway',
      label: 'API Gateway',
      descriptionSimple: 'API Gateway receives app requests and passes them to backend functions. It provides a controlled doorway into the CMS services.',
      descriptionTechnical: 'Amazon API Gateway exposes HTTPS REST or HTTP API endpoints, handles request routing, throttling, CORS, authorization integration, and invokes Lambda functions through AWS service integration.',
      x: 44,
      y: 50,
      icon: 'server',
    },
    {
      id: 'lambda',
      type: 'lambda',
      label: 'Lambda Functions',
      descriptionSimple: 'Lambda runs the CMS backend logic without managing servers. It processes content changes, reads data, and handles uploads.',
      descriptionTechnical: 'AWS Lambda functions execute event-driven Python handlers invoked by API Gateway. They implement business logic, validate payloads, call DynamoDB APIs, write S3 objects, and emit structured logs and metrics.',
      x: 64,
      y: 50,
      icon: 'function',
    },
    {
      id: 'dynamodb',
      type: 'database',
      label: 'DynamoDB',
      descriptionSimple: 'DynamoDB stores CMS data such as pages, posts, settings, and metadata. It is fast, scalable, and does not require database servers.',
      descriptionTechnical: 'Amazon DynamoDB provides managed NoSQL tables with partition and sort keys, conditional writes, indexes, IAM-based access control, and low-latency read/write operations from Lambda via the AWS SDK.',
      x: 86,
      y: 42,
      icon: 'database',
    },
    {
      id: 's3-media',
      type: 'storage',
      label: 'S3 Media Storage',
      descriptionSimple: 'This stores uploaded media such as images, documents, and videos. The CMS can save and retrieve files as content changes.',
      descriptionTechnical: 'Amazon S3 stores user-uploaded media objects with bucket policies, encryption, lifecycle rules, and optional presigned URL workflows. Lambda writes and reads media using the S3 API over HTTPS.',
      x: 86,
      y: 66,
      icon: 'bucket',
    },
    {
      id: 'cognito',
      type: 'auth',
      label: 'Cognito Auth',
      descriptionSimple: 'Cognito manages user sign-in and protects private CMS features. It helps ensure only approved users can access admin actions.',
      descriptionTechnical: 'Amazon Cognito provides user pools, JWT access and ID tokens, hosted authentication flows, and authorizers for API Gateway. API requests are validated against Cognito-issued tokens before backend invocation.',
      x: 44,
      y: 18,
      icon: 'shield',
    },
    {
      id: 'cloudwatch',
      type: 'monitoring',
      label: 'CloudWatch Monitoring',
      descriptionSimple: 'CloudWatch collects logs and metrics so the team can see how the CMS is performing. It helps detect errors and troubleshoot issues.',
      descriptionTechnical: 'Amazon CloudWatch receives Lambda logs, metrics, traces, alarms, and dashboards. Functions publish structured log events and operational metrics for observability, alerting, and incident analysis.',
      x: 64,
      y: 82,
      icon: 'chart',
    },
    {
      id: 'github-actions',
      type: 'ci-cd',
      label: 'GitHub Actions CI/CD',
      descriptionSimple: 'GitHub Actions automatically builds, tests, and deploys CMS updates. It helps ship frontend and backend changes reliably.',
      descriptionTechnical: 'GitHub Actions runs CI/CD workflows that install dependencies, run tests, build static assets, package Lambda code, and deploy to AWS using IAM/OIDC credentials, S3 syncs, and CDK infrastructure deployments.',
      x: 92,
      y: 86,
      icon: 'pipeline',
    },
  ],
  edges: [
    {
      id: 'client-to-cloudfront',
      from: 'client',
      to: 'cloudfront',
      label: 'HTTPS requests',
      style: 'solid',
    },
    {
      id: 'cloudfront-to-s3-static',
      from: 'cloudfront',
      to: 's3-static',
      label: 'Static assets',
      style: 'solid',
    },
    {
      id: 'cloudfront-to-api-gateway',
      from: 'cloudfront',
      to: 'api-gateway',
      label: 'API requests',
      style: 'solid',
    },
    {
      id: 'api-gateway-to-lambda',
      from: 'api-gateway',
      to: 'lambda',
      label: 'Function invocation',
      style: 'solid',
    },
    {
      id: 'lambda-to-dynamodb',
      from: 'lambda',
      to: 'dynamodb',
      label: 'Data operations',
      style: 'solid',
    },
    {
      id: 'lambda-to-s3-media',
      from: 'lambda',
      to: 's3-media',
      label: 'Media storage',
      style: 'solid',
    },
    {
      id: 'api-gateway-to-cognito',
      from: 'api-gateway',
      to: 'cognito',
      label: 'Auth validation',
      style: 'dashed',
    },
    {
      id: 'lambda-to-cloudwatch',
      from: 'lambda',
      to: 'cloudwatch',
      label: 'Logging',
      style: 'dashed',
    },
    {
      id: 'github-actions-to-s3-static',
      from: 'github-actions',
      to: 's3-static',
      label: 'Frontend deployment',
      style: 'animated',
    },
    {
      id: 'github-actions-to-lambda',
      from: 'github-actions',
      to: 'lambda',
      label: 'Function deployment',
      style: 'animated',
    },
  ],
};
