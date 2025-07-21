# PersonaPass HSM Production Variables
# These would be populated with actual AWS credentials and configuration

# AWS Configuration (commented out for security)
# aws_access_key_id = "AKIAIOSFODNN7EXAMPLE"
# aws_secret_access_key = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
# aws_region = "us-east-1"

# HSM Configuration
hsm_cluster_name = "personapass-production"
environment = "production"
enable_cross_region_backup = true
backup_region = "us-west-2"
backup_retention_days = 365

# Common tags
common_tags = {
  Project        = "PersonaPass"
  Environment    = "production"
  SecurityLevel  = "Critical"
  Compliance     = "FIPS-140-2-Level-3"
  BackupRequired = "true"
  MonitoringRequired = "true"
}