# Run SaaS - Student Management System

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Table of Contents

- [Getting Started](#getting-started)
- [Git Workflow & Branching Strategy](#git-workflow--branching-strategy)
- [Development Guidelines](#development-guidelines)
- [Learn More](#learn-more)
- [Deployment](#deployment)

---

## Getting Started

### Environment Configuration

Create a `.env.local` file in the root directory with the following variables:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"

# Storage Configuration
STORAGE_PROVIDER=local
# or use cloudinary
# STORAGE_PROVIDER=cloudinary
# CLOUDINARY_CLOUD_NAME=your_cloud_name
# CLOUDINARY_API_KEY=your_api_key
# CLOUDINARY_API_SECRET=your_api_secret

# NextAuth Configuration
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
```

### Run the Development Server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

---

## Git Workflow & Branching Strategy

We follow a **Modified Git Flow** strategy to maintain clean, stable code for production while enabling active development.

### 📌 Branch Structure

| Branch | Purpose | Protected? | Deploy? |
|--------|---------|-----------|---------|
| `main` | Production-ready code | ✅ Yes | ✅ Auto-deploy to production |
| `develop` | Active development & integration | ⚠️ Semi | 🟡 Deploy to staging |
| `feature/*` | Individual feature development | ❌ No | ❌ No |
| `hotfix/*` | Critical production bug fixes | ❌ No | ❌ No |

### 🏷️ Versioning Strategy

We use **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

- **MAJOR** (v2.0.0) - Breaking changes or major redesigns
- **MINOR** (v1.1.0) - New features (backward compatible)
- **PATCH** (v1.0.1) - Bug fixes and minor improvements

**Current Version:** `v1.0.0` - Mobile-first UX redesign with emerald theme

---

### 🚀 Development Workflow

#### 1️⃣ Starting a New Feature

```bash
# Always start from develop branch
git checkout develop
git pull origin develop

# Create a new feature branch
git checkout -b feature/your-feature-name

# Work on your feature...
git add .
git commit -m "feat: add your feature description"

# Push your feature branch
git push origin feature/your-feature-name
```

#### 2️⃣ Completing a Feature

```bash
# Update your branch with latest develop
git checkout develop
git pull origin develop
git checkout feature/your-feature-name
git merge develop

# Resolve any conflicts, then merge back to develop
git checkout develop
git merge feature/your-feature-name

# Push to develop
git push origin develop

# Delete the feature branch (optional)
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

#### 3️⃣ Creating a Release (Merge develop → main)

```bash
# When develop is stable and ready for production
git checkout main
git pull origin main
git merge develop

# Tag the release
git tag -a v1.1.0 -m "Release v1.1.0: Description of changes"

# Push to main with tags
git push origin main --tags
```

#### 4️⃣ Hotfix Workflow (Critical Production Bugs)

```bash
# Branch directly from main
git checkout main
git pull origin main
git checkout -b hotfix/critical-bug-description

# Fix the bug and test thoroughly
git add .
git commit -m "fix: resolve critical bug"

# Merge to BOTH main and develop
git checkout main
git merge hotfix/critical-bug-description
git tag -a v1.0.1 -m "Hotfix v1.0.1: Bug fix description"
git push origin main --tags

git checkout develop
git merge hotfix/critical-bug-description
git push origin develop

# Delete hotfix branch
git branch -d hotfix/critical-bug-description
```

---

### 📝 Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/) for clear commit history:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

**Examples:**
```bash
git commit -m "feat: add student reassignment functionality"
git commit -m "fix: resolve attendance QR scanning issue"
git commit -m "docs: update API documentation"
git commit -m "refactor: optimize database queries"
```

---

### 🔒 Branch Protection Rules

**For `main` branch:**
- ✅ Require pull request reviews before merging
- ✅ Require status checks to pass
- ✅ Require branches to be up to date
- ✅ Include administrators in restrictions

**For `develop` branch:**
- ⚠️ Optional: Require pull request reviews
- ✅ Require status checks to pass

---

### 📦 Release History

- **v1.0.0** (Current) - Mobile-first UX redesign with emerald theme
  - Responsive dashboard layouts
  - Auto-switch table/card views on mobile
  - Emerald staff theme consistency
  - Optimized attendance, reports, and listing pages

---

## Development Guidelines

### Code Style

- Use **TypeScript** for type safety
- Follow **ESLint** and **Prettier** configurations
- Use **Tailwind CSS** for styling (mobile-first approach)
- Component naming: PascalCase for components, camelCase for utilities
- Follow the established emerald theme for staff areas

### Mobile-First Design Patterns

- Auto-switch between table and card views at 768px breakpoint
- Use `flex-1` for search inputs, auto-width for filters
- Stats: 2 columns on mobile, 4 on desktop
- Apply ScrollArea for wide tables
- Emerald theme (`emerald-600`, `emerald-700`) for staff primary actions

### Testing Before Commit

```bash
# Run linting
npm run lint

# Build the project to check for errors
npm run build

# Run tests (if available)
npm run test
```

---

## Learn More

To learn more about Next.js and the technologies used:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Tailwind CSS](https://tailwindcss.com/docs) - utility-first CSS framework.
- [Prisma](https://www.prisma.io/docs) - next-generation ORM.
- [shadcn/ui](https://ui.shadcn.com/) - re-usable components built with Radix UI.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

---

## Deployment

### Deploy on Vercel (Production)

The `main` branch is automatically deployed to production via Vercel.

1. Push changes to `main` branch
2. Vercel automatically builds and deploys
3. Monitor deployment at [Vercel Dashboard](https://vercel.com)

### Manual Deployment

```bash
# Build for production
npm run build

# Start production server
npm run start
```

### Environment Variables

Ensure all required environment variables are set in your deployment platform:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- Storage provider credentials (if using cloud storage)

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Support & Contact

For questions or issues, please contact the development team or create an issue in the repository.

**Happy Coding! 🚀**