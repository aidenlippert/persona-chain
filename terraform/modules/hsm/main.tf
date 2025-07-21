# PersonaPass HSM Infrastructure Module
# AWS CloudHSM cluster with high availability and security hardening

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Local variables
locals {
  cluster_name = var.cluster_name
  environment  = var.environment
  
  common_tags = merge(var.common_tags, {
    Module = "HSM"
    Purpose = "Hardware Security Module"
    Security = "Critical"
  })

  # HSM subnets in private network
  hsm_subnets = ["10.0.250.0/26", "10.0.250.64/26", "10.0.250.128/26"]
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

# HSM Cluster
resource "aws_cloudhsm_v2_cluster" "personapass" {
  hsm_type   = "hsm1.medium"
  subnet_ids = var.private_subnet_ids

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-cluster"
  })
}

# HSM Instances (3 for HA)
resource "aws_cloudhsm_v2_hsm" "personapass_primary" {
  count      = 3
  cluster_id = aws_cloudhsm_v2_cluster.personapass.cluster_id
  
  # Distribute across availability zones
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-${count.index + 1}"
    Role = "Primary"
  })
}

# Security Group for HSM
resource "aws_security_group" "hsm" {
  name_prefix = "${local.cluster_name}-hsm-"
  vpc_id      = var.vpc_id
  description = "Security group for PersonaPass HSM cluster"

  # HSM communication ports
  ingress {
    description = "HSM Client Communication"
    from_port   = 2223
    to_port     = 2225
    protocol    = "tcp"
    security_groups = [aws_security_group.hsm_client.id]
  }

  # Management interface
  ingress {
    description = "HSM Management"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["10.0.0.0/8"]  # VPC only
  }

  egress {
    description = "All outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-sg"
  })
}

# Security Group for HSM Clients
resource "aws_security_group" "hsm_client" {
  name_prefix = "${local.cluster_name}-hsm-client-"
  vpc_id      = var.vpc_id
  description = "Security group for HSM client applications"

  # Application access to HSM
  egress {
    description     = "HSM Communication"
    from_port       = 2223
    to_port         = 2225
    protocol        = "tcp"
    security_groups = [aws_security_group.hsm.id]
  }

  # Standard web traffic
  egress {
    description = "HTTPS traffic"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "HTTP traffic"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-client-sg"
  })
}

# CloudWatch Log Group for HSM
resource "aws_cloudwatch_log_group" "hsm" {
  name              = "/aws/cloudhsm/${local.cluster_name}"
  retention_in_days = 90
  kms_key_id       = var.kms_key_arn

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-logs"
  })
}

# IAM Role for HSM Service
resource "aws_iam_role" "hsm_service" {
  name = "${local.cluster_name}-hsm-service-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "cloudhsm.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for HSM Service
resource "aws_iam_policy" "hsm_service" {
  name        = "${local.cluster_name}-hsm-service-policy"
  description = "IAM policy for PersonaPass HSM service"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "${aws_cloudwatch_log_group.hsm.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:DescribeKey"
        ]
        Resource = var.kms_key_arn
      }
    ]
  })

  tags = local.common_tags
}

# Attach policy to role
resource "aws_iam_role_policy_attachment" "hsm_service" {
  role       = aws_iam_role.hsm_service.name
  policy_arn = aws_iam_policy.hsm_service.arn
}

# IAM Role for HSM Applications
resource "aws_iam_role" "hsm_application" {
  name = "${local.cluster_name}-hsm-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

# IAM Policy for HSM Applications
resource "aws_iam_policy" "hsm_application" {
  name        = "${local.cluster_name}-hsm-app-policy"
  description = "IAM policy for applications using PersonaPass HSM"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudhsm:DescribeClusters",
          "cloudhsm:DescribeHsms",
          "cloudhsm:ListTags"
        ]
        Resource = aws_cloudhsm_v2_cluster.personapass.cluster_id
      },
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.hsm.arn}:*"
      }
    ]
  })

  tags = local.common_tags
}

# Attach policy to application role
resource "aws_iam_role_policy_attachment" "hsm_application" {
  role       = aws_iam_role.hsm_application.name
  policy_arn = aws_iam_policy.hsm_application.arn
}

# Instance profile for HSM client EC2 instances
resource "aws_iam_instance_profile" "hsm_client" {
  name = "${local.cluster_name}-hsm-client-profile"
  role = aws_iam_role.hsm_application.name

  tags = local.common_tags
}

# CloudWatch Alarms for HSM Monitoring
resource "aws_cloudwatch_metric_alarm" "hsm_health" {
  count = length(aws_cloudhsm_v2_hsm.personapass_primary)
  
  alarm_name          = "${local.cluster_name}-hsm-${count.index + 1}-health"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "HsmState"
  namespace           = "AWS/CloudHSM"
  period              = "300"
  statistic           = "Maximum"
  threshold           = "1"
  alarm_description   = "This metric monitors HSM health status"
  alarm_actions       = [var.sns_topic_arn]

  dimensions = {
    ClusterId = aws_cloudhsm_v2_cluster.personapass.cluster_id
    HsmId     = aws_cloudhsm_v2_hsm.personapass_primary[count.index].hsm_id
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-${count.index + 1}-health-alarm"
  })
}

# S3 Bucket for HSM Backups
resource "aws_s3_bucket" "hsm_backups" {
  bucket = "${local.cluster_name}-hsm-backups-${random_id.bucket_suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-backups"
    Purpose = "HSM backup and disaster recovery"
  })
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 bucket encryption
resource "aws_s3_bucket_encryption" "hsm_backups" {
  bucket = aws_s3_bucket.hsm_backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = var.kms_key_arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

# S3 bucket versioning
resource "aws_s3_bucket_versioning" "hsm_backups" {
  bucket = aws_s3_bucket.hsm_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

# S3 bucket public access block
resource "aws_s3_bucket_public_access_block" "hsm_backups" {
  bucket = aws_s3_bucket.hsm_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Network ACLs for additional HSM security
resource "aws_network_acl" "hsm" {
  vpc_id     = var.vpc_id
  subnet_ids = var.private_subnet_ids

  # Allow HSM client communication
  ingress {
    protocol   = "tcp"
    rule_no    = 100
    action     = "allow"
    cidr_block = "10.0.0.0/8"
    from_port  = 2223
    to_port    = 2225
  }

  # Allow SSH for management
  ingress {
    protocol   = "tcp"
    rule_no    = 110
    action     = "allow"
    cidr_block = "10.0.0.0/8"
    from_port  = 22
    to_port    = 22
  }

  # Allow return traffic
  egress {
    protocol   = "-1"
    rule_no    = 100
    action     = "allow"
    cidr_block = "0.0.0.0/0"
    from_port  = 0
    to_port    = 0
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-hsm-nacl"
  })
}