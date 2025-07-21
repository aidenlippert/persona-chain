/**
 * PersonaPass Card Component
 * Professional, accessible card components with variants
 */

import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glass" | "elevated" | "gradient" | "success" | "error";
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  className?: string;
}

export interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  className?: string;
}

export interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Card: React.FC<CardProps> = ({ 
  className = "", 
  variant = "default", 
  children,
  ...props 
}) => {
  const variants = {
    default: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800",
    glass: "bg-white/80 dark:bg-gray-900/80 border-gray-200/50 dark:border-gray-800/50 backdrop-blur-xl",
    elevated: "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-elevated",
    gradient: "bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-blue-200 dark:border-blue-800",
    success: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-700",
    error: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-700"
  };

  return (
    <div
      className={`
        rounded-xl border shadow-lg
        transition-all duration-300 ease-in-out
        hover:shadow-xl hover:scale-[1.02]
        ${variants[variant]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<CardHeaderProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<CardTitleProps> = ({
  className = "",
  children,
  ...props
}) => (
  <h3
    className={`text-2xl font-semibold leading-none tracking-tight text-gray-900 dark:text-white ${className}`}
    {...props}
  >
    {children}
  </h3>
);

export const CardDescription: React.FC<CardDescriptionProps> = ({
  className = "",
  children,
  ...props
}) => (
  <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<CardContentProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardFooterProps> = ({
  className = "",
  children,
  ...props
}) => (
  <div className={`flex items-center p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);