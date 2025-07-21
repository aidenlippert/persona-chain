# Variables for PersonaPass HSM Module

variable "cluster_name" {
  description = "Name of the EKS cluster"
  type        = string
}

variable "environment" {
  description = "Environment name (production, staging, development)"
  type        = string
  default     = "production"
}

variable "vpc_id" {
  description = "VPC ID where HSM will be deployed"
  type        = string
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for HSM deployment"
  type        = list(string)
}

variable "kms_key_arn" {
  description = "ARN of the KMS key for encryption"
  type        = string
}

variable "sns_topic_arn" {
  description = "SNS topic ARN for alerts"
  type        = string
}

variable "common_tags" {
  description = "Common tags to apply to all resources"
  type        = map(string)
  default     = {}
}

variable "hsm_instance_type" {
  description = "HSM instance type"
  type        = string
  default     = "hsm1.medium"
  
  validation {
    condition = contains(["hsm1.medium"], var.hsm_instance_type)
    error_message = "HSM instance type must be hsm1.medium."
  }
}

variable "backup_retention_days" {
  description = "Number of days to retain HSM backups"
  type        = number
  default     = 365
}

variable "enable_cross_region_backup" {
  description = "Enable cross-region backup for disaster recovery"
  type        = bool
  default     = true
}

variable "backup_region" {
  description = "Region for cross-region HSM backups"
  type        = string
  default     = "us-west-2"
}