# RealtyFlow CMS publishing

Doña Anna can receive approved content from RealtyFlow at:

```txt
POST /api/realtyflow/publish
```

Set these Vercel environment variables:

```txt
REALTYFLOW_CMS_SECRET=choose-a-long-shared-secret
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Run this SQL migration in Supabase:

```txt
supabase_migrations/005_website_cms_posts.sql
```

RealtyFlow should configure Doña Anna with:

```txt
Webhook URL: https://donaanna.com/api/realtyflow/publish
Secret: same value as REALTYFLOW_CMS_SECRET
```

Supported destinations:

- `magasin` -> `/magasin`
- `artikler` -> `/artikler`
- `blogg` -> `/blogg`
- `oppskrifter` -> `/oppskrifter`

The endpoint stores posts in `website_posts`. Public visitors can read only rows with `status = 'published'`; RealtyFlow writes through the server-side service role key.
