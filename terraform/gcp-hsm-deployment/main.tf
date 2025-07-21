# PersonaPass Production HSM Deployment - Google Cloud Platform
# Fort Knox-level security with Google Cloud HSM and KMS

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
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
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# Local variables
locals {
  project_id = var.project_id
  region     = var.region
  zone       = var.zone
  
  common_labels = {
    project        = "personapass"
    environment    = "production"
    security_level = "critical"
    compliance     = "fips-140-2-level-3"
    managed_by     = "terraform"
    team           = "security"
  }
}

# Enable required APIs
resource "google_project_service" "required_apis" {
  for_each = toset([
    "cloudkms.googleapis.com",
    "compute.googleapis.com",
    "storage.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ])
  
  service = each.value
  project = local.project_id
}

# VPC Network for HSM
resource "google_compute_network" "hsm_network" {
  name                    = "personapass-hsm-network"
  auto_create_subnetworks = false
  routing_mode           = "REGIONAL"
  
  depends_on = [google_project_service.required_apis]
}

# Subnet for HSM instances
resource "google_compute_subnetwork" "hsm_subnet" {
  name                     = "personapass-hsm-subnet"
  ip_cidr_range           = "10.0.100.0/24"
  region                  = local.region
  network                 = google_compute_network.hsm_network.id
  private_ip_google_access = true
  
  secondary_ip_range {
    range_name    = "hsm-secondary"
    ip_cidr_range = "10.0.101.0/24"
  }
}

# Firewall rules for HSM
resource "google_compute_firewall" "hsm_internal" {
  name    = "personapass-hsm-internal"
  network = google_compute_network.hsm_network.name

  allow {
    protocol = "tcp"
    ports    = ["22", "443", "8080", "9000"]
  }

  source_ranges = ["10.0.100.0/24"]
  target_tags   = ["hsm-cluster"]
}

resource "google_compute_firewall" "hsm_external" {
  name    = "personapass-hsm-external"
  network = google_compute_network.hsm_network.name

  allow {
    protocol = "tcp"
    ports    = ["443"]
  }

  source_ranges = ["0.0.0.0/0"]
  target_tags   = ["hsm-external"]
}

# Cloud KMS Key Ring
resource "google_kms_key_ring" "personapass_hsm" {
  name     = "personapass-hsm-keyring"
  location = local.region
  
  depends_on = [google_project_service.required_apis]
}

# Cloud KMS HSM Key for DID signing
resource "google_kms_crypto_key" "did_signing_key" {
  name            = "personapass-did-signing-key"
  key_ring        = google_kms_key_ring.personapass_hsm.id
  rotation_period = "7776000s" # 90 days
  
  purpose = "ASYMMETRIC_SIGN"
  
  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "HSM"
  }
  
  labels = local.common_labels
}

# Cloud KMS HSM Key for encryption
resource "google_kms_crypto_key" "encryption_key" {
  name            = "personapass-encryption-key"
  key_ring        = google_kms_key_ring.personapass_hsm.id
  rotation_period = "7776000s" # 90 days
  
  purpose = "ENCRYPT_DECRYPT"
  
  version_template {
    algorithm        = "GOOGLE_SYMMETRIC_ENCRYPTION"
    protection_level = "HSM"
  }
  
  labels = local.common_labels
}

# Cloud KMS HSM Key for credential signing
resource "google_kms_crypto_key" "credential_signing_key" {
  name     = "personapass-credential-signing-key"
  key_ring = google_kms_key_ring.personapass_hsm.id
  
  purpose = "ASYMMETRIC_SIGN"
  
  version_template {
    algorithm        = "EC_SIGN_P256_SHA256"
    protection_level = "HSM"
  }
  
  labels = local.common_labels
}

# Service Account for HSM operations
resource "google_service_account" "hsm_service_account" {
  account_id   = "personapass-hsm-service"
  display_name = "PersonaPass HSM Service Account"
  description  = "Service account for HSM cryptographic operations"
}

# IAM binding for HSM service account
resource "google_kms_key_ring_iam_binding" "hsm_crypto_key_encrypter_decrypter" {
  key_ring_id = google_kms_key_ring.personapass_hsm.id
  role        = "roles/cloudkms.cryptoKeyEncrypterDecrypter"
  
  members = [
    "serviceAccount:${google_service_account.hsm_service_account.email}"
  ]
}

resource "google_kms_key_ring_iam_binding" "hsm_crypto_key_signer_verifier" {
  key_ring_id = google_kms_key_ring.personapass_hsm.id
  role        = "roles/cloudkms.signerVerifier"
  
  members = [
    "serviceAccount:${google_service_account.hsm_service_account.email}"
  ]
}

# Cloud Storage bucket for HSM backups
resource "google_storage_bucket" "hsm_backups" {
  name          = "${local.project_id}-personapass-hsm-backups"
  location      = local.region
  force_destroy = false
  
  uniform_bucket_level_access = true
  
  versioning {
    enabled = true
  }
  
  encryption {
    default_kms_key_name = google_kms_crypto_key.encryption_key.id
  }
  
  lifecycle_rule {
    condition {
      age = 90
    }
    action {
      type = "Delete"
    }
  }
  
  lifecycle_rule {
    condition {
      age = 30
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }
  
  labels = local.common_labels
}

# Cloud Logging for HSM operations
resource "google_logging_project_sink" "hsm_audit_logs" {
  name        = "personapass-hsm-audit-sink"
  destination = "storage.googleapis.com/${google_storage_bucket.hsm_backups.name}"
  
  filter = "resource.type=\"cloudkms_key\" OR resource.type=\"gce_instance\" AND resource.labels.instance_name=~\"personapass-hsm-.*\""
  
  unique_writer_identity = true
}

# Grant the sink's writer identity access to the bucket
resource "google_storage_bucket_iam_member" "hsm_audit_logs_writer" {
  bucket = google_storage_bucket.hsm_backups.name
  role   = "roles/storage.objectCreator"
  member = google_logging_project_sink.hsm_audit_logs.writer_identity
}

# Cloud Monitoring alert policy for HSM
resource "google_monitoring_alert_policy" "hsm_health_alert" {
  display_name = "PersonaPass HSM Health Alert"
  combiner     = "OR"
  
  conditions {
    display_name = "HSM Key Usage Alert"
    
    condition_threshold {
      filter          = "resource.type=\"cloudkms_key\" AND resource.labels.key_ring_id=\"personapass-hsm-keyring\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 1000
      
      aggregations {
        alignment_period   = "300s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }
  
  notification_channels = [google_monitoring_notification_channel.email_alerts.name]
  
  depends_on = [google_project_service.required_apis]
}

# Email notification channel
resource "google_monitoring_notification_channel" "email_alerts" {
  display_name = "PersonaPass HSM Email Alerts"
  type         = "email"
  
  labels = {
    email_address = var.alert_email
  }
}

# Secret Manager for HSM configuration
resource "google_secret_manager_secret" "hsm_config" {
  secret_id = "personapass-hsm-config"
  
  replication {
    auto {}
  }
  
  depends_on = [google_project_service.required_apis]
}

resource "google_secret_manager_secret_version" "hsm_config_version" {
  secret = google_secret_manager_secret.hsm_config.id
  
  secret_data = jsonencode({
    keyring_id = google_kms_key_ring.personapass_hsm.id
    keys = {
      did_signing    = google_kms_crypto_key.did_signing_key.id
      encryption     = google_kms_crypto_key.encryption_key.id
      credential_signing = google_kms_crypto_key.credential_signing_key.id
    }
    service_account = google_service_account.hsm_service_account.email
    backup_bucket   = google_storage_bucket.hsm_backups.name
  })
}

# Grant access to the secret
resource "google_secret_manager_secret_iam_binding" "hsm_config_access" {
  secret_id = google_secret_manager_secret.hsm_config.id
  role      = "roles/secretmanager.secretAccessor"
  
  members = [
    "serviceAccount:${google_service_account.hsm_service_account.email}"
  ]
}

# Cloud Function for HSM operations (placeholder)
resource "google_storage_bucket" "hsm_function_source" {
  name          = "${local.project_id}-personapass-hsm-functions"
  location      = local.region
  force_destroy = true
  
  uniform_bucket_level_access = true
  
  labels = local.common_labels
}

# Outputs
output "project_id" {
  description = "GCP Project ID"
  value       = local.project_id
}

output "hsm_keyring_id" {
  description = "HSM Key Ring ID"
  value       = google_kms_key_ring.personapass_hsm.id
}

output "did_signing_key_id" {
  description = "DID Signing Key ID"
  value       = google_kms_crypto_key.did_signing_key.id
}

output "encryption_key_id" {
  description = "Encryption Key ID"
  value       = google_kms_crypto_key.encryption_key.id
}

output "credential_signing_key_id" {
  description = "Credential Signing Key ID"
  value       = google_kms_crypto_key.credential_signing_key.id
}

output "hsm_service_account_email" {
  description = "HSM Service Account Email"
  value       = google_service_account.hsm_service_account.email
}

output "hsm_backup_bucket" {
  description = "HSM Backup Bucket Name"
  value       = google_storage_bucket.hsm_backups.name
}

output "hsm_network_id" {
  description = "HSM Network ID"
  value       = google_compute_network.hsm_network.id
}

output "hsm_subnet_id" {
  description = "HSM Subnet ID"
  value       = google_compute_subnetwork.hsm_subnet.id
}

output "secret_config_id" {
  description = "HSM Configuration Secret ID"
  value       = google_secret_manager_secret.hsm_config.id
}