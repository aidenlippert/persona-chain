# PersonaPass Infrastructure as Code
# Production-grade Terraform configuration for AWS deployment

terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  backend "s3" {
    bucket         = "personapass-terraform-state"
    key            = "production/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "personapass-terraform-locks"
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# Local values
locals {
  cluster_name = "personapass-prod"
  environment  = "production"
  region      = "us-east-1"
  
  common_tags = {
    Environment   = local.environment
    Project      = "PersonaPass"
    ManagedBy    = "Terraform"
    Owner        = "DevOps Team"
    CostCenter   = "Engineering"
    Compliance   = "SOC2-GDPR-PCI"
  }

  # Network configuration
  vpc_cidr = "10.0.0.0/16"
  azs      = slice(data.aws_availability_zones.available.names, 0, 3)
  
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]
  db_subnets      = ["10.0.201.0/24", "10.0.202.0/24", "10.0.203.0/24"]
}

# VPC and Networking
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.cluster_name}-vpc"
  cidr = local.vpc_cidr

  azs             = local.azs
  private_subnets = local.private_subnets
  public_subnets  = local.public_subnets
  database_subnets = local.db_subnets

  enable_nat_gateway = true
  enable_vpn_gateway = false
  enable_dns_hostnames = true
  enable_dns_support = true

  # Enable VPC Flow Logs for security monitoring
  enable_flow_log                      = true
  create_flow_log_cloudwatch_iam_role  = true
  create_flow_log_cloudwatch_log_group = true
  flow_log_cloudwatch_log_group_retention_in_days = 30

  # Subnet tagging for EKS
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
  }

  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
    "kubernetes.io/cluster/${local.cluster_name}" = "shared"
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-vpc"
  })
}

# Security Groups
resource "aws_security_group" "eks_cluster" {
  name_prefix = "${local.cluster_name}-cluster-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port = 443
    to_port   = 443
    protocol  = "tcp"
    cidr_blocks = [local.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-cluster-sg"
  })
}

resource "aws_security_group" "eks_nodes" {
  name_prefix = "${local.cluster_name}-nodes-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  ingress {
    from_port       = 1025
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_cluster.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-nodes-sg"
  })
}

# KMS Key for encryption
resource "aws_kms_key" "personapass" {
  description             = "PersonaPass encryption key"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow EKS use"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
        Action = [
          "kms:Decrypt",
          "kms:GenerateDataKey*"
        ]
        Resource = "*"
      }
    ]
  })

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-kms-key"
  })
}

resource "aws_kms_alias" "personapass" {
  name          = "alias/${local.cluster_name}"
  target_key_id = aws_kms_key.personapass.key_id
}

# EKS Cluster
module "eks" {
  source = "terraform-aws-modules/eks/aws"
  version = "~> 19.0"

  cluster_name    = local.cluster_name
  cluster_version = "1.28"

  vpc_id                         = module.vpc.vpc_id
  subnet_ids                     = module.vpc.private_subnets
  cluster_endpoint_public_access = true
  cluster_endpoint_public_access_cidrs = ["0.0.0.0/0"]  # Restrict in production
  cluster_endpoint_private_access = true

  # Encryption configuration
  cluster_encryption_config = {
    provider_key_arn = aws_kms_key.personapass.arn
    resources        = ["secrets"]
  }

  # CloudWatch logging
  cluster_enabled_log_types = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  cloudwatch_log_group_retention_in_days = 30

