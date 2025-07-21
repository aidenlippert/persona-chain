# Outputs for PersonaPass HSM Module

output "hsm_cluster_id" {
  description = "CloudHSM cluster ID"
  value       = aws_cloudhsm_v2_cluster.personapass.cluster_id
}

output "hsm_cluster_arn" {
  description = "CloudHSM cluster ARN"
  value       = aws_cloudhsm_v2_cluster.personapass.arn
}

output "hsm_cluster_state" {
  description = "CloudHSM cluster state"
  value       = aws_cloudhsm_v2_cluster.personapass.cluster_state
}

output "hsm_cluster_certificates" {
  description = "CloudHSM cluster certificates"
  value       = aws_cloudhsm_v2_cluster.personapass.cluster_certificates
  sensitive   = true
}

output "hsm_security_group_id" {
  description = "Security group ID for HSM cluster"
  value       = aws_security_group.hsm.id
}

output "hsm_client_security_group_id" {
  description = "Security group ID for HSM clients"
  value       = aws_security_group.hsm_client.id
}

output "hsm_instance_ids" {
  description = "List of HSM instance IDs"
  value       = aws_cloudhsm_v2_hsm.personapass_primary[*].hsm_id
}

output "hsm_instance_states" {
  description = "List of HSM instance states"
  value       = aws_cloudhsm_v2_hsm.personapass_primary[*].hsm_state
}

output "hsm_service_role_arn" {
  description = "IAM role ARN for HSM service"
  value       = aws_iam_role.hsm_service.arn
}

output "hsm_application_role_arn" {
  description = "IAM role ARN for HSM applications"
  value       = aws_iam_role.hsm_application.arn
}

output "hsm_client_instance_profile_arn" {
  description = "Instance profile ARN for HSM clients"
  value       = aws_iam_instance_profile.hsm_client.arn
}

output "hsm_backup_bucket" {
  description = "S3 bucket name for HSM backups"
  value       = aws_s3_bucket.hsm_backups.bucket
}

output "hsm_backup_bucket_arn" {
  description = "S3 bucket ARN for HSM backups"
  value       = aws_s3_bucket.hsm_backups.arn
}

output "hsm_log_group_name" {
  description = "CloudWatch log group name for HSM"
  value       = aws_cloudwatch_log_group.hsm.name
}

output "hsm_log_group_arn" {
  description = "CloudWatch log group ARN for HSM"
  value       = aws_cloudwatch_log_group.hsm.arn
}