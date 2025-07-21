# PersonaPass SIEM Configuration
project_id = "top-cubist-463420-h6"
region     = "us-central1"

# Security Configuration
security_email = "security@personapass.xyz"
log_retention_days = 90
analytics_retention_days = 365

# Alert Thresholds
alert_thresholds = {
  failed_logins_per_5min = 5
  kms_operations_per_5min = 100
  admin_actions_immediate = 0
}

# Common Labels
common_labels = {
  project        = "personapass"
  environment    = "production"
  security_level = "critical"
  component      = "siem"
  managed_by     = "terraform"
  team           = "security"
  cost_center    = "engineering"
  owner          = "security-team"
}