  # EKS Managed Node Groups
  eks_managed_node_groups = {
    # General purpose nodes
    general = {
      name           = "general"
      instance_types = ["m5.xlarge", "m5.2xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 3
      max_size     = 10
      desired_size = 5

      disk_size = 100
      disk_type = "gp3"

      labels = {
        Environment = local.environment
        NodeType    = "general"
      }

      taints = []

      # Security
      remote_access = {
        ec2_ssh_key = aws_key_pair.cluster_key.key_name
        source_security_group_ids = [aws_security_group.eks_nodes.id]
      }

      # Launch template configuration
      create_launch_template = true
      launch_template_name   = "${local.cluster_name}-general"
      launch_template_use_name_prefix = true
      launch_template_version = "$Latest"

      vpc_security_group_ids = [aws_security_group.eks_nodes.id]

      # User data for node initialization
      pre_bootstrap_user_data = <<-EOT
        #!/bin/bash
        # Install additional security tools
        yum update -y
        yum install -y amazon-cloudwatch-agent
        
        # Configure CloudWatch agent
        /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
          -a fetch-config \
          -m ec2 \
          -c ssm:AmazonCloudWatch-linux \
          -s
      EOT
    }

    # Blockchain-specific nodes with higher resources
    blockchain = {
      name           = "blockchain"
      instance_types = ["c5.2xlarge", "c5.4xlarge"]
      capacity_type  = "ON_DEMAND"

      min_size     = 2
      max_size     = 5
      desired_size = 3

      disk_size = 200
      disk_type = "gp3"

      labels = {
        Environment = local.environment
        NodeType    = "blockchain"
        Workload    = "cpu-intensive"
      }

      taints = [
        {
          key    = "personapass.io/blockchain"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]

      remote_access = {
        ec2_ssh_key = aws_key_pair.cluster_key.key_name
        source_security_group_ids = [aws_security_group.eks_nodes.id]
      }

      create_launch_template = true
      launch_template_name   = "${local.cluster_name}-blockchain"
      launch_template_use_name_prefix = true
      launch_template_version = "$Latest"

      vpc_security_group_ids = [aws_security_group.eks_nodes.id]
    }

    # Monitoring nodes
    monitoring = {
      name           = "monitoring"
      instance_types = ["m5.large", "m5.xlarge"]
      capacity_type  = "SPOT"

      min_size     = 1
      max_size     = 3
      desired_size = 2

      disk_size = 150
      disk_type = "gp3"

      labels = {
        Environment = local.environment
        NodeType    = "monitoring"
      }

      taints = [
        {
          key    = "personapass.io/monitoring"
          value  = "true"
          effect = "NO_SCHEDULE"
        }
      ]

      remote_access = {
        ec2_ssh_key = aws_key_pair.cluster_key.key_name
        source_security_group_ids = [aws_security_group.eks_nodes.id]
      }

      create_launch_template = true
      launch_template_name   = "${local.cluster_name}-monitoring"
      launch_template_use_name_prefix = true
      launch_template_version = "$Latest"

      vpc_security_group_ids = [aws_security_group.eks_nodes.id]
    }
  }

  # aws-auth configmap
  manage_aws_auth_configmap = true

  aws_auth_roles = [
    {
      rolearn  = aws_iam_role.cluster_admin.arn
      username = "cluster-admin"
      groups   = ["system:masters"]
    },
  ]

  aws_auth_users = [
    {
      userarn  = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:user/devops-team"
      username = "devops-team"
      groups   = ["system:masters"]
    },
  ]

  tags = local.common_tags
}

# EC2 Key Pair for node access
resource "aws_key_pair" "cluster_key" {
  key_name   = "${local.cluster_name}-key"
  public_key = file("~/.ssh/personapass_cluster.pub")  # Generate this key beforehand

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-key"
  })
}

# IAM Role for cluster administrators
resource "aws_iam_role" "cluster_admin" {
  name = "${local.cluster_name}-admin-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
      },
    ]
  })

  tags = local.common_tags
}

# RDS for application data (if needed)
resource "aws_db_subnet_group" "personapass" {
  name       = "${local.cluster_name}-db-subnet-group"
  subnet_ids = module.vpc.database_subnets

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-db-subnet-group"
  })
}

resource "aws_security_group" "rds" {
  name_prefix = "${local.cluster_name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.eks_nodes.id]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-rds-sg"
  })
}

resource "aws_db_instance" "personapass" {
  count = 0  # Set to 1 if you need RDS

  identifier = "${local.cluster_name}-db"
  
  engine         = "postgres"
  engine_version = "15.4"
  instance_class = "db.t3.medium"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  storage_type         = "gp3"
  storage_encrypted    = true
  kms_key_id          = aws_kms_key.personapass.arn

  db_name  = "personapass"
  username = "personapass_admin"
  password = random_password.db_password[0].result

  vpc_security_group_ids = [aws_security_group.rds.id]
  db_subnet_group_name   = aws_db_subnet_group.personapass.name

  backup_retention_period = 30
  backup_window          = "03:00-04:00"
  maintenance_window     = "sun:04:00-sun:05:00"

  skip_final_snapshot = false
  final_snapshot_identifier = "${local.cluster_name}-db-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}"

  enabled_cloudwatch_logs_exports = ["postgresql"]
  performance_insights_enabled    = true
  monitoring_interval            = 60

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-database"
  })
}

resource "random_password" "db_password" {
  count = 0  # Set to 1 if you need RDS
  
  length  = 32
  special = true
}

# S3 Buckets for storage
resource "aws_s3_bucket" "personapass_backups" {
  bucket = "${local.cluster_name}-backups-${random_id.bucket_suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-backups"
    Purpose = "Blockchain and application backups"
  })
}

