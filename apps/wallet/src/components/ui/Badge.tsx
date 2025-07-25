import React from "react";

export interface BadgeProps {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "success"
    | "warning"
    | "destructive";
  className?: string;
  children: React.ReactNode;
}

const variantStyles = {
  default: "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  success: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  warning:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  destructive: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  className = "",
  children,
}) => {
  const baseStyles =
    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${className}`;

  return <div className={combinedClassName}>{children}</div>;
};
