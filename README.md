# E-Com — Next.js Ecommerce Backend

Production-ready ecommerce backend foundation built with **Next.js 16 (App Router)**, **MongoDB/Mongoose**, and **JWT authentication**.

## Tech Stack

| Layer          | Technology                     |
| -------------- | ------------------------------ |
| Framework      | Next.js 16 (App Router)       |
| Language       | TypeScript                     |
| Database       | MongoDB via Mongoose           |
| Auth           | JWT (httpOnly cookies) + bcrypt|
| Runtime        | Node.js ≥ 20                   |

## Folder Structure

```
src/
├── app/
│   └── api/
│       └── auth/
│           ├── register/route.ts   # POST — create customer account
│           ├── login/route.ts      # POST — authenticate & issue JWT
│           ├── logout/route.ts     # POST — clear auth cookie
│           └── me/route.ts         # GET  — current user profile
├── lib/
│   ├── auth/
│   │   ├── cookies.ts             # httpOnly cookie helpers
│   │   ├── jwt.ts                 # sign & verify (jose, Edge-safe)
│   │   ├── require-auth.ts        # in-handler auth guard
│   │   ├── session.ts             # getCurrentUser() helper
│   │   └── index.ts               # barrel export
│   ├── db/
│   │   └── mongoose.ts            # singleton connection
│   ├── api-response.ts            # standardised JSON envelope
│   ├── env.ts                     # env variable accessor
│   └── validators.ts              # input validation helpers
├── models/
│   └── user.model.ts              # User schema + password hashing
├── types/
│   └── index.ts                   # shared TS interfaces & types
├── middleware.ts                   # Edge middleware — route protection + RBAC
scripts/
└── seed-admin.ts                  # create initial super admin
```

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

| Variable        | Description                          |
| --------------- | ------------------------------------ |
| `MONGODB_URI`   | MongoDB connection string            |
| `JWT_SECRET`    | Random string ≥ 32 chars             |
| `JWT_EXPIRES_IN`| Token lifetime (e.g. `7d`, `24h`)    |
| `NODE_ENV`      | `development` / `production`         |

### 3. Seed the super admin

```bash
npm install -D tsx dotenv
npx tsx scripts/seed-admin.ts
```

Default credentials: `admin@ecom.local` / `Admin@1234` — **change immediately**.

### 4. Run the dev server

```bash
npm run dev
```

## API Endpoints

### Auth

| Method | Path                  | Auth     | Description            |
| ------ | --------------------- | -------- | ---------------------- |
| POST   | `/api/auth/register`  | Public   | Register new customer  |
| POST   | `/api/auth/login`     | Public   | Login & get JWT cookie |
| POST   | `/api/auth/logout`    | Public   | Clear auth cookie      |
| GET    | `/api/auth/me`        | Token    | Current user profile   |

### Protected Route Prefixes

| Prefix             | Allowed Roles             |
| ------------------ | ------------------------- |
| `/api/admin/super` | `super_admin`             |
| `/api/admin`       | `super_admin`, `staff`    |
| `/api/user`        | All authenticated users   |

## Roles

| Role          | Description                                      |
| ------------- | ------------------------------------------------ |
| `super_admin` | Full access — manage staff, products, settings   |
| `staff`       | Admin panel access — manage products, orders     |
| `customer`    | Frontend access — browse, order, manage profile  |

## Security

- Passwords hashed with **bcrypt** (cost factor 12)
- JWTs stored in **httpOnly, secure, SameSite=lax** cookies
- Edge middleware validates tokens before they reach route handlers
- `x-user-*` headers injected for downstream handlers (never trust client-sent headers — middleware overwrites them)
- `requireAuth()` provides in-handler defence-in-depth

## License

Private — All rights reserved.

//Database user
sahilpolityprep_db_user
20KB3h4ieZQwXFIO


