# Checkhooks

A polished Next.js checkhook builder for sending HTTP requests with custom headers and body payloads.

## Features

- Fast checkhook request builder
- Custom HTTP method selection
- Editable JSON body and headers
- Responsive dark UI with modern design
- Local API proxy for safer dispatch

## Run locally

1. Install dependencies

```bash
npm install
```

2. Start development server

```bash
npm run dev
```

3. Open `http://localhost:3000`

4. To change the port, set `PORT` in a `.env` file, `.env.local`, or as an environment variable.

Example `.env.local`:

```env
PORT=4000
```

## Notes

- This project uses Next.js 14, Tailwind CSS, and TypeScript.
- The `/api/send-checkhook` route forwards checkhook payloads to the target URL.
