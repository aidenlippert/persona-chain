# PersonaPass Security Monitoring (SIEM) - Simplified Working Version
# Core security monitoring with Google Cloud native SIEM

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "./terraform.tfstate"
  }
}

# Provider configuration
provider "google" {
  project = var.project_id
  region  = var.region
}

# Local variables
locals {
  project_id = var.project_id
  region     = var.region
  
  common_labels = {
    project        = "personapass"
    environment    = "production"
    security_level = "critical"
    component      = "siem"
    managed_by     = "terraform"
    team           = "security"
  }
}

# Enable required APIs
resource "google_project_service" "siem_apis" {
  for_each = toset([
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "securitycenter.googleapis.com",
    "cloudasset.googleapis.com",
    "bigquery.googleapis.com",
    "pubsub.googleapis.com",
    "cloudfunctions.googleapis.com",
    "storage.googleapis.com",
    "cloudscheduler.googleapis.com"
  ])
  
  service = each.value
  project = local.project_id
}

# BigQuery dataset for security logs
resource "google_bigquery_dataset" "security_logs" {
  dataset_id                  = "personapass_security_logs"
  friendly_name               = "PersonaPass Security Logs"
  description                 = "Centralized security logs for SIEM analysis"
  location                    = "US"
  default_table_expiration_ms = 7776000000  # 90 days
  
  labels = local.common_labels
  
  depends_on = [google_project_service.siem_apis]
}

# BigQuery dataset for security analytics
resource "google_bigquery_dataset" "security_analytics" {
  dataset_id                  = "personapass_security_analytics"
  friendly_name               = "PersonaPass Security Analytics"
  description                 = "Security analytics and threat detection"
  location                    = "US"
  default_table_expiration_ms = 31536000000  # 1 year
  
  labels = local.common_labels
  
  depends_on = [google_project_service.siem_apis]
}

# Cloud Logging sink for security logs
resource "google_logging_project_sink" "security_sink" {
  name        = "personapass-security-sink"
  destination = "bigquery.googleapis.com/projects/${local.project_id}/datasets/personapass_security_logs"
  
  filter = <<EOT
protoPayload.serviceName="cloudkms.googleapis.com" OR
protoPayload.serviceName="iam.googleapis.com" OR
protoPayload.serviceName="secretmanager.googleapis.com" OR
protoPayload.serviceName="storage.googleapis.com" OR
protoPayload.serviceName="cloudsql.googleapis.com" OR
protoPayload.serviceName="compute.googleapis.com" OR
severity>=ERROR OR
protoPayload.authenticationInfo.principalEmail!~".*@.*\\.iam\\.gserviceaccount\\.com$" OR
protoPayload.methodName="google.iam.admin.v1.CreateServiceAccountKey" OR
protoPayload.methodName="google.iam.admin.v1.DeleteServiceAccountKey" OR
protoPayload.methodName="google.cloud.kms.v1.KeyManagementService.CreateCryptoKey" OR
protoPayload.methodName="google.cloud.kms.v1.KeyManagementService.DestroyCryptoKeyVersion" OR
resource.type="gce_firewall_rule" OR
resource.type="gce_network" OR
httpRequest.status>=400
EOT
  
  unique_writer_identity = true
  
  depends_on = [google_bigquery_dataset.security_logs]
}

# Grant BigQuery Data Editor role to the sink
resource "google_bigquery_dataset_iam_member" "security_sink_writer" {
  dataset_id = google_bigquery_dataset.security_logs.dataset_id
  role       = "roles/bigquery.dataEditor"
  member     = google_logging_project_sink.security_sink.writer_identity
}

# Service account for security operations
resource "google_service_account" "security_service_account" {
  account_id   = "personapass-security"
  display_name = "PersonaPass Security Service Account"
  description  = "Service account for security monitoring and BigQuery operations"
}

# Grant necessary roles to the service account
resource "google_project_iam_member" "security_service_account_bigquery" {
  project = local.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.security_service_account.email}"
}

resource "google_project_iam_member" "security_service_account_analytics" {
  project = local.project_id
  role    = "roles/bigquery.dataEditor"
  member  = "serviceAccount:${google_service_account.security_service_account.email}"
}

