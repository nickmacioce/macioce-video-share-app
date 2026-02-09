# Home Video Share


A simple web app to make sharing longer format home videos to friends and family.

## Architecture

```
Browser  →  Vercel (Next.js)  →  S3 Bucket (Private)
                ↓
         Pre-signed URLs
```

## Prerequisites

- Node.js 24+
- AWS account with CLI configured
- Terraform 1.0+
- (Optional) Upstash Redis for rate limiting

## Local Development

1. **Clone and install**
   ```bash
   git clone <repo-url>
   cd video-share-site
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```bash
   APP_PASSWORD=your-shared-password
   AUTH_SECRET=$(openssl rand -hex 32)
   ```

3. **Deploy AWS infrastructure**
   ```bash
   cd infra
   cp terraform.tfvars.example terraform.tfvars
   # Edit terraform.tfvars with your bucket name
   terraform init
   terraform apply
   ```

   Add outputs to `.env.local`:
   ```bash
   terraform output -raw access_key_id
   terraform output -raw secret_access_key
   terraform output bucket_name
   ```

4. **Start dev server**
   ```bash
   npm run dev
   ```

## CI/CD

GitHub Actions:
- **CI**: Lint and build
- **Security**: Gitleaks, npm audit, CodeQL, Semgrep, tfsec


