# LendFlow

**Verify smarter. Decide with confidence.**

LendFlow is a loan application verification workspace for loan officers, reviewers, and admins. It centralizes applicant details, documents, rules-based checks, issues, and a transparent verification decision trail.

This is a software prototype. It does **not** perform credit-bureau, legal identity, or government verification, and a verification decision is **not** a loan approval.

## Local setup

```bash
cp .env.example .env.local
# set MONGODB_URI and JWT_SECRET
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

MongoDB must be running locally or via Atlas. On first sign-in, demo users and sample applications are created automatically.

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Loan Officer | officer@lendflow.demo | `LendFlow!demo` |
| Reviewer | reviewer@lendflow.demo | `LendFlow!demo` |
| Admin | admin@lendflow.demo | `LendFlow!demo` |

## Production build

```bash
npm run build
npm start
```

## Netlify

The existing site is [https://loanappverf.netlify.app/](https://loanappverf.netlify.app/).

1. Keep the site connected to this GitHub repository.
2. In Netlify → Site configuration → Environment variables, set:
   - `MONGODB_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — long random secret
   - `ML_SERVICE_URL` — only if you deploy the optional Python service
3. Build command: `npm run build`
4. Publish directory: `.next`
5. Push to the production branch. Netlify’s Next.js runtime handles routing, including nested application URLs.

## Optional ML service

`ml-service/` is an optional FastAPI scoring service. If it is not running, applications still save and use the rules-based verification engine instead.
