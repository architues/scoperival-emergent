from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from starlette.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import requests
from bs4 import BeautifulSoup
import hashlib
import difflib
import openai
from jose import JWTError, jwt
from passlib.context import CryptContext
import asyncio
import re
from urllib.parse import urljoin, urlparse

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection - simplified approach
mongo_url = os.environ['MONGO_URL']

# Simple client configuration that should work with any pymongo version
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# OpenAI setup
openai.api_key = os.environ['OPENAI_API_KEY']

# Auth setup
SECRET_KEY = "scoperival_secret_key_12345"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app without a prefix
app = FastAPI(title="Scoperival API", description="Competitor Analysis Tool")

# Add CORS middleware FIRST - More permissive configuration
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Allow all origins temporarily
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Pydantic Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    hashed_password: str
    company_name: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    company_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TrackedPage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    page_type: str  # pricing, blog, features, changelog
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

class ChangeAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    competitor_id: str
    page_id: str
    change_summary: str
    strategic_implications: str
    significance_score: int  # 1-5
    suggested_actions: List[str]
    previous_content: str
    new_content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PageSuggestion(BaseModel):
    url: str
    page_type: str
    found_content: bool

# Auth utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return User(**user)

# Web scraping utilities
def clean_text(text):
    """Clean and normalize text content"""
    # Remove extra whitespace, normalize line breaks
    text = re.sub(r'\s+', ' ', text.strip())
    # Remove script and style content
    text = re.sub(r'<script[^>]*>.*?</script>', '', text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
    return text

def scrape_webpage(url):
    """Scrape a webpage and return cleaned text content"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        cleaned_text = clean_text(text)
        
        return cleaned_text[:10000]  # Limit to 10k chars
    except Exception as e:
        logging.error(f"Error scraping {url}: {str(e)}")
        return None

def discover_pages(domain):
    """Auto-discover common competitor pages"""
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
    """Generate hash for content comparison"""
    return hashlib.md5(content.encode()).hexdigest()

async def analyze_change_with_openai(previous_content, new_content, page_type, competitor_name):
    """Use OpenAI to analyze competitor changes"""
    try:
        client = openai.OpenAI(api_key=os.environ['OPENAI_API_KEY'])
        
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
        
        # Parse the JSON response
        import json
        analysis = json.loads(response.choices[0].message.content)
        return analysis
    except Exception as e:
        logging.error(f"OpenAI analysis error: {str(e)}")
        # Fallback analysis
        return {
            "change_summary": "Content change detected on competitor page",
            "strategic_implications": "Competitor has updated their content - monitor for strategic changes",
            "significance_score": 3,
            "suggested_actions": ["Review the changes manually", "Update competitive analysis", "Consider response strategy"]
        }

# API Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate, response: Response):
    # Add explicit CORS headers
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        company_name=user_data.company_name
    )
    
    await db.users.insert_one(user.dict())
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin, response: Response):
    # Add explicit CORS headers
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "*"
    
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.get("/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.post("/competitors/discover-pages")
async def discover_competitor_pages(data: dict, current_user: User = Depends(get_current_user)):
    domain = data.get("domain")
    if not domain:
        raise HTTPException(status_code=400, detail="Domain is required")
    
    suggestions = discover_pages(domain)
    return {"suggestions": suggestions}

@api_router.post("/competitors", response_model=Competitor)
async def create_competitor(competitor_data: CompetitorCreate, current_user: User = Depends(get_current_user)):
    competitor = Competitor(
        user_id=current_user.id,
        domain=competitor_data.domain,
        company_name=competitor_data.company_name
    )
    
    await db.competitors.insert_one(competitor.dict())
    return competitor

@api_router.post("/competitors/{competitor_id}/pages")
async def add_tracked_pages(competitor_id: str, pages_data: dict, current_user: User = Depends(get_current_user)):
    urls = pages_data.get("urls", [])
    
    competitor = await db.competitors.find_one({"id": competitor_id, "user_id": current_user.id})
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    tracked_pages = []
    for url_data in urls:
        # Initial scrape
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
    
    # Update competitor with tracked pages
    await db.competitors.update_one(
        {"id": competitor_id},
        {"$set": {"tracked_pages": [page.dict() for page in tracked_pages]}}
    )
    
    return {"message": f"Added {len(tracked_pages)} pages for tracking"}

@api_router.get("/competitors", response_model=List[Competitor])
async def get_competitors(current_user: User = Depends(get_current_user)):
    competitors = await db.competitors.find({"user_id": current_user.id}).to_list(100)
    return [Competitor(**comp) for comp in competitors]

@api_router.delete("/competitors/{competitor_id}")
async def delete_competitor(competitor_id: str, current_user: User = Depends(get_current_user)):
    result = await db.competitors.delete_one({"id": competitor_id, "user_id": current_user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    # Also delete related changes
    await db.changes.delete_many({"competitor_id": competitor_id})
    
    return {"message": "Competitor deleted successfully"}

@api_router.post("/competitors/{competitor_id}/scan")
async def manual_scan(competitor_id: str, current_user: User = Depends(get_current_user)):
    competitor = await db.competitors.find_one({"id": competitor_id, "user_id": current_user.id})
    if not competitor:
        raise HTTPException(status_code=404, detail="Competitor not found")
    
    changes_detected = []
    
    for page in competitor.get("tracked_pages", []):
        # Scrape current content
        current_content = scrape_webpage(page["url"])
        if not current_content:
            continue
            
        current_hash = generate_content_hash(current_content)
        
        # Check if content changed
        if page.get("last_content_hash") and current_hash != page["last_content_hash"]:
            # Content changed! Analyze with OpenAI
            analysis = await analyze_change_with_openai(
                page.get("content", ""),
                current_content,
                page["page_type"],
                competitor["company_name"]
            )
            
            # Save the change analysis
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
        
        # Update page with new content
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

@api_router.get("/changes", response_model=List[ChangeAnalysis])
async def get_changes(current_user: User = Depends(get_current_user)):
    # Get user's competitors
    competitors = await db.competitors.find({"user_id": current_user.id}).to_list(100)
    competitor_ids = [comp["id"] for comp in competitors]
    
    # Get changes for user's competitors
    changes = await db.changes.find({"competitor_id": {"$in": competitor_ids}}).sort("created_at", -1).to_list(100)
    return [ChangeAnalysis(**change) for change in changes]

@api_router.get("/dashboard/stats")
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

# Include the router in the main app
app.include_router(api_router)

@app.get("/")
async def root():
    return {"message": "Scoperival API is running", "status": "healthy"}

@app.get("/api/")
async def api_root():
    return {"message": "Scoperival API v1.0", "status": "healthy"}

@app.options("/{path:path}")
async def options_handler(path: str):
    return JSONResponse(
        content={"message": "OK"},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Max-Age": "86400",
        }
    )



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    global client, db
    try:
        # Test the connection
        await client.admin.command('ping')
        logger.info("Successfully connected to MongoDB!")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {str(e)}")
        logger.error("Attempting connection without SSL verification...")
        
        # Try alternative connection method
        try:
            mongo_url = os.environ['MONGO_URL']
            # Create new client with correct pymongo parameters
            client = AsyncIOMotorClient(
                mongo_url,
                tls=False,  # Disable TLS completely
                serverSelectionTimeoutMS=30000,
                connectTimeoutMS=20000,
                retryWrites=True
            )
            db = client[os.environ['DB_NAME']]
            await client.admin.command('ping')
            logger.info("Connected to MongoDB without SSL!")
        except Exception as e2:
            logger.error(f"Alternative connection also failed: {str(e2)}")
            # Try with basic connection
            try:
                basic_url = mongo_url.split('?')[0]  # Remove query parameters
                client = AsyncIOMotorClient(basic_url)
                db = client[os.environ['DB_NAME']]
                await client.admin.command('ping')
                logger.info("Connected with basic MongoDB connection!")
            except Exception as e3:
                logger.error(f"All connection attempts failed: {str(e3)}")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