resource "aws_s3_bucket" "personapass_logs" {
  bucket = "${local.cluster_name}-logs-${random_id.bucket_suffix.hex}"

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-logs"
    Purpose = "Application and audit logs"
  })
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# S3 Bucket configurations
resource "aws_s3_bucket_versioning" "personapass_backups" {
  bucket = aws_s3_bucket.personapass_backups.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_encryption" "personapass_backups" {
  bucket = aws_s3_bucket.personapass_backups.id

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        kms_master_key_id = aws_kms_key.personapass.arn
        sse_algorithm     = "aws:kms"
      }
    }
  }
}

resource "aws_s3_bucket_public_access_block" "personapass_backups" {
  bucket = aws_s3_bucket.personapass_backups.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_lifecycle_configuration" "personapass_backups" {
  bucket = aws_s3_bucket.personapass_backups.id

  rule {
    id     = "backup_lifecycle"
    status = "Enabled"

    expiration {
      days = 365
    }

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    transition {
      days          = 30
      storage_class = "STANDARD_IA"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "personapass_application" {
  name              = "/aws/eks/${local.cluster_name}/application"
  retention_in_days = 30
  kms_key_id       = aws_kms_key.personapass.arn

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-application-logs"
  })
}

# Application Load Balancer
resource "aws_lb" "personapass" {
  name               = "${local.cluster_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = module.vpc.public_subnets

  enable_deletion_protection = true
  enable_http2              = true
  drop_invalid_header_fields = true

  access_logs {
    bucket  = aws_s3_bucket.personapass_logs.bucket
    prefix  = "alb-access-logs"
    enabled = true
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-alb"
  })
}

resource "aws_security_group" "alb" {
  name_prefix = "${local.cluster_name}-alb-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-alb-sg"
  })
}

# Route53 for DNS
resource "aws_route53_zone" "personapass" {
  name = "personapass.io"

  tags = merge(local.common_tags, {
    Name = "personapass.io"
  })
}

# ACM Certificate for SSL/TLS
resource "aws_acm_certificate" "personapass" {
  domain_name       = "personapass.io"
  subject_alternative_names = [
    "*.personapass.io",
    "api.personapass.io",
    "rpc.personapass.io",
    "monitoring.personapass.io"
  ]
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = merge(local.common_tags, {
    Name = "personapass.io"
  })
}

# Certificate validation
resource "aws_route53_record" "personapass_cert_validation" {
  for_each = {
    for dvo in aws_acm_certificate.personapass.domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.personapass.zone_id
}

resource "aws_acm_certificate_validation" "personapass" {
  certificate_arn         = aws_acm_certificate.personapass.arn
  validation_record_fqdns = [for record in aws_route53_record.personapass_cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# WAF for additional security
resource "aws_wafv2_web_acl" "personapass" {
  name  = "${local.cluster_name}-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  # Rate limiting rule
  rule {
    name     = "RateLimitRule"
    priority = 1

    override_action {
      none {}
    }

    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitRule"
      sampled_requests_enabled   = true
    }

    action {
      block {}
    }
  }

  # AWS Managed Rules
  rule {
    name     = "AWS-AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  tags = merge(local.common_tags, {
    Name = "${local.cluster_name}-waf"
  })

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${local.cluster_name}-waf"
    sampled_requests_enabled   = true
  }
}

# Associate WAF with ALB
resource "aws_wafv2_web_acl_association" "personapass" {
  resource_arn = aws_lb.personapass.arn
  web_acl_arn  = aws_wafv2_web_acl.personapass.arn
}

# Output values
output "cluster_id" {
  description = "EKS cluster ID"
  value       = module.eks.cluster_id
}

output "cluster_arn" {
  description = "EKS cluster ARN"
  value       = module.eks.cluster_arn
}

output "cluster_endpoint" {
  description = "Endpoint for EKS control plane"
  value       = module.eks.cluster_endpoint
}

output "cluster_security_group_id" {
  description = "Security group ids attached to the cluster control plane"
  value       = module.eks.cluster_security_group_id
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate data required to communicate with the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "vpc_id" {
  description = "ID of the VPC where the cluster is deployed"
  value       = module.vpc.vpc_id
}

output "private_subnets" {
  description = "List of IDs of private subnets"
  value       = module.vpc.private_subnets
}

output "public_subnets" {
  description = "List of IDs of public subnets"
  value       = module.vpc.public_subnets
}

output "kms_key_arn" {
  description = "ARN of the KMS key used for encryption"
  value       = aws_kms_key.personapass.arn
}

output "s3_backup_bucket" {
  description = "S3 bucket for backups"
  value       = aws_s3_bucket.personapass_backups.bucket
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.personapass.dns_name
}

output "route53_zone_id" {
  description = "Route53 zone ID"
  value       = aws_route53_zone.personapass.zone_id
}

output "certificate_arn" {
  description = "ARN of the ACM certificate"
  value       = aws_acm_certificate.personapass.arn
}