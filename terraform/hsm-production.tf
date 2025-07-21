# PersonaPass Production HSM Deployment
# Critical security infrastructure for Fort Knox-level key management

terraform {
  required_version = ">= 1.5"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "personapass-terraform-state-prod"
    key            = "hsm/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "personapass-terraform-locks"
  }
}

# Provider configuration
provider "aws" {
  region = "us-east-1"
  
  default_tags {
    tags = {
      Project     = "PersonaPass"
      Environment = "production"
      Owner       = "Security Team"
      Criticality = "High"
      Compliance  = "FIPS-140-2-Level-3"
      CreatedBy   = "Terraform"
      CreatedAt   = timestamp()
    }
  }
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# Local variables
locals {
  account_id = data.aws_caller_identity.current.account_id
  region     = data.aws_region.current.name
  
  common_tags = {
    Project        = "PersonaPass"
    Environment    = "production"
    SecurityLevel  = "Critical"
    Compliance     = "FIPS-140-2-Level-3"
    BackupRequired = "true"
    MonitoringRequired = "true"
  }
}

# VPC for HSM (dedicated isolated network)
resource "aws_vpc" "hsm_vpc" {
  cidr_block           = "10.0.240.0/21"  # 2048 IPs
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-vpc"
    Purpose = "HSM Isolation"
  })
}

# Internet Gateway for NAT access
resource "aws_internet_gateway" "hsm_igw" {
  vpc_id = aws_vpc.hsm_vpc.id

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-igw"
  })
}

# Private subnets for HSM instances (3 AZs for HA)
resource "aws_subnet" "hsm_private" {
  count             = 3
  vpc_id            = aws_vpc.hsm_vpc.id
  cidr_block        = "10.0.${240 + count.index}.0/24"
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-private-${count.index + 1}"
    Type = "Private"
  })
}

# Public subnets for NAT gateways
resource "aws_subnet" "hsm_public" {
  count                   = 3
  vpc_id                  = aws_vpc.hsm_vpc.id
  cidr_block              = "10.0.${244 + count.index}.0/24"
  availability_zone       = data.aws_availability_zones.available.names[count.index]
  map_public_ip_on_launch = true

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-public-${count.index + 1}"
    Type = "Public"
  })
}

# Elastic IPs for NAT Gateways
resource "aws_eip" "hsm_nat" {
  count  = 3
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-nat-eip-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.hsm_igw]
}

# NAT Gateways for outbound internet access
resource "aws_nat_gateway" "hsm_nat" {
  count         = 3
  allocation_id = aws_eip.hsm_nat[count.index].id
  subnet_id     = aws_subnet.hsm_public[count.index].id

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-nat-${count.index + 1}"
  })

  depends_on = [aws_internet_gateway.hsm_igw]
}

# Route tables
resource "aws_route_table" "hsm_public" {
  vpc_id = aws_vpc.hsm_vpc.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.hsm_igw.id
  }

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-public-rt"
  })
}

resource "aws_route_table" "hsm_private" {
  count  = 3
  vpc_id = aws_vpc.hsm_vpc.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.hsm_nat[count.index].id
  }

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-private-rt-${count.index + 1}"
  })
}

# Route table associations
resource "aws_route_table_association" "hsm_public" {
  count          = 3
  subnet_id      = aws_subnet.hsm_public[count.index].id
  route_table_id = aws_route_table.hsm_public.id
}

resource "aws_route_table_association" "hsm_private" {
  count          = 3
  subnet_id      = aws_subnet.hsm_private[count.index].id
  route_table_id = aws_route_table.hsm_private[count.index].id
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# KMS key for HSM encryption
resource "aws_kms_key" "hsm_key" {
  description             = "PersonaPass HSM KMS Key"
  deletion_window_in_days = 30
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${local.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow CloudHSM Service"
        Effect = "Allow"
        Principal = {
          Service = "cloudhsm.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-kms-key"
  })
}

resource "aws_kms_alias" "hsm_key" {
  name          = "alias/personapass-hsm"
  target_key_id = aws_kms_key.hsm_key.key_id
}

# SNS topic for HSM alerts
resource "aws_sns_topic" "hsm_alerts" {
  name = "personapass-hsm-alerts"

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-alerts"
  })
}

# HSM Module deployment
module "hsm" {
  source = "./modules/hsm"

  cluster_name       = "personapass-production"
  environment        = "production"
  vpc_id             = aws_vpc.hsm_vpc.id
  private_subnet_ids = aws_subnet.hsm_private[*].id
  kms_key_arn        = aws_kms_key.hsm_key.arn
  sns_topic_arn      = aws_sns_topic.hsm_alerts.arn
  common_tags        = local.common_tags

  hsm_instance_type         = "hsm1.medium"
  backup_retention_days     = 365
  enable_cross_region_backup = true
  backup_region             = "us-west-2"
}

# Security Groups for HSM
resource "aws_security_group" "hsm_sg" {
  name        = "personapass-hsm-sg"
  description = "Security group for PersonaPass HSM cluster"
  vpc_id      = aws_vpc.hsm_vpc.id

  # HSM cluster communication
  ingress {
    from_port   = 2223
    to_port     = 2225
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.hsm_vpc.cidr_block]
    description = "HSM cluster communication"
  }

  # Client connections
  ingress {
    from_port   = 2222
    to_port     = 2222
    protocol    = "tcp"
    cidr_blocks = [aws_vpc.hsm_vpc.cidr_block]
    description = "HSM client connections"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "All outbound traffic"
  }

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-sg"
  })
}

# CloudWatch Log Group for HSM
resource "aws_cloudwatch_log_group" "hsm_logs" {
  name              = "/aws/cloudhsm/personapass"
  retention_in_days = 365

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-logs"
  })
}

# IAM role for HSM service
resource "aws_iam_role" "hsm_service_role" {
  name = "personapass-hsm-service-role"

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

  tags = merge(local.common_tags, {
    Name = "personapass-hsm-service-role"
  })
}

# IAM policy for HSM service
resource "aws_iam_role_policy" "hsm_service_policy" {
  name = "personapass-hsm-service-policy"
  role = aws_iam_role.hsm_service_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams"
        ]
        Resource = "${aws_cloudwatch_log_group.hsm_logs.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey",
          "kms:CreateGrant"
        ]
        Resource = aws_kms_key.hsm_key.arn
      }
    ]
  })
}

# Outputs
output "hsm_cluster_id" {
  description = "HSM cluster ID"
  value       = module.hsm.cluster_id
  sensitive   = true
}

output "hsm_cluster_certificates" {
  description = "HSM cluster certificates"
  value       = module.hsm.cluster_certificates
  sensitive   = true
}

output "hsm_security_group_id" {
  description = "HSM security group ID"
  value       = aws_security_group.hsm_sg.id
}

output "vpc_id" {
  description = "HSM VPC ID"
  value       = aws_vpc.hsm_vpc.id
}

output "private_subnet_ids" {
  description = "HSM private subnet IDs"
  value       = aws_subnet.hsm_private[*].id
}