from http.server import BaseHTTPRequestHandler
import json
import os
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime, timedelta
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

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

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
            result = loop.run_until_complete(self.login_user(data))
            loop.close()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(result).encode())
            
        except Exception as e:
            self.send_response(401)
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
    
    async def login_user(self, data):
        email = data.get('email')
        password = data.get('password')
        
        # Find user
        user = await db.users.find_one({"email": email})
        if not user or not verify_password(password, user["hashed_password"]):
            raise Exception("Incorrect email or password")
        
        # Create token
        access_token = create_access_token(data={"sub": email})
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }