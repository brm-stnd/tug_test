<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

This application can be deployed using GitHub Actions CI/CD. Follow the steps below to configure it:

### 1. Create GitHub Actions Workflow

Create a `.github/workflows/deploy.yml` file in your repository:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: myfuel-api/package-lock.json

      - name: Install dependencies
        working-directory: ./myfuel-api
        run: npm ci

      - name: Run linting
        working-directory: ./myfuel-api
        run: npm run lint

      - name: Run tests
        working-directory: ./myfuel-api
        run: npm run test

      - name: Run e2e tests
        working-directory: ./myfuel-api
        run: npm run test:e2e

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata for Docker
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=sha,prefix=
            type=raw,value=latest

      - name: Build and push Docker image
        uses: docker/build-push-action@v5
        with:
          context: ./myfuel-api
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'

    steps:
      - name: Deploy to server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USERNAME }}
          key: ${{ secrets.SERVER_SSH_KEY }}
          script: |
            cd /opt/app
            docker compose pull
            docker compose up -d
            docker system prune -f
```

### 2. Configure GitHub Secrets

Add the following secrets in your repository settings (`Settings` > `Secrets and variables` > `Actions`):

| Secret Name | Description |
|-------------|-------------|
| `SERVER_HOST` | IP address or hostname of the production server |
| `SERVER_USERNAME` | SSH username for server access |
| `SERVER_SSH_KEY` | Private SSH key for authentication |

### 3. Workflow Pipeline

The CI/CD pipeline consists of 3 jobs:

1. **Test** - Runs linting, unit tests, and e2e tests
2. **Build and Push** - Builds the Docker image and pushes it to GitHub Container Registry
3. **Deploy** - SSH into the server and deploys using docker compose

### 4. Triggering Deployment

- **Automatic**: Every push to the `main` branch triggers the full pipeline
- **Pull Request**: Only runs the test job for validation

## API Documentation

This project uses Swagger/OpenAPI for API documentation. The interactive documentation is automatically generated from the codebase.

### Accessing Swagger UI

When running in development mode, Swagger UI is available at:

```
http://localhost:3000/api/docs
```

