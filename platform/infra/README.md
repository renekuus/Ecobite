# EcoBite Infrastructure

AWS CDK (TypeScript) definitions. Deploys to `eu-north-1` (Stockholm — closest to Helsinki).

## Files

| File | Resource |
|---|---|
| `rds.ts` | RDS PostgreSQL instance (Multi-AZ for production) |
| `elasticache.ts` | Redis cluster (ElastiCache) |
| `s3.ts` | S3 buckets: assets, documents, exports, kyc, backups |
| `cloudfront.ts` | CloudFront distribution for S3 assets (signed URLs) |
| `sqs.ts` | SQS queues: order-notifications, trip-assignment, payouts |
| `alb.ts` | Application Load Balancer for API |

## Environments

- `dev` — single-AZ, minimal instances, public access for development
- `staging` — mirrors production topology, reduced capacity
- `prod` — Multi-AZ RDS, Redis cluster, full CloudFront, ALB

## Setup (not yet implemented)

```bash
npm install -g aws-cdk
cdk bootstrap aws://ACCOUNT_ID/eu-north-1
cdk deploy --context env=dev
```
