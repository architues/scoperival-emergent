from fastapi import FastAPI, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
import os
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
import uuid
import requests
from bs4 import BeautifulSoup
import hashlib
from urllib.parse import urljoin, urlparse
import re
from .auth import get_current_user, User

app = FastAPI()

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://ahaan:l7SZvjEovnByXkX9@scope-rival.1eakanl.mongodb.net/?retryWrites=true&w=majority&appName=Scope-rival')
DB_NAME = os.environ.get('DB_NAME', 'scoperival_db')

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic Models
class TrackedPage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    page_type: str
    last_content_hash: Optional[str] = None
    last_scraped: Optional[datetime] = None
    content: Optional[str] = None

class Competitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    domain: str
    company_name: str
    tracked_pages: List[TrackedPage] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CompetitorCreate(BaseModel):
    domain: str
    company_name: str

class PageSuggestion(BaseModel):
    url: str
    page_type: str
    found_content: bool

# Utility functions
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

def discover_pages(domain):
    base_url = f"https://{domain}" if not domain.startswith('http') else domain
    
    common_paths = [
        ('/pricing', 'pricing'),
        ('/plans', 'pricing'),
        ('/features', 'features'),
        ('/product', 'features'),
        ('/blog', 'blog'),
        ('/changelog', 'changelog'),
        ('/updates', 'changelog'),
        ('/news', 'blog')
    ]
    
    suggestions = []
    
    for path, page_type in common_paths:
        url = urljoin(base_url, path)
        try:
            response = requests.head(url, timeout=10)
            if response.status_code == 200:
                suggestions.append(PageSuggestion(
                    url=url, 
                    page_type=page_type, 
                    found_content=True
                ))
        except:
            pass
    
    return suggestions

def generate_content_hash(content):
    return hashlib.md5(content.encode()).hexdigest()

@app.post("/create", response_model=Competitor)
async def create_competitor(competitor_data: CompetitorCreate, current_user: User = Depends(get_current_user)):
    competitor = Competitor(
        user_id=current_user.id,
        domain=competitor_data.domain,
        company_name=competitor_data.company_name
    )
    
    await db.competitors.insert_one(competitor.dict())
    return competitor

@app.post("/discover-pages")
async def discover_competitor_pages(data: dict, current_user: User = Depends(get_current_user)):
    domain = data.get("domain")
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")
    
    suggestions = discover_pages(domain)
    return {"suggestions": suggestions}

@app.post("/{competitor_id}/pages")
async def add_tracked_pages(competitor_id: str, pages_data: dict, current_user: User = Depends(get_current_user)):
    urls = pages_data.get("urls", [])
    
    competitor = await db.competitors.find_one({"id": competitor_id, "user_id": current_user.id})
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    tracked_pages = []
    for url_data in urls:
        content = scrape_webpage(url_data["url"])
        content_hash = generate_content_hash(content) if content else None
        
        page = TrackedPage(
            url=url_data["url"],
            page_type=url_data["page_type"],
            last_content_hash=content_hash,
            last_scraped=datetime.utcnow(),
            content=content
        )
        tracked_pages.append(page)
    
    await db.competitors.update_one(
        {"id": competitor_id},
        {"$set": {"tracked_pages": [page.dict() for page in tracked_pages]}}
    )
    
    return {"message": f"Added {len(tracked_pages)} pages for tracking"}

@app.get("/list", response_model=List[Competitor])
async def get_competitors(current_user: User = Depends(get_current_user)):
    competitors = await db.competitors.find({"user_id": current_user.id}).to_list(100)
    return [Competitor(**comp) for comp in competitors]

@app.delete("/{competitor_id}")
async def delete_competitor(competitor_id: str, current_user: User = Depends(get_current_user)):
    result = await db.competitors.delete_one({"id": competitor_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    await db.changes.delete_many({"competitor_id": competitor_id})
    
    return {"message": "Competitor deleted successfully"}

# Export the app for Vercel
handler = app