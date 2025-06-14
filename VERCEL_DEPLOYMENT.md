# Frontend - Vercel Deployment

This is the React frontend application for Scoperival, designed to be deployed on Vercel.

## Deployment Instructions

### 1. Vercel Frontend Deployment

1. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Import your repository
   - Vercel will automatically detect the configuration from `vercel.json`

2. **Set Environment Variables in Vercel:**
   ```
   REACT_APP_BACKEND_URL=https://your-render-backend-url.onrender.com
   ```

3. **Build Settings:**
   - Framework: Create React App
   - Build Command: `cd frontend && yarn build`
   - Install Command: `cd frontend && yarn install`
   - Output Directory: `frontend/build`

### 2. Backend - Render Deployment

Your FastAPI backend should be deployed separately on Render.

1. **Create a new Web Service on Render**
2. **Settings:**
   - Build Command: `pip install -r backend/requirements.txt`
   - Start Command: `uvicorn backend.server:app --host 0.0.0.0 --port $PORT`
   - Environment Variables:
     ```
     MONGO_URL=your_mongodb_connection_string
     DB_NAME=scoperival
     OPENAI_API_KEY=your_openai_api_key
     ```

3. **Update Frontend Environment:**
   - Once your backend is deployed on Render, update the `REACT_APP_BACKEND_URL` environment variable in Vercel with your Render backend URL.

### 3. Architecture

```
Frontend (Vercel)  →  Backend (Render)  →  MongoDB Atlas
   React App      →   FastAPI Server   →    Database
```

### 4. Local Development

1. **Backend (Port 8001):**
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn server:app --reload --port 8001
   ```

2. **Frontend (Port 3000):**
   ```bash
   cd frontend
   yarn install
   yarn start
   ```

   Update `frontend/.env` for local development:
   ```
   REACT_APP_BACKEND_URL=http://localhost:8001
   ```

### 5. Important Notes

- The `vercel.json` configuration ensures only the frontend is deployed to Vercel
- All Python dependencies and backend code are excluded from the Vercel build
- The frontend will connect to your Render backend via the `REACT_APP_BACKEND_URL` environment variable
- Make sure your Render backend allows CORS from your Vercel domain

### 6. Project Structure

```
/app/
├── frontend/          # React app (deploys to Vercel)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
├── backend/           # FastAPI app (deploys to Render)
│   ├── server.py
│   ├── requirements.txt
│   └── .env
└── vercel.json        # Vercel configuration
```