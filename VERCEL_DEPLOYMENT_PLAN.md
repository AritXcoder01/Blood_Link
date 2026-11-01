# Vercel Deployment Plan & Serverless Architecture — Blood_Link

**Platform:** Vercel (Edge Network + Serverless Functions)  
**Connected Repository:** GitHub (`Blood_Link`)  
**Document Status:** Deployment Architectural Plan (Phase 0.2)

---

## 1. Vercel Architecture Overview

```
                                  [ VERCEL EDGE NETWORK ]
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
             Route: /(.*) [Static SPA]                    Route: /api/(.*) [Serverless]
                       │                                           │
                       ▼                                           ▼
             [ Vite Production Assets ]                  [ Vercel Node.js Serverless ]
             - HTML, CSS, Bundled JS                     - Express API Middleware Wrapper
             - Leaflet Maps (Client)                     - Progressive Matching Dispatch
             - Client-Side Supabase SDK                  - Admin Verification & Audit
                       │                                           │
                       └─────────────────────┬─────────────────────┘
                                             │ HTTPS
                                             ▼
                               [ Supabase PostgreSQL + PostGIS ]
```

---

## 2. Configuration File: `vercel.json`

Place the following configuration in the repository root directory:

```json
{
  "version": 2,
  "buildCommand": "npm run build",
  "outputDirectory": "client/dist",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "geolocation=(self)" }
      ]
    }
  ]
}
```

---

## 3. Serverless API Entrypoint (`api/index.ts`)

To deploy the existing Express application seamlessly to Vercel without rewriting all routes, the Express application is exported as a Vercel Serverless Function handler:

```typescript
// api/index.ts (Vercel Serverless Handler)
import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server/src/app.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
```

### Database Connection Management in Serverless
- **Cold Start Connection Spikes**: Traditional PostgreSQL servers terminate connections when serverless containers freeze.
- **Solution (Supavisor Connection Pooler)**:
  - Use the Supabase pooled connection string (Port `6543`) with `pg.Pool({ max: 2, idleTimeoutMillis: 5000 })`.
  - Cache the database client pool across function invocations to prevent exhausting connection limits.

---

## 4. Required Environment Variables

Configure these variables in **Vercel Project Settings $\to$ Environment Variables**:

### Public Client-Side Variables (Injected at Build Time)
- `VITE_SUPABASE_URL`: Public Supabase Project URL (`https://<project-ref>.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: Public client-safe anonymous API key
- `VITE_DEMO_MODE`: Set to `false` in Production (hides evaluation banners and quick-login shortcuts)
- `VITE_PILOT_REGION`: Set to `mumbai`

### Private Serverless Variables (Never Exposed to Frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Secret administrative key for privileged verification actions
- `DATABASE_URL`: Transaction-mode pooled connection string (`postgresql://postgres:[password]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`)
- `JWT_SECRET`: Internal signing key (minimum 32 random characters)
- `NODE_ENV`: Set to `production`

---

## 5. GitHub Integration & Deployment Stages

### 5.1 Repository Setup
1. Initialize a clean git repository in the workspace:
   ```bash
   git init
   git add .
   git commit -m "feat: Blood_Link production-ready architecture"
   ```
2. Push to your GitHub account:
   ```bash
   git remote add origin https://github.com/<your-username>/blood-link.git
   git branch -M main
   git push -u origin main
   ```

### 5.2 Vercel Project Linking
1. Go to [vercel.com](https://vercel.com) and click **"Add New..." $\to$ "Project"**.
2. Select your `blood-link` GitHub repository.
3. In **Build and Output Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `client/dist`
4. Add all environment variables listed above.
5. Click **"Deploy"**.

### 5.3 Staging / Preview Workflow
- Every Pull Request in GitHub automatically generates an isolated **Vercel Preview Deployment**.
- Test new features on preview URLs before merging to the `main` branch.

### 5.4 Instant Rollback Procedure
If a production issue occurs:
1. Open the Vercel Dashboard $\to$ **Deployments**.
2. Locate the previous stable deployment.
3. Click the three dots $\dots$ $\to$ **"Instant Rollback"**.
4. Traffic is rerouted in under 5 seconds without a rebuild.
