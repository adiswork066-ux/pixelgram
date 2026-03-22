# Deploy Pixelgram

This repo is prepared to deploy as a single Render web service backed by MongoDB Atlas.

## What gets deployed

- FastAPI backend from `backend/server.py`
- React frontend from `frontend/`
- Single public app URL served by the backend

## Before you start

1. Create a MongoDB Atlas cluster.
2. Create a database user and copy the connection string.
3. Optionally prepare Cloudinary credentials for image uploads.

Official docs:

- Render Blueprints: https://render.com/docs/blueprint-spec
- Render Web Services: https://render.com/docs/web-services
- MongoDB Atlas free cluster: https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/

## Render steps

1. Push this repo to a GitHub repo you can access from Render.
2. In Render, create a new Blueprint and point it at this repo.
3. Render will read `render.yaml`.
4. When prompted, provide:
   - `MONGO_URL`
   - `CLOUDINARY_CLOUD_NAME` (optional)
   - `CLOUDINARY_API_KEY` (optional)
   - `CLOUDINARY_API_SECRET` (optional)
5. Deploy.

## Notes

- If Cloudinary credentials are omitted, post creation still works with inline image data for small demos.
- If `MONGO_URL` is omitted, the app falls back to in-memory storage, which is not suitable for a real deployment.
- The health check endpoint is `/api/health`.
