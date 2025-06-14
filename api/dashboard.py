from fastapi import FastAPI, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import os
from datetime import datetime, timedelta
from .auth import get_current_user, User

app = FastAPI()

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://ahaan:l7SZvjEovnByXkX9@scope-rival.1eakanl.mongodb.net/?retryWrites=true&w=majority&appName=Scope-rival')
DB_NAME = os.environ.get('DB_NAME', 'scoperival_db')

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

@app.get("/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get user's competitors
    competitors = await db.competitors.find({"user_id": current_user.id}).to_list(100)
    competitor_ids = [comp["id"] for comp in competitors]
    
    # Count total tracked pages
    total_pages = sum(len(comp.get("tracked_pages", [])) for comp in competitors)
    
    # Count changes in last 7 days
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_changes = await db.changes.count_documents({
        "competitor_id": {"$in": competitor_ids},
        "created_at": {"$gte": seven_days_ago}
    })
    
    # Get high significance changes
    high_sig_changes = await db.changes.count_documents({
        "competitor_id": {"$in": competitor_ids},
        "significance_score": {"$gte": 4}
    })
    
    return {
        "total_competitors": len(competitors),
        "total_tracked_pages": total_pages,
        "recent_changes": recent_changes,
        "high_significance_changes": high_sig_changes
    }

# Export the app for Vercel
handler = app