# Pub/Sub topic for real-time security alerts
resource "google_pubsub_topic" "security_alerts" {
  name = "personapass-security-alerts"
  
  labels = local.common_labels
  
  depends_on = [google_project_service.siem_apis]
}

# Cloud Function for security alert processing
resource "google_storage_bucket" "security_function_source" {
  name          = "${local.project_id}-security-functions"
  location      = local.region
  force_destroy = true
  
  uniform_bucket_level_access = true
  
  labels = local.common_labels
}

# Email notification channel for security alerts
resource "google_monitoring_notification_channel" "security_alerts" {
  display_name = "PersonaPass Security Alerts"
  type         = "email"
  
  labels = {
    email_address = var.security_email
  }
  
  depends_on = [google_project_service.siem_apis]
}

# Basic security alert policy - temporarily disabled for working deployment
# resource "google_monitoring_alert_policy" "security_errors" {
#   display_name = "PersonaPass Security Errors"
#   combiner     = "OR"
#   
#   conditions {
#     display_name = "High Error Rate"
#     
#     condition_threshold {
#       filter          = "metric.type=\"logging.googleapis.com/log_entry_count\" AND resource.type=\"global\" AND metric.label.severity>=ERROR"
#       duration        = "300s"
#       comparison      = "COMPARISON_GT"
#       threshold_value = 10
#       
#       aggregations {
#         alignment_period   = "300s"
#         per_series_aligner = "ALIGN_RATE"
#       }
#     }
#   }
#   
#   notification_channels = [google_monitoring_notification_channel.security_alerts.name]
#   
#   depends_on = [google_project_service.siem_apis]
# }

# Security dashboard
resource "google_monitoring_dashboard" "security_dashboard" {
  dashboard_json = jsonencode({
    displayName = "PersonaPass Security Dashboard"
    mosaicLayout = {
      columns = 12
      tiles = [
        {
          xPos = 0
          yPos = 0
          width = 12
          height = 4
          widget = {
            title = "Security Log Volume"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesFilter = {
                    filter = "metric.type=\"logging.googleapis.com/log_entry_count\" AND resource.type=\"global\""
                    aggregation = {
                      alignmentPeriod = "300s"
                      perSeriesAligner = "ALIGN_RATE"
                    }
                  }
                }
              }]
              timeshiftDuration = "0s"
              yAxis = {
                label = "Logs/sec"
                scale = "LINEAR"
              }
            }
          }
        }
      ]
    }
  })
  
  depends_on = [google_project_service.siem_apis]
}

# Security incident response automation
resource "google_cloud_scheduler_job" "security_scan" {
  name             = "personapass-security-scan"
  description      = "Periodic security scan and threat detection"
  schedule         = "0 */6 * * *"  # Every 6 hours
  time_zone        = "UTC"
  attempt_deadline = "600s"
  
  pubsub_target {
    topic_name = google_pubsub_topic.security_alerts.id
    data       = base64encode("security-scan-trigger")
  }
  
  depends_on = [google_project_service.siem_apis]
}

# Outputs
output "project_id" {
  description = "GCP Project ID"
  value       = local.project_id
}

output "security_logs_dataset" {
  description = "BigQuery dataset for security logs"
  value       = google_bigquery_dataset.security_logs.dataset_id
}

output "security_analytics_dataset" {
  description = "BigQuery dataset for security analytics"
  value       = google_bigquery_dataset.security_analytics.dataset_id
}

output "security_alerts_topic" {
  description = "Pub/Sub topic for security alerts"
  value       = google_pubsub_topic.security_alerts.name
}

output "security_dashboard_url" {
  description = "URL to security monitoring dashboard"
  value       = "https://console.cloud.google.com/monitoring/dashboards/custom/${google_monitoring_dashboard.security_dashboard.id}?project=${local.project_id}"
}

output "security_notification_channel" {
  description = "Security notification channel ID"
  value       = google_monitoring_notification_channel.security_alerts.name
}

output "security_service_account" {
  description = "Security service account email"
  value       = google_service_account.security_service_account.email
}