import React from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { motion } from 'framer-motion';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ComponentType<any>;
  current?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className = '' }) => {
  return (
    <nav className={`flex items-center space-x-1 text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex items-center space-x-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const Icon = item.icon;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
              )}
              
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center"
              >
                {Icon && (
                  <Icon className={`w-4 h-4 mr-1 ${
                    isLast ? 'text-blue-600' : 'text-gray-500'
                  }`} />
                )}
                
                {item.href && !isLast ? (
                  <a
                    href={item.href}
                    className="text-gray-600 hover:text-blue-600 transition-colors duration-200 hover:underline"
                  >
                    {item.label}
                  </a>
                ) : (
                  <span className={`${
                    isLast 
                      ? 'text-blue-600 font-medium' 
                      : 'text-gray-600'
                  }`}>
                    {item.label}
                  </span>
                )}
              </motion.div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Common breadcrumb configurations
export const credentialsBreadcrumbs = (currentTab: string): BreadcrumbItem[] => [
  { label: 'Dashboard', href: '/', icon: Home },
  { label: 'Credentials', href: '/credentials' },
  { label: currentTab === 'credentials' ? 'My Credentials' : 
           currentTab === 'create' ? 'Create New' :
           currentTab === 'marketplace' ? 'API Automation' :
           'Batch Processing', current: true }
];

export const dashboardBreadcrumbs: BreadcrumbItem[] = [
  { label: 'Dashboard', current: true, icon: Home }
];