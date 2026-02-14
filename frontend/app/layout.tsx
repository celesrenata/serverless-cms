export const metadata = {
  title: 'Serverless Website',
  description: 'Powered by Next.js and Contentful',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
