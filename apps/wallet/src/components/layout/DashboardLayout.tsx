import React from "react";
import {
  ChartBarIcon,
  ShieldCheckIcon,
  CreditCardIcon,
  QrCodeIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { Card } from "../ui/Card";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";

interface DashboardStats {
  totalCredentials: number;
  activeConnections: number;
  recentProofs: number;
  securityScore: number;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
  color: string;
}

interface RecentActivity {
  id: string;
  type: "credential" | "proof" | "connection" | "security";
  title: string;
  description: string;
  timestamp: string;
  status: "success" | "warning" | "error" | "pending";
}

const quickActions: QuickAction[] = [
  {
    id: "scan-qr",
    title: "Scan QR Code",
    description: "Respond to a proof request",
    icon: QrCodeIcon,
    href: "/proof-requests/scan",
    color: "bg-blue-500",
  },
  {
    id: "add-credential",
    title: "Add Credential",
    description: "Import a new verifiable credential",
    icon: CreditCardIcon,
    href: "/credentials/add",
    color: "bg-green-500",
  },
  {
    id: "manage-identity",
    title: "Manage Identity",
    description: "Update your DID settings",
    icon: ShieldCheckIcon,
    href: "/identity",
    color: "bg-purple-500",
  },
  {
    id: "view-analytics",
    title: "View Analytics",
    description: "See your usage statistics",
    icon: ChartBarIcon,
    href: "/analytics",
    color: "bg-orange-500",
  },
];

const mockStats: DashboardStats = {
  totalCredentials: 12,
  activeConnections: 8,
  recentProofs: 24,
  securityScore: 95,
};

const mockActivity: RecentActivity[] = [
  {
    id: "1",
    type: "proof",
    title: "Age Verification Completed",
    description: "Verified your age for online service registration",
    timestamp: "2 minutes ago",
    status: "success",
  },
  {
    id: "2",
    type: "credential",
    title: "Education Credential Added",
    description: "University diploma credential imported successfully",
    timestamp: "1 hour ago",
    status: "success",
  },
  {
    id: "3",
    type: "security",
    title: "Security Scan Complete",
    description: "Weekly security check passed with high score",
    timestamp: "3 hours ago",
    status: "success",
  },
  {
    id: "4",
    type: "connection",
    title: "New Service Connected",
    description: "Connected to Healthcare Provider Portal",
    timestamp: "1 day ago",
    status: "pending",
  },
];

interface DashboardLayoutProps {
  children?: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
}) => {
  const getStatusIcon = (status: RecentActivity["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case "warning":
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case "error":
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case "pending":
        return <ClockIcon className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircleIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: RecentActivity["status"]) => {
    switch (status) {
      case "success":
        return <Badge variant="success">Complete</Badge>;
      case "warning":
        return <Badge variant="warning">Warning</Badge>;
      case "error":
        return <Badge variant="destructive">Error</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back to Persona
          </h1>
          <p className="text-gray-600">
            Manage your digital identity with confidence and privacy.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Credentials
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockStats.totalCredentials}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <CreditCardIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+2 this week</span>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Connections
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockStats.activeConnections}
                </p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+1 this week</span>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Recent Proofs
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockStats.recentProofs}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <QrCodeIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <ArrowTrendingUpIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">+5 this week</span>
            </div>
          </Card>

          <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Security Score
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {mockStats.securityScore}%
                </p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <ChartBarIcon className="w-6 h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <CheckCircleIcon className="w-4 h-4 text-green-500 mr-1" />
              <span className="text-green-600">Excellent</span>
            </div>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Quick Actions
                </h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="ghost"
                      className="h-auto p-4 flex flex-col items-start space-y-2 hover:bg-gray-50 border border-gray-200/50"
                      asChild
                    >
                      <a href={action.href}>
                        <div className={`p-2 rounded-lg ${action.color}`}>
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="text-left">
                          <div className="font-semibold text-gray-900">
                            {action.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {action.description}
                          </div>
                        </div>
                      </a>
                    </Button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-gray-200/50">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Recent Activity
                </h2>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </div>

              <div className="space-y-4">
                {mockActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        {getStatusBadge(activity.status)}
                      </div>
                      <p className="text-sm text-gray-600 mb-1">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* Additional Content */}
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;
