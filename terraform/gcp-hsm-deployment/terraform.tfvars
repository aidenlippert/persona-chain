# PersonaPass GCP HSM Configuration
# Production deployment for top-cubist-463420-h6

# GCP Project Configuration
project_id = "top-cubist-463420-h6"
region     = "us-central1"
zone       = "us-central1-a"

# Alert Configuration
alert_email = "security@personapass.xyz"

# Environment Configuration
environment = "production"

# HSM Configuration
backup_retention_days = 365
key_rotation_period   = "7776000s"  # 90 days
enable_audit_logging  = true

# Network Configuration
network_cidr = "10.0.100.0/24"

# Common Labels
common_labels = {
  project        = "personapass"
  environment    = "production"
  security_level = "critical"
  compliance     = "fips-140-2-level-3"
  managed_by     = "terraform"
  team           = "security"
  cost_center    = "engineering"
  owner          = "security-team"
}