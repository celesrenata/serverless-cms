import React from 'react';
import { useSiteSettings } from '../../hooks/useSiteSettings';

export const Footer: React.FC = () => {
  const { data: settings } = useSiteSettings();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600 text-sm">
            {settings?.site_description || 'A serverless CMS website'}
          </p>
          <p className="text-gray-500 text-sm mt-2">
            © {currentYear} {settings?.site_title || 'My Website'}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
