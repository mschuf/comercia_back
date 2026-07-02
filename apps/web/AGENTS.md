<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes. APIs, conventions, and file structure may differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any Next.js code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Comercia frontend rules

- Use `.agents/skills/vercel-react-best-practices` when writing or reviewing React/Next.js code.
- Prefer Server Components and direct imports.
- Keep client components small and avoid passing private server data into them.
- Put environment variables exposed to the browser behind `NEXT_PUBLIC_` only when they are truly public.
