# Variables for PersonaPass GCP HSM Deployment

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for HSM deployment"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for HSM deployment"
  type        = string
  default     = "us-central1-a"
}

variable "alert_email" {
  description = "Email address for HSM alerts"
  type        = string
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "backup_retention_days" {
  description = "Number of days to retain HSM backups"
  type        = number
  default     = 365
}

variable "key_rotation_period" {
  description = "Key rotation period in seconds (default 90 days)"
  type        = string
  default     = "7776000s"
}

variable "enable_audit_logging" {
  description = "Enable audit logging for HSM operations"
  type        = bool
  default     = true
}

variable "network_cidr" {
  description = "CIDR block for HSM network"
  type        = string
  default     = "10.0.100.0/24"
}

variable "common_labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    project        = "personapass"
    environment    = "production"
    security_level = "critical"
    compliance     = "fips-140-2-level-3"
    managed_by     = "terraform"
    team           = "security"
  }
}