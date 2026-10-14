# Upbuff Project Management - Frontend (React)

React 18 + Vite web client for Upbuff Project Management, converted from the Meteor app.
The API lives in the separate `upbuff_pm_backend` repository.

## Requirements

- Node.js 20 or newer (Node 22 recommended)
- A running `upbuff_pm_backend` (default http://localhost:8080)

## Run the frontend

```bash
cd upbuff_pm_frontend
npm install
npm run dev
```

Open http://localhost:5173. Requests to `/rpc`, `/pub`, `/auth`, `/pagination` and `/api` are
forwarded to the backend (see `vite.config.js`; set `BACKEND_URL` if it is not on localhost:8080).

Existing users log in with their existing username and password.

## Build for production

```bash
npm run build        # creates dist/ (static files)
```

Serve `dist/` with any web server (nginx...) and forward `/rpc`, `/pub`, `/auth`,
`/pagination` and `/api` to the backend. Unknown paths must return `index.html` (single page app).

See `CONVERSION_GUIDE.md` for how each Meteor concept was converted.
