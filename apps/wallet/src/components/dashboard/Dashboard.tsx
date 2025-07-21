/**
 * PersonaPass Dashboard - Professional Enterprise UI
 * Optimized, secure, and performance-focused
 */

import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  IdentificationIcon,
  DocumentTextIcon,
  QrCodeIcon,
  ClockIcon,
  CheckBadgeIcon,
  // Removed unused ArrowTrendingUpIcon import
  ShieldCheckIcon,
  // Removed unused ExclamationTriangleIcon import
} from "@heroicons/react/24/outline";
import { PersonaWallet } from "../../services/personaChainService";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface DashboardProps {
  wallet: PersonaWallet | null;
}

interface StatItem {
  label: string;
  value: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  status: 'verified' | 'ready' | 'protected' | 'active';
  color: 'green' | 'blue' | 'purple' | 'orange';
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  path: string;
  primary: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

// Enhanced Dashboard Component
export const Dashboard: React.FC<DashboardProps> = React.memo(({ wallet }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading dashboard data
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const stats: StatItem[] = useMemo(
    () => [
      {
        label: "Digital Identity",
        value: "Active",
        icon: IdentificationIcon,
        status: "verified",
        color: "green",
      },
      {
        label: "Verifiable Credentials",
        value: "0",
        icon: DocumentTextIcon,
        status: "ready",
        color: "blue",
      },
      {
        label: "Security Level",
        value: "High",
        icon: ShieldCheckIcon,
        status: "protected",
        color: "purple",
      },
      {
        label: "Last Activity",
        value: "Now",
        icon: ClockIcon,
        status: "active",
        color: "orange",
      },
    ],
    [],
  );

  const quickActions: QuickAction[] = useMemo(
    () => [
      {
        title: "Manage Identity",
        description: "View and update your decentralized identity",
        icon: IdentificationIcon,
        path: "/identity",
        primary: true,
        color: "blue",
      },
      {
        title: "My Credentials",
        description: "Store and manage verifiable credentials",
        icon: DocumentTextIcon,
        path: "/credentials",
        primary: false,
        color: "green",
      },
      {
        title: "Share Securely",
        description: "Share credentials via secure QR codes",
        icon: QrCodeIcon,
        path: "/share",
        primary: false,
        color: "purple",
      },
    ],
    [],
  );

  const recentActivity: ActivityItem[] = useMemo(
    () => [
      {
        id: "1",
        title: "Identity Created",
        description: "DID created on PersonaChain blockchain",
        timestamp: "Just now",
        status: "success",
        icon: IdentificationIcon,
        color: "green",
      },
      {
        id: "2",
        title: "Wallet Connected",
        description: `Connected Keplr wallet: ${wallet?.address.slice(0, 12)}...`,
        timestamp: "Just now",
        status: "success",
        icon: CheckBadgeIcon,
        color: "blue",
      },
    ],
    [wallet?.address],
  );

  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
          Welcome to PersonaPass
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Your secure gateway to decentralized identity and verifiable credentials
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <MetricCard
            key={index}
            title={stat.label}
            value={stat.value}
            icon={<stat.icon className="w-6 h-6" />}
            color={stat.color}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map((action, index) => (
            <QuickActionCard
              key={index}
              title={action.title}
              description={action.description}
              icon={<action.icon className="w-8 h-8" />}
              onClick={() => navigate(action.path)}
              primary={action.primary}
              color={action.color}
            />
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-card">
          <div className="p-6">
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <ActivityItem
                  key={activity.id}
                  title={activity.title}
                  description={activity.description}
                  timestamp={activity.timestamp}
                  icon={<activity.icon className="w-5 h-5" />}
                  color={activity.color}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

Dashboard.displayName = 'Dashboard';

// Enhanced Metric Card Component
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, 
  value, 
  change, 
  trend = 'stable', 
  icon, 
  color = 'blue' 
}) => {
  const colorVariants = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600'
  };

  const trendColors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-gray-500'
  };

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-card hover:shadow-card-hover transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary-500/5 via-transparent to-accent-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && (
              <div className={`p-3 rounded-xl bg-gradient-to-r ${colorVariants[color]} text-white shadow-lg`}>
                {icon}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
            </div>
          </div>
          
          {change && (
            <div className={`flex items-center gap-1 ${trendColors[trend]} text-sm font-medium`}>
              <span className="text-xl">
                {trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}
              </span>
              {change}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}

const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  onClick,
  primary = false,
  color = 'blue'
}) => {
  const colorVariants = {
    blue: 'from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
    green: 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
    purple: 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700',
    orange: 'from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700',
  };

  return (
    <button
      onClick={onClick}
      className={`
        group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300
        ${primary 
          ? `bg-gradient-to-r ${colorVariants[color]} text-white shadow-lg hover:shadow-xl` 
          : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-card hover:shadow-card-hover hover:border-primary-300'
        }
      `}
    >
      <div className="flex items-start gap-4">
        <div className={`
          p-3 rounded-xl transition-colors duration-300
          ${primary 
            ? 'bg-white/20 text-white' 
            : `bg-gradient-to-r ${colorVariants[color]} text-white`
          }
        `}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-semibold mb-2 ${primary ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {title}
          </h3>
          <p className={`text-sm ${primary ? 'text-white/80' : 'text-gray-600 dark:text-gray-400'}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
};

// Activity Item Component
interface ActivityItemProps {
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: 'green' | 'blue' | 'yellow' | 'red';
}

const ActivityItem: React.FC<ActivityItemProps> = ({
  title,
  description,
  timestamp,
  icon,
  color
}) => {
  const colorVariants = {
    green: 'bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-200">
      <div className={`p-2 rounded-lg ${colorVariants[color]}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-900 dark:text-white">{title}</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{description}</p>
      </div>
      <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
        {timestamp}
      </span>
    </div>
  );
};