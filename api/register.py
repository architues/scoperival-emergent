from http.server import BaseHTTPRequestHandler
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
import asyncio
from datetime import datetime, timedelta
import uuid
from jose import jwt
from passlib.context import CryptContext

# Environment variables
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb+srv://ahaan:l7SZvjEovnByXkX9@scope-rival.1eakanl.mongodb.net/?retryWrites=true&w=majority&appName=Scope-rival')
DB_NAME = os.environ.get('DB_NAME', 'scoperival_db')

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Auth setup
SECRET_KEY = "scoperival_secret_key_12345"
ALGORITHM = "HS256"
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode = data.copy()
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # Run async function
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self.register_user(data))
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            error_response = {"detail": str(e)}
            self.wfile.write(json.dumps(error_response).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    async def register_user(self, data):
        email = data.get('email')
        password = data.get('password')
        company_name = data.get('company_name')
        
        # Check if user exists
        existing_user = await db.users.find_one({"email": email})
        if existing_user:
            raise Exception("Email already registered")
        
        # Create user
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "hashed_password": get_password_hash(password),
            "company_name": company_name,
            "created_at": datetime.utcnow()
        }
        
        await db.users.insert_one(user)
        
        # Create token
        access_token = create_access_token(data={"sub": email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }