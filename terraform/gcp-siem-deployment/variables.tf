# Variables for PersonaPass SIEM Deployment

variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "top-cubist-463420-h6"
}

variable "region" {
  description = "GCP region for SIEM deployment"
  type        = string
  default     = "us-central1"
}

variable "security_email" {
  description = "Email address for security alerts"
  type        = string
  default     = "security@personapass.xyz"
}

variable "log_retention_days" {
  description = "Number of days to retain security logs"
  type        = number
  default     = 90
}

variable "analytics_retention_days" {
  description = "Number of days to retain security analytics"
  type        = number
  default     = 365
}

variable "alert_thresholds" {
  description = "Alert thresholds for security monitoring"
  type = object({
    failed_logins_per_5min = number
    kms_operations_per_5min = number
    admin_actions_immediate = number
  })
  default = {
    failed_logins_per_5min = 5
    kms_operations_per_5min = 100
    admin_actions_immediate = 0
  }
}

variable "common_labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    project        = "personapass"
    environment    = "production"
    security_level = "critical"
    component      = "siem"
    managed_by     = "terraform"
    team           = "security"
  }
}