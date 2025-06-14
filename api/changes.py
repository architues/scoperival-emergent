from fastapi import FastAPI, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List
import uuid
import openai
import hashlib
import requests
from bs4 import BeautifulSoup
import re
from .auth import get_current_user, User

app = FastAPI()

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://ahaan:l7SZvjEovnByXkX9@scope-rival.1eakanl.mongodb.net/?retryWrites=true&w=majority&appName=Scope-rival')
DB_NAME = os.environ.get('DB_NAME', 'scoperival_db')
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# OpenAI setup
openai.api_key = OPENAI_API_KEY

# Pydantic Models
class ChangeAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    competitor_id: str
    page_id: str
    change_summary: str
    strategic_implications: str
    significance_score: int
    suggested_actions: List[str]
    previous_content: str
    new_content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

def clean_text(text):
    text = re.sub(r'\s+', ' ', text.strip())
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    return text

def scrape_webpage(url):
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        text = soup.get_text()
        cleaned_text = clean_text(text)
        
        return cleaned_text[:10000]
    except Exception as e:
        return None

def generate_content_hash(content):
    return hashlib.md5(content.encode()).hexdigest()

async def analyze_change_with_openai(previous_content, new_content, page_type, competitor_name):
    try:
        client = openai.OpenAI(api_key=OPENAI_API_KEY)
        
        prompt = f"""
        Analyze this change from {competitor_name}'s {page_type} page:

        PREVIOUS CONTENT:
        {previous_content[:2000]}

        NEW CONTENT:
        {new_content[:2000]}

        Provide analysis in JSON format:
        {{
            "change_summary": "Brief 1-2 sentence summary of what changed",
            "strategic_implications": "What this means for competitors in the market",
            "significance_score": 1-5 (5 being most significant),
            "suggested_actions": ["action1", "action2", "action3"]
        }}

        Focus on business strategy, competitive positioning, pricing changes, new features, and market implications.
        """
        
        response = client.chat.completions.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a competitive intelligence analyst specializing in business strategy and market analysis."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=500,
            temperature=0.3
        )
        
        import json
        analysis = json.loads(response.choices[0].message.content)
        return analysis
    except Exception as e:
        return {
            "change_summary": "Content change detected on competitor page",
            "strategic_implications": "Competitor has updated their content - monitor for strategic changes",
            "significance_score": 3,
            "suggested_actions": ["Review the changes manually", "Update competitive analysis", "Consider response strategy"]
        }

@app.post("/scan/{competitor_id}")
async def manual_scan(competitor_id: str, current_user: User = Depends(get_current_user)):
    competitor = await db.competitors.find_one({"id": competitor_id, "user_id": current_user.id})
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    changes_detected = []
    
    for page in competitor.get("tracked_pages", []):
        current_content = scrape_webpage(page["url"])
        if not current_content:
            continue
            
        current_hash = generate_content_hash(current_content)
        
        if page.get("last_content_hash") and current_hash != page["last_content_hash"]:
            analysis = await analyze_change_with_openai(
                page.get("content", ""),
                current_content,
                page["page_type"],
                competitor["company_name"]
            )
            
            change = ChangeAnalysis(
                competitor_id=competitor_id,
                page_id=page["id"],
                change_summary=analysis["change_summary"],
                strategic_implications=analysis["strategic_implications"],
                significance_score=analysis["significance_score"],
                suggested_actions=analysis["suggested_actions"],
                previous_content=page.get("content", "")[:2000],
                new_content=current_content[:2000]
            )
            
            await db.changes.insert_one(change.dict())
            changes_detected.append(change)
        
        await db.competitors.update_one(
            {"id": competitor_id, "tracked_pages.id": page["id"]},
            {
                "$set": {
                    "tracked_pages.$.last_content_hash": current_hash,
                    "tracked_pages.$.last_scraped": datetime.utcnow(),
                    "tracked_pages.$.content": current_content
                }
            }
        )
    
    return {
        "message": f"Scan completed. {len(changes_detected)} changes detected.",
        "changes": changes_detected
    }

@app.get("/list", response_model=List[ChangeAnalysis])
async def get_changes(current_user: User = Depends(get_current_user)):
    competitors = await db.competitors.find({"user_id": current_user.id}).to_list(100)
    competitor_ids = [comp["id"] for comp in competitors]
    
    changes = await db.changes.find({"competitor_id": {"$in": competitor_ids}}).sort("created_at", -1).to_list(100)
    return [ChangeAnalysis(**change) for change in changes]

# Export the app for Vercel
handler = app