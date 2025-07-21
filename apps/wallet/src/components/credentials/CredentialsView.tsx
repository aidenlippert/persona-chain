/**
 * Credentials View - Simple Credential Management
 * Clean interface for viewing and managing verifiable credentials
 */

import React, { useState } from "react";
import {
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  CheckBadgeIcon,
  CalendarIcon,
} from "@heroicons/react/24/outline";

interface Credential {
  id: string;
  type: string;
  issuer: string;
  issuedDate: string;
  expiryDate?: string;
  status: "valid" | "expired" | "revoked";
  fields: Record<string, any>;
}

export const CredentialsView: React.FC = () => {
  const [credentials] = useState<Credential[]>([
    {
      id: "drivers-license-001",
      type: "Driver's License",
      issuer: "Department of Motor Vehicles",
      issuedDate: "2023-06-15",
      expiryDate: "2028-06-15",
      status: "valid",
      fields: {
        licenseNumber: "D123456789",
        fullName: "John Doe",
        dateOfBirth: "1990-03-15",
        address: "123 Main St, City, State 12345",
      },
    },
    {
      id: "university-degree-001",
      type: "University Degree",
      issuer: "State University",
      issuedDate: "2022-05-20",
      status: "valid",
      fields: {
        degree: "Bachelor of Science",
        major: "Computer Science",
        graduationDate: "2022-05-20",
        gpa: "3.8",
      },
    },
    {
      id: "age-verification-001",
      type: "Age Verification",
      issuer: "Government Identity Service",
      issuedDate: "2024-01-10",
      expiryDate: "2025-01-10",
      status: "valid",
      fields: {
        ageOver18: true,
        ageOver21: true,
        verificationLevel: "high",
      },
    },
  ]);

  const [selectedCredential, setSelectedCredential] = useState<string | null>(
    null,
  );

  const getStatusColor = (status: Credential["status"]) => {
    switch (status) {
      case "valid":
        return "text-green-400 bg-green-400/10 border-green-400/20";
      case "expired":
        return "text-orange-400 bg-orange-400/10 border-orange-400/20";
      case "revoked":
        return "text-red-400 bg-red-400/10 border-red-400/20";
      default:
        return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const selectedCred = credentials.find((c) => c.id === selectedCredential);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Your Credentials</h1>
        <p className="text-white/70 text-lg">
          Manage your verifiable credentials and digital certificates
        </p>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Credentials List */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">
                Stored Credentials
              </h2>
              <button className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2">
                <PlusIcon className="w-4 h-4" />
                <span>Add Credential</span>
              </button>
            </div>

            <div className="space-y-4">
              {credentials.map((credential) => (
                <div
                  key={credential.id}
                  onClick={() => setSelectedCredential(credential.id)}
                  className={`bg-white/10 backdrop-blur-md rounded-xl p-6 border transition-all cursor-pointer ${
                    selectedCredential === credential.id
                      ? "border-blue-400 bg-blue-400/10"
                      : "border-white/20 hover:bg-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-500 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">
                          {credential.type}
                        </h3>
                        <p className="text-white/60 text-sm mb-2">
                          Issued by {credential.issuer}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-white/50">
                          <span>
                            Issued: {formatDate(credential.issuedDate)}
                          </span>
                          {credential.expiryDate && (
                            <span>
                              Expires: {formatDate(credential.expiryDate)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(credential.status)}`}
                    >
                      {credential.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Credential Details */}
          <div className="lg:col-span-1">
            {selectedCred ? (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">
                    Credential Details
                  </h3>
                  <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <EyeIcon className="w-4 h-4 text-white/70" />
                    </button>
                    <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                      <TrashIcon className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Credential Info */}
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckBadgeIcon className="w-5 h-5 text-green-400" />
                      <span className="text-white font-medium">
                        {selectedCred.type}
                      </span>
                    </div>
                    <p className="text-white/60 text-sm">
                      Issued by {selectedCred.issuer}
                    </p>
                  </div>

                  {/* Status */}
                  <div
                    className={`p-3 rounded-lg border ${getStatusColor(selectedCred.status)}`}
                  >
                    <div className="text-sm font-medium">
                      Status: {selectedCred.status}
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-white/50" />
                      <span className="text-white/60">
                        Issued: {formatDate(selectedCred.issuedDate)}
                      </span>
                    </div>
                    {selectedCred.expiryDate && (
                      <div className="flex items-center space-x-2 text-sm">
                        <CalendarIcon className="w-4 h-4 text-white/50" />
                        <span className="text-white/60">
                          Expires: {formatDate(selectedCred.expiryDate)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div>
                    <h4 className="text-white font-medium mb-3">
                      Credential Data
                    </h4>
                    <div className="space-y-3">
                      {Object.entries(selectedCred.fields).map(
                        ([key, value]) => (
                          <div key={key} className="bg-black/20 rounded-lg p-3">
                            <div className="text-white/60 text-xs uppercase tracking-wide mb-1">
                              {key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, (str) => str.toUpperCase())}
                            </div>
                            <div className="text-white text-sm font-medium">
                              {typeof value === "boolean"
                                ? value
                                  ? "Yes"
                                  : "No"
                                : value}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2 pt-4">
                    <button className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-all">
                      Share Credential
                    </button>
                    <button className="w-full bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg transition-colors">
                      Export
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 text-center">
                <DocumentTextIcon className="w-12 h-12 text-white/40 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white/60 mb-2">
                  Select a Credential
                </h3>
                <p className="text-white/40 text-sm">
                  Click on a credential from the list to view its details
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {[
          {
            label: "Total Credentials",
            value: credentials.length,
            color: "blue",
          },
          {
            label: "Valid",
            value: credentials.filter((c) => c.status === "valid").length,
            color: "green",
          },
          { label: "Expiring Soon", value: 0, color: "orange" },
          { label: "Shared This Month", value: 3, color: "purple" },
        ].map((stat, index) => (
          <div
            key={index}
            className="bg-white/5 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10"
          >
            <div className={`text-2xl font-bold text-${stat.color}-400 mb-1`}>
              {stat.value}
            </div>
            <div className="text-white/60 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
