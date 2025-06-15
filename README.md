# Scoperival - AI-Powered Competitor Intelligence

A comprehensive competitive intelligence platform that monitors competitor websites and provides AI-powered insights.

## 🚀 Quick Deploy

### Frontend (Vercel)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/scoperival)

### Backend (Render)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-username/scoperival)

## 📋 Deployment Guide

### 1. Frontend Deployment (Vercel)

1. **Fork/Clone Repository**
2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your repository
   - Vercel will automatically detect the configuration

3. **Environment Variables:**
   Set this in Vercel dashboard:
   ```
   REACT_APP_BACKEND_URL=https://scoperival-emergent.onrender.com
   ```

4. **Deploy:**
   - Vercel will automatically build and deploy
   - The `vercel.json` configuration ensures only the frontend is deployed

### 2. Backend Deployment (Render)

1. **Create Web Service on Render:**
   - Go to [render.com](https://render.com)
   - Create new "Web Service"
   - Connect your repository

2. **Build Settings:**
   ```
   Build Command: pip install -r requirements.txt
   Start Command: uvicorn backend.server:app --host 0.0.0.0 --port $PORT
   ```

3. **Environment Variables:**
   ```
   MONGO_URL=your_mongodb_connection_string
   DB_NAME=scoperival_db
   OPENAI_API_KEY=your_openai_api_key
   ```

4. **Deploy:**
   - Render will build and deploy your backend
   - Copy the backend URL for frontend configuration

### 3. Update Frontend

Once backend is deployed:
1. Go to your Vercel dashboard
2. Update `REACT_APP_BACKEND_URL` with your Render backend URL
3. Redeploy frontend

## 🏗️ Architecture

```
┌─────────────────┐    HTTPS    ┌─────────────────┐    MongoDB    ┌─────────────────┐
│                 │   Request   │                 │   Queries     │                 │
│  Frontend       │────────────►│  Backend        │──────────────►│  MongoDB Atlas  │
│  (Vercel)       │             │  (Render)       │               │  (Database)     │
│  React App      │◄────────────│  FastAPI        │◄──────────────│                 │
│                 │   Response  │                 │   Results     │                 │
└─────────────────┘             └─────────────────┘               └─────────────────┘
```

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- Python 3.9+
- MongoDB Atlas account
- OpenAI API key

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run backend
uvicorn server:app --reload --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install

# Create .env file for local development
echo "REACT_APP_BACKEND_URL=http://localhost:8001" > .env

# Run frontend
yarn start
```

## 📁 Project Structure

```
scoperival/
├── frontend/              # React application (Vercel)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── .env
├── backend/               # FastAPI application (Render)
│   ├── server.py
│   ├── requirements.txt
│   └── .env
├── vercel.json           # Vercel configuration
├── render.yaml           # Render configuration
├── Procfile              # Process configuration
└── README.md
```

## 🔧 Environment Variables

### Frontend (.env)
```bash
REACT_APP_BACKEND_URL=https://your-backend-url.onrender.com
```

### Backend (.env)
```bash
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/
DB_NAME=scoperival_db
OPENAI_API_KEY=sk-your-openai-key
```

## 🚀 Features

- **Competitor Monitoring**: Track competitor website changes
- **AI Analysis**: OpenAI-powered change analysis and strategic insights
- **Real-time Alerts**: Get notified of important competitor updates
- **Dashboard**: Beautiful, responsive interface for managing intelligence
- **Multi-page Tracking**: Monitor pricing, features, blogs, and changelog pages

## 🔐 Security

- JWT-based authentication
- Password hashing with bcrypt
- CORS protection
- Environment variable configuration

## 📝 API Documentation

Once deployed, visit:
- Frontend: `https://your-app.vercel.app`
- Backend API Docs: `https://your-backend.onrender.com/docs`

## 🆘 Support

If you encounter issues:
1. Check the deployment logs in Vercel/Render dashboards
2. Verify environment variables are set correctly
3. Ensure MongoDB Atlas allows connections from your deployment IPs
4. Check OpenAI API key permissions and credits

## 🎯 Next Steps

1. Deploy backend to Render
2. Deploy frontend to Vercel
3. Configure environment variables
4. Set up MongoDB Atlas
5. Test the complete application flow
