from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import cloudinary
import cloudinary.utils
import time
import re
from urllib.parse import quote_plus

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')
FRONTEND_BUILD_DIR = ROOT_DIR.parent / "frontend" / "build"


def _apply_projection(document: dict, projection: Optional[dict] = None) -> dict:
    projected = document.copy()
    if not projection:
        projected.pop("_id", None)
        return projected

    include_fields = {key for key, value in projection.items() if value}
    exclude_fields = {key for key, value in projection.items() if not value}

    if include_fields:
        return {key: projected[key] for key in include_fields if key in projected}

    for field in exclude_fields:
        projected.pop(field, None)

    return projected


def _matches_query(document: dict, query: Optional[dict] = None) -> bool:
    if not query:
        return True

    for key, expected in query.items():
        if key == "$or":
            if not any(_matches_query(document, item) for item in expected):
                return False
            continue

        value = document.get(key)
        if isinstance(expected, dict):
            if "$in" in expected and value not in expected["$in"]:
                return False
            if "$regex" in expected:
                flags = re.IGNORECASE if "i" in expected.get("$options", "") else 0
                pattern = expected["$regex"]
                if value is None or re.search(pattern, str(value), flags) is None:
                    return False
            unsupported_ops = set(expected) - {"$in", "$regex", "$options"}
            if unsupported_ops:
                return False
        elif value != expected:
            return False

    return True


def _sort_documents(documents: list[dict], sort_spec: dict) -> list[dict]:
    for field, direction in reversed(list(sort_spec.items())):
        documents.sort(key=lambda item: item.get(field) or "", reverse=direction == -1)
    return documents


def _sanitize_mongo_url(url: str) -> str:
    if "://" not in url:
        return url

    scheme, remainder = url.split("://", 1)
    if not scheme.startswith("mongodb") or "@" not in remainder:
        return url

    userinfo, hostinfo = remainder.rsplit("@", 1)
    if ":" in userinfo:
        username, password = userinfo.split(":", 1)
        return (
            f"{scheme}://{quote_plus(username)}:{quote_plus(password)}@{hostinfo}"
        )

    return f"{scheme}://{quote_plus(userinfo)}@{hostinfo}"


def _is_real_config_value(value: Optional[str]) -> bool:
    if value is None:
        return False

    normalized = value.strip()
    if not normalized:
        return False

    return normalized.lower() not in {
        "optional",
        "changeme",
        "your-cloud-name",
        "your-api-key",
        "your-api-secret",
    }


class MemoryCursor:
    def __init__(self, documents: list[dict]):
        self._documents = [document.copy() for document in documents]

    def sort(self, field: str, direction: int):
        _sort_documents(self._documents, {field: direction})
        return self

    def skip(self, amount: int):
        self._documents = self._documents[amount:]
        return self

    def limit(self, amount: int):
        self._documents = self._documents[:amount]
        return self

    async def to_list(self, length: Optional[int] = None):
        if length is None:
            return [document.copy() for document in self._documents]
        return [document.copy() for document in self._documents[:length]]


class MemoryCollection:
    def __init__(self, name: str, database: "MemoryDatabase"):
        self.name = name
        self.database = database
        self.documents: list[dict] = []

    async def find_one(self, query: dict, projection: Optional[dict] = None):
        for document in self.documents:
            if _matches_query(document, query):
                return _apply_projection(document, projection)
        return None

    def find(self, query: Optional[dict] = None, projection: Optional[dict] = None):
        matches = [
            _apply_projection(document, projection)
            for document in self.documents
            if _matches_query(document, query)
        ]
        return MemoryCursor(matches)

    async def insert_one(self, document: dict):
        self.documents.append(document.copy())

    async def update_one(self, query: dict, update: dict):
        for document in self.documents:
            if _matches_query(document, query):
                if "$set" in update:
                    document.update(update["$set"])
                return

    async def update_many(self, query: dict, update: dict):
        for document in self.documents:
            if _matches_query(document, query):
                if "$set" in update:
                    document.update(update["$set"])

    async def delete_one(self, query: dict):
        for index, document in enumerate(self.documents):
            if _matches_query(document, query):
                self.documents.pop(index)
                return

    async def delete_many(self, query: dict):
        self.documents = [
            document for document in self.documents if not _matches_query(document, query)
        ]

    async def count_documents(self, query: dict):
        return sum(1 for document in self.documents if _matches_query(document, query))

    def aggregate(self, pipeline: list[dict]):
        documents = [document.copy() for document in self.documents]

        for stage in pipeline:
            if "$match" in stage:
                documents = [
                    document for document in documents if _matches_query(document, stage["$match"])
                ]
            elif "$group" in stage:
                group_spec = stage["$group"]
                group_field = group_spec["_id"].lstrip("$")
                counter_field = next(
                    key
                    for key, value in group_spec.items()
                    if isinstance(value, dict) and value.get("$sum") == 1
                )
                grouped = {}
                for document in documents:
                    group_key = document.get(group_field)
                    grouped[group_key] = grouped.get(group_key, 0) + 1
                documents = [
                    {"_id": group_key, counter_field: count}
                    for group_key, count in grouped.items()
                ]
            elif "$lookup" in stage:
                lookup = stage["$lookup"]
                foreign_collection = getattr(self.database, lookup["from"])
                local_field = lookup["localField"]
                foreign_field = lookup["foreignField"]
                as_field = lookup["as"]
                for document in documents:
                    local_value = document.get(local_field)
                    document[as_field] = [
                        related.copy()
                        for related in foreign_collection.documents
                        if related.get(foreign_field) == local_value
                    ]
            elif "$addFields" in stage:
                for document in documents:
                    for field, expression in stage["$addFields"].items():
                        if isinstance(expression, dict) and "$size" in expression:
                            source_field = expression["$size"].lstrip("$")
                            document[field] = len(document.get(source_field, []))
            elif "$sort" in stage:
                _sort_documents(documents, stage["$sort"])
            elif "$skip" in stage:
                documents = documents[stage["$skip"]:]
            elif "$limit" in stage:
                documents = documents[:stage["$limit"]]
            elif "$project" in stage:
                documents = [
                    _apply_projection(document, stage["$project"]) for document in documents
                ]

        return MemoryCursor(documents)


class MemoryDatabase:
    def __init__(self):
        for collection_name in (
            "users",
            "posts",
            "follows",
            "likes",
            "comments",
            "echoes",
            "notifications",
            "messages",
        ):
            setattr(self, collection_name, MemoryCollection(collection_name, self))

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
mongo_url = _sanitize_mongo_url(mongo_url)
db_name = os.environ.get('DB_NAME', 'pixelgram')
mongo_timeout_ms = int(os.environ.get("MONGO_TIMEOUT_MS", "5000"))
client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=mongo_timeout_ms)
mongo_db = client[db_name]
memory_db = MemoryDatabase()
db = memory_db

# fallback in-memory data (for when MongoDB is unavailable)
db_available = False
in_memory_users = memory_db.users.documents

# Create the main app
app = FastAPI()

logger = logging.getLogger(__name__)

@app.on_event('startup')
async def validate_db_connection():
    global db_available, db
    try:
        await client.admin.command('ping')
        db_available = True
        db = mongo_db
    except Exception as exc:
        db_available = False
        db = memory_db
        logger.warning("MongoDB unavailable, using in-memory store: %s", exc)

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-super-secret-key-change-in-production')
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Cloudinary Configuration
cloudinary.config(
    cloud_name=os.environ.get("CLOUDINARY_CLOUD_NAME"),
    api_key=os.environ.get("CLOUDINARY_API_KEY"),
    api_secret=os.environ.get("CLOUDINARY_API_SECRET"),
    secure=True
)

@app.get("/")
async def root():
    index_file = FRONTEND_BUILD_DIR / "index.html"
    if index_file.exists():
        return FileResponse(index_file)
    return {"status": "Pixelgrams backend running"}

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# ==================== MODELS ====================

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    bio: Optional[str] = ""
    created_at: str

class ProfileUpdate(BaseModel):
    bio: Optional[str] = None
    avatar: Optional[str] = None

class ProfileResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    email: str
    avatar: Optional[str] = None
    bio: Optional[str] = ""
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_following: bool = False
    created_at: str

class PostCreate(BaseModel):
    image: str
    caption: Optional[str] = ""
    mood: Optional[str] = "unfiltered"
    backstory: Optional[str] = ""

class PostResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    image: str
    caption: Optional[str] = ""
    mood: Optional[str] = "unfiltered"
    backstory: Optional[str] = ""
    likes_count: int = 0
    comments_count: int = 0
    echo_count: int = 0
    top_echoes: List[str] = Field(default_factory=list)
    user_echo: Optional[str] = None
    is_liked: bool = False
    created_at: str

class CommentCreate(BaseModel):
    text: str


class EchoCreate(BaseModel):
    text: str


class EchoResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    text: str
    created_at: str

class CommentResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    post_id: str
    user_id: str
    username: str
    user_avatar: Optional[str] = None
    text: str
    created_at: str

class NotificationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    sender_id: str
    sender_username: str
    sender_avatar: Optional[str] = None
    notification_type: str
    post_id: Optional[str] = None
    post_image: Optional[str] = None
    is_read: bool = False
    created_at: str

class MessageCreate(BaseModel):
    text: str

class MessageResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    conversation_id: str
    sender_id: str
    sender_username: str
    sender_avatar: Optional[str] = None
    text: str
    is_read: bool = False
    created_at: str

class ConversationResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    participant_id: str
    participant_username: str
    participant_avatar: Optional[str] = None
    last_message: Optional[str] = None
    last_message_time: Optional[str] = None
    unread_count: int = 0

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": user_id, "exp": expire, "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {"sub": user_id, "exp": expire, "type": "refresh"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))) -> Optional[dict]:
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        return user
    except:
        return None

async def create_notification(sender_id: str, receiver_id: str, notification_type: str, post_id: Optional[str] = None):
    if sender_id == receiver_id:
        return
    
    notification = {
        "id": str(uuid.uuid4()),
        "sender_id": sender_id,
        "receiver_id": receiver_id,
        "notification_type": notification_type,
        "post_id": post_id,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)


def build_echo_summary(echoes: list, current_user_id: Optional[str] = None):
    echo_count = len(echoes)
    user_echo = None
    echo_frequency = {}

    for echo in echoes:
        text = (echo.get("text") or "").strip()
        if not text:
            continue

        normalized = text.lower()
        echo_frequency[normalized] = {
            "text": text,
            "count": echo_frequency.get(normalized, {}).get("count", 0) + 1,
        }

        if current_user_id and echo.get("user_id") == current_user_id:
            user_echo = text

    top_echoes = [
        item["text"]
        for item in sorted(
            echo_frequency.values(),
            key=lambda item: (-item["count"], item["text"].lower()),
        )[:3]
    ]

    return echo_count, top_echoes, user_echo

# ==================== AUTH ROUTES ====================

@api_router.get("/health")
async def health_check():
    return {
        "status": "Pixelgrams backend running",
        "database": "mongo" if db_available else "memory",
    }

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    try:
        if db_available:
            existing_user = await db.users.find_one({"$or": [{"email": user_data.email}, {"username": user_data.username}]})
        else:
            existing_user = next((u for u in in_memory_users if u["email"] == user_data.email or u["username"] == user_data.username), None)

        if existing_user:
            raise HTTPException(status_code=400, detail="User with this email or username already exists")

        user = {
            "id": str(uuid.uuid4()),
            "username": user_data.username,
            "email": user_data.email,
            "password": hash_password(user_data.password),
            "avatar": None,
            "bio": "",
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        if db_available:
            await db.users.insert_one(user)
        else:
            in_memory_users.append(user)

        access_token = create_access_token(user["id"])
        refresh_token = create_refresh_token(user["id"])

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                avatar=user["avatar"],
                bio=user["bio"],
                created_at=user["created_at"]
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Auth service error: {exc}")

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserLogin):
    try:
        if db_available:
            user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
        else:
            user = next((u for u in in_memory_users if u["email"] == user_data.email), None)

        if not user or not verify_password(user_data.password, user["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        access_token = create_access_token(user["id"])
        refresh_token = create_refresh_token(user["id"])
        
        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                avatar=user.get("avatar"),
                bio=user.get("bio", ""),
                created_at=user["created_at"]
            )
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Auth service error: {exc}")

@api_router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(refresh_token: str = Query(...)):
    try:
        payload = jwt.decode(refresh_token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        new_access_token = create_access_token(user_id)
        new_refresh_token = create_refresh_token(user_id)
        
        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            user=UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                avatar=user.get("avatar"),
                bio=user.get("bio", ""),
                created_at=user["created_at"]
            )
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        avatar=current_user.get("avatar"),
        bio=current_user.get("bio", ""),
        created_at=current_user["created_at"]
    )

# ==================== USER/PROFILE ROUTES ====================

@api_router.get("/users/search", response_model=List[UserResponse])
async def search_users(q: str = Query(..., min_length=1)):
    users = await db.users.find(
        {"username": {"$regex": q, "$options": "i"}},
        {"_id": 0, "password": 0}
    ).limit(20).to_list(20)
    
    return [UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        avatar=u.get("avatar"),
        bio=u.get("bio", ""),
        created_at=u["created_at"]
    ) for u in users]

@api_router.get("/users/{user_id}", response_model=ProfileResponse)
async def get_user_profile(user_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    followers_count = await db.follows.count_documents({"following_id": user_id})
    following_count = await db.follows.count_documents({"follower_id": user_id})
    posts_count = await db.posts.count_documents({"user_id": user_id})
    
    is_following = False
    if current_user:
        follow = await db.follows.find_one({"follower_id": current_user["id"], "following_id": user_id})
        is_following = follow is not None
    
    return ProfileResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        avatar=user.get("avatar"),
        bio=user.get("bio", ""),
        followers_count=followers_count,
        following_count=following_count,
        posts_count=posts_count,
        is_following=is_following,
        created_at=user["created_at"]
    )

@api_router.get("/users/username/{username}", response_model=ProfileResponse)
async def get_user_profile_by_username(username: str, current_user: Optional[dict] = Depends(get_optional_user)):
    user = await db.users.find_one({"username": username}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    followers_count = await db.follows.count_documents({"following_id": user["id"]})
    following_count = await db.follows.count_documents({"follower_id": user["id"]})
    posts_count = await db.posts.count_documents({"user_id": user["id"]})
    
    is_following = False
    if current_user:
        follow = await db.follows.find_one({"follower_id": current_user["id"], "following_id": user["id"]})
        is_following = follow is not None
    
    return ProfileResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        avatar=user.get("avatar"),
        bio=user.get("bio", ""),
        followers_count=followers_count,
        following_count=following_count,
        posts_count=posts_count,
        is_following=is_following,
        created_at=user["created_at"]
    )

@api_router.put("/users/profile", response_model=UserResponse)
async def update_profile(profile_data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    if profile_data.bio is not None:
        update_fields["bio"] = profile_data.bio
    if profile_data.avatar is not None:
        update_fields["avatar"] = profile_data.avatar
    
    if update_fields:
        await db.users.update_one({"id": current_user["id"]}, {"$set": update_fields})
    
    updated_user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0, "password": 0})
    return UserResponse(
        id=updated_user["id"],
        username=updated_user["username"],
        email=updated_user["email"],
        avatar=updated_user.get("avatar"),
        bio=updated_user.get("bio", ""),
        created_at=updated_user["created_at"]
    )

# ==================== FOLLOW ROUTES ====================

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="You cannot follow yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_follow = await db.follows.find_one({
        "follower_id": current_user["id"],
        "following_id": user_id
    })
    
    if existing_follow:
        await db.follows.delete_one({"id": existing_follow["id"]})
        return {"following": False, "message": "Unfollowed successfully"}
    
    follow = {
        "id": str(uuid.uuid4()),
        "follower_id": current_user["id"],
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow)
    
    await create_notification(current_user["id"], user_id, "follow")
    
    return {"following": True, "message": "Followed successfully"}

@api_router.get("/users/{user_id}/followers", response_model=List[UserResponse])
async def get_followers(user_id: str):
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    follower_ids = [f["follower_id"] for f in follows]
    
    users = await db.users.find({"id": {"$in": follower_ids}}, {"_id": 0, "password": 0}).to_list(1000)
    
    return [UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        avatar=u.get("avatar"),
        bio=u.get("bio", ""),
        created_at=u["created_at"]
    ) for u in users]

@api_router.get("/users/{user_id}/following", response_model=List[UserResponse])
async def get_following(user_id: str):
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    following_ids = [f["following_id"] for f in follows]
    
    users = await db.users.find({"id": {"$in": following_ids}}, {"_id": 0, "password": 0}).to_list(1000)
    
    return [UserResponse(
        id=u["id"],
        username=u["username"],
        email=u["email"],
        avatar=u.get("avatar"),
        bio=u.get("bio", ""),
        created_at=u["created_at"]
    ) for u in users]

# ==================== OPTIMIZED HELPER FUNCTIONS ====================

async def get_posts_with_details(posts: list, current_user_id: Optional[str] = None) -> List[PostResponse]:
    """Batch fetch all related data for posts to avoid N+1 queries"""
    if not posts:
        return []
    
    post_ids = [p["id"] for p in posts]
    user_ids = list(set(p["user_id"] for p in posts))
    
    # Batch fetch users
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "password": 0}).to_list(len(user_ids))
    users_map = {u["id"]: u for u in users}
    
    # Batch fetch likes counts using aggregation
    likes_pipeline = [
        {"$match": {"post_id": {"$in": post_ids}}},
        {"$group": {"_id": "$post_id", "count": {"$sum": 1}}}
    ]
    likes_counts = await db.likes.aggregate(likes_pipeline).to_list(len(post_ids))
    likes_map = {lc["_id"]: lc["count"] for lc in likes_counts}
    
    # Batch fetch comments counts using aggregation
    comments_pipeline = [
        {"$match": {"post_id": {"$in": post_ids}}},
        {"$group": {"_id": "$post_id", "count": {"$sum": 1}}}
    ]
    comments_counts = await db.comments.aggregate(comments_pipeline).to_list(len(post_ids))
    comments_map = {cc["_id"]: cc["count"] for cc in comments_counts}

    echoes = await db.echoes.find(
        {"post_id": {"$in": post_ids}},
        {"_id": 0}
    ).to_list(5000)
    echoes_map = {}
    for echo in echoes:
        echoes_map.setdefault(echo["post_id"], []).append(echo)
    
    # Batch fetch user's likes if authenticated
    user_likes_set = set()
    if current_user_id:
        user_likes = await db.likes.find(
            {"post_id": {"$in": post_ids}, "user_id": current_user_id},
            {"_id": 0, "post_id": 1}
        ).to_list(len(post_ids))
        user_likes_set = {ul["post_id"] for ul in user_likes}
    
    # Build result
    result = []
    for post in posts:
        user = users_map.get(post["user_id"])
        if not user:
            continue
        echo_count, top_echoes, user_echo = build_echo_summary(
            echoes_map.get(post["id"], []),
            current_user_id,
        )
        
        result.append(PostResponse(
            id=post["id"],
            user_id=post["user_id"],
            username=user["username"],
            user_avatar=user.get("avatar"),
            image=post["image"],
            caption=post.get("caption", ""),
            mood=post.get("mood", "unfiltered"),
            backstory=post.get("backstory", ""),
            likes_count=likes_map.get(post["id"], 0),
            comments_count=comments_map.get(post["id"], 0),
            echo_count=echo_count,
            top_echoes=top_echoes,
            user_echo=user_echo,
            is_liked=post["id"] in user_likes_set,
            created_at=post["created_at"]
        ))
    
    return result

async def get_comments_with_users(comments: list) -> List[CommentResponse]:
    """Batch fetch user data for comments to avoid N+1 queries"""
    if not comments:
        return []
    
    user_ids = list(set(c["user_id"] for c in comments))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "password": 0}).to_list(len(user_ids))
    users_map = {u["id"]: u for u in users}
    
    result = []
    for comment in comments:
        user = users_map.get(comment["user_id"])
        result.append(CommentResponse(
            id=comment["id"],
            post_id=comment["post_id"],
            user_id=comment["user_id"],
            username=user["username"] if user else "deleted",
            user_avatar=user.get("avatar") if user else None,
            text=comment["text"],
            created_at=comment["created_at"]
        ))
    
    return result


async def get_echoes_with_users(echoes: list) -> List[EchoResponse]:
    if not echoes:
        return []

    user_ids = list(set(e["user_id"] for e in echoes))
    users = await db.users.find(
        {"id": {"$in": user_ids}},
        {"_id": 0, "password": 0}
    ).to_list(len(user_ids))
    users_map = {u["id"]: u for u in users}

    result = []
    for echo in echoes:
        user = users_map.get(echo["user_id"])
        result.append(EchoResponse(
            id=echo["id"],
            post_id=echo["post_id"],
            user_id=echo["user_id"],
            username=user["username"] if user else "deleted",
            user_avatar=user.get("avatar") if user else None,
            text=echo["text"],
            created_at=echo["created_at"]
        ))

    return result

async def get_notifications_with_details(notifications: list) -> List[NotificationResponse]:
    """Batch fetch sender and post data for notifications to avoid N+1 queries"""
    if not notifications:
        return []
    
    sender_ids = list(set(n["sender_id"] for n in notifications))
    post_ids = list(set(n["post_id"] for n in notifications if n.get("post_id")))
    
    # Batch fetch senders
    senders = await db.users.find({"id": {"$in": sender_ids}}, {"_id": 0, "password": 0}).to_list(len(sender_ids))
    senders_map = {s["id"]: s for s in senders}
    
    # Batch fetch posts
    posts_map = {}
    if post_ids:
        posts = await db.posts.find({"id": {"$in": post_ids}}, {"_id": 0}).to_list(len(post_ids))
        posts_map = {p["id"]: p for p in posts}
    
    result = []
    for notif in notifications:
        sender = senders_map.get(notif["sender_id"])
        if not sender:
            continue
        
        post_image = None
        if notif.get("post_id"):
            post = posts_map.get(notif["post_id"])
            if post:
                post_image = post["image"]
        
        result.append(NotificationResponse(
            id=notif["id"],
            sender_id=notif["sender_id"],
            sender_username=sender["username"],
            sender_avatar=sender.get("avatar"),
            notification_type=notif["notification_type"],
            post_id=notif.get("post_id"),
            post_image=post_image,
            is_read=notif["is_read"],
            created_at=notif["created_at"]
        ))
    
    return result

async def get_messages_with_users(messages: list) -> List[MessageResponse]:
    """Batch fetch sender data for messages to avoid N+1 queries"""
    if not messages:
        return []
    
    sender_ids = list(set(m["sender_id"] for m in messages))
    senders = await db.users.find({"id": {"$in": sender_ids}}, {"_id": 0, "password": 0}).to_list(len(sender_ids))
    senders_map = {s["id"]: s for s in senders}
    
    result = []
    for msg in messages:
        sender = senders_map.get(msg["sender_id"])
        result.append(MessageResponse(
            id=msg["id"],
            conversation_id=msg["receiver_id"] if msg["sender_id"] == sender_ids[0] else msg["sender_id"],
            sender_id=msg["sender_id"],
            sender_username=sender["username"] if sender else "deleted",
            sender_avatar=sender.get("avatar") if sender else None,
            text=msg["text"],
            is_read=msg["is_read"],
            created_at=msg["created_at"]
        ))
    
    return result

# ==================== POST ROUTES ====================

@api_router.post("/posts", response_model=PostResponse)
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
    post = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "image": post_data.image,
        "caption": post_data.caption or "",
        "mood": (post_data.mood or "unfiltered").strip()[:32] or "unfiltered",
        "backstory": (post_data.backstory or "").strip()[:600],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.posts.insert_one(post)
    
    return PostResponse(
        id=post["id"],
        user_id=current_user["id"],
        username=current_user["username"],
        user_avatar=current_user.get("avatar"),
        image=post["image"],
        caption=post["caption"],
        mood=post["mood"],
        backstory=post["backstory"],
        likes_count=0,
        comments_count=0,
        echo_count=0,
        top_echoes=[],
        user_echo=None,
        is_liked=False,
        created_at=post["created_at"]
    )

@api_router.get("/posts", response_model=List[PostResponse])
async def get_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    skip = (page - 1) * page_size
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return await get_posts_with_details(posts, current_user["id"] if current_user else None)

@api_router.get("/posts/feed", response_model=List[PostResponse])
async def get_feed(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: dict = Depends(get_current_user)
):
    # Get following user IDs
    follows = await db.follows.find({"follower_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    following_ids = [f["following_id"] for f in follows]
    following_ids.append(current_user["id"])  # Include own posts
    
    skip = (page - 1) * page_size
    posts = await db.posts.find(
        {"user_id": {"$in": following_ids}},
        {"_id": 0}
    ).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return await get_posts_with_details(posts, current_user["id"])

@api_router.get("/posts/{post_id}", response_model=PostResponse)
async def get_post(post_id: str, current_user: Optional[dict] = Depends(get_optional_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    user = await db.users.find_one({"id": post["user_id"]}, {"_id": 0, "password": 0})
    likes_count = await db.likes.count_documents({"post_id": post_id})
    comments_count = await db.comments.count_documents({"post_id": post_id})
    echoes = await db.echoes.find({"post_id": post_id}, {"_id": 0}).to_list(200)
    echo_count, top_echoes, user_echo = build_echo_summary(
        echoes,
        current_user["id"] if current_user else None,
    )
    
    is_liked = False
    if current_user:
        like = await db.likes.find_one({"post_id": post_id, "user_id": current_user["id"]})
        is_liked = like is not None
    
    return PostResponse(
        id=post["id"],
        user_id=post["user_id"],
        username=user["username"] if user else "deleted",
        user_avatar=user.get("avatar") if user else None,
        image=post["image"],
        caption=post.get("caption", ""),
        mood=post.get("mood", "unfiltered"),
        backstory=post.get("backstory", ""),
        likes_count=likes_count,
        comments_count=comments_count,
        echo_count=echo_count,
        top_echoes=top_echoes,
        user_echo=user_echo,
        is_liked=is_liked,
        created_at=post["created_at"]
    )

@api_router.get("/users/{user_id}/posts", response_model=List[PostResponse])
async def get_user_posts(
    user_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=50),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    skip = (page - 1) * page_size
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(page_size).to_list(page_size)
    
    return await get_posts_with_details(posts, current_user["id"] if current_user else None)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this post")
    
    await db.posts.delete_one({"id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    await db.echoes.delete_many({"post_id": post_id})
    await db.notifications.delete_many({"post_id": post_id})
    
    return {"message": "Post deleted successfully"}

# ==================== LIKE ROUTES ====================

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = await db.likes.find_one({
        "post_id": post_id,
        "user_id": current_user["id"]
    })
    
    if existing_like:
        await db.likes.delete_one({"id": existing_like["id"]})
        likes_count = await db.likes.count_documents({"post_id": post_id})
        return {"liked": False, "likes_count": likes_count}
    
    like = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": current_user["id"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.likes.insert_one(like)
    
    await create_notification(current_user["id"], post["user_id"], "like", post_id)
    
    likes_count = await db.likes.count_documents({"post_id": post_id})
    return {"liked": True, "likes_count": likes_count}

# ==================== COMMENT ROUTES ====================

@api_router.post("/posts/{post_id}/comments", response_model=CommentResponse)
async def create_comment(post_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = {
        "id": str(uuid.uuid4()),
        "post_id": post_id,
        "user_id": current_user["id"],
        "text": comment_data.text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.comments.insert_one(comment)
    
    await create_notification(current_user["id"], post["user_id"], "comment", post_id)
    
    return CommentResponse(
        id=comment["id"],
        post_id=post_id,
        user_id=current_user["id"],
        username=current_user["username"],
        user_avatar=current_user.get("avatar"),
        text=comment["text"],
        created_at=comment["created_at"]
    )

@api_router.get("/posts/{post_id}/comments", response_model=List[CommentResponse])
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return await get_comments_with_users(comments)


@api_router.get("/posts/{post_id}/echoes", response_model=List[EchoResponse])
async def get_echoes(post_id: str):
    echoes = await db.echoes.find(
        {"post_id": post_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return await get_echoes_with_users(echoes)


@api_router.post("/posts/{post_id}/echoes")
async def create_echo(post_id: str, echo_data: EchoCreate, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    text = (echo_data.text or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="Echo cannot be empty")
    if len(text.split()) > 1:
        raise HTTPException(status_code=400, detail="Echo must be a single word")

    text = text[:20]
    existing_echo = await db.echoes.find_one(
        {"post_id": post_id, "user_id": current_user["id"]},
        {"_id": 0}
    )

    if existing_echo:
        await db.echoes.update_one(
            {"id": existing_echo["id"]},
            {"$set": {
                "text": text,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }}
        )
    else:
        echo = {
            "id": str(uuid.uuid4()),
            "post_id": post_id,
            "user_id": current_user["id"],
            "text": text,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.echoes.insert_one(echo)
        await create_notification(current_user["id"], post["user_id"], "echo", post_id)

    echoes = await db.echoes.find({"post_id": post_id}, {"_id": 0}).to_list(200)
    echo_count, top_echoes, user_echo = build_echo_summary(echoes, current_user["id"])
    return {
        "echo_count": echo_count,
        "top_echoes": top_echoes,
        "user_echo": user_echo,
    }

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id}, {"_id": 0})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to delete this comment")
    
    await db.comments.delete_one({"id": comment_id})
    return {"message": "Comment deleted successfully"}

# ==================== NOTIFICATION ROUTES ====================

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find(
        {"receiver_id": current_user["id"]},
        {"_id": 0}
    ).sort("created_at", -1).limit(50).to_list(50)
    
    return await get_notifications_with_details(notifications)

@api_router.put("/notifications/read")
async def mark_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"receiver_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    return {"message": "All notifications marked as read"}

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "receiver_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

# ==================== MESSAGE ROUTES ====================

@api_router.get("/conversations", response_model=List[ConversationResponse])
async def get_conversations(current_user: dict = Depends(get_current_user)):
    # Get all unique conversations for the user
    messages = await db.messages.find(
        {"$or": [{"sender_id": current_user["id"]}, {"receiver_id": current_user["id"]}]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    conversations = {}
    for msg in messages:
        other_id = msg["receiver_id"] if msg["sender_id"] == current_user["id"] else msg["sender_id"]
        if other_id not in conversations:
            conversations[other_id] = {
                "last_message": msg["text"],
                "last_message_time": msg["created_at"],
                "unread_count": 0
            }
        if msg["receiver_id"] == current_user["id"] and not msg["is_read"]:
            conversations[other_id]["unread_count"] += 1
    
    # Batch fetch all participant users
    participant_ids = list(conversations.keys())
    if not participant_ids:
        return []
    
    users = await db.users.find({"id": {"$in": participant_ids}}, {"_id": 0, "password": 0}).to_list(len(participant_ids))
    users_map = {u["id"]: u for u in users}
    
    result = []
    for user_id, conv_data in conversations.items():
        user = users_map.get(user_id)
        if not user:
            continue
        
        result.append(ConversationResponse(
            id=user_id,
            participant_id=user_id,
            participant_username=user["username"],
            participant_avatar=user.get("avatar"),
            last_message=conv_data["last_message"],
            last_message_time=conv_data["last_message_time"],
            unread_count=conv_data["unread_count"]
        ))
    
    # Sort by last message time
    result.sort(key=lambda x: x.last_message_time or "", reverse=True)
    return result

@api_router.get("/messages/{user_id}", response_model=List[MessageResponse])
async def get_messages(user_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find(
        {"$or": [
            {"sender_id": current_user["id"], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user["id"]}
        ]},
        {"_id": 0}
    ).sort("created_at", 1).to_list(100)
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": user_id, "receiver_id": current_user["id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    result = []
    for msg in messages:
        sender = await db.users.find_one({"id": msg["sender_id"]}, {"_id": 0, "password": 0})
        result.append(MessageResponse(
            id=msg["id"],
            conversation_id=user_id,
            sender_id=msg["sender_id"],
            sender_username=sender["username"] if sender else "deleted",
            sender_avatar=sender.get("avatar") if sender else None,
            text=msg["text"],
            is_read=msg["is_read"],
            created_at=msg["created_at"]
        ))
    
    return result

@api_router.post("/messages/{user_id}", response_model=MessageResponse)
async def send_message(user_id: str, message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    receiver = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    message = {
        "id": str(uuid.uuid4()),
        "sender_id": current_user["id"],
        "receiver_id": user_id,
        "text": message_data.text,
        "is_read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.messages.insert_one(message)
    
    return MessageResponse(
        id=message["id"],
        conversation_id=user_id,
        sender_id=current_user["id"],
        sender_username=current_user["username"],
        sender_avatar=current_user.get("avatar"),
        text=message["text"],
        is_read=False,
        created_at=message["created_at"]
    )

@api_router.get("/messages/unread-count/total")
async def get_total_unread_messages(current_user: dict = Depends(get_current_user)):
    count = await db.messages.count_documents({
        "receiver_id": current_user["id"],
        "is_read": False
    })
    return {"count": count}

# ==================== CLOUDINARY ROUTES ====================

@api_router.get("/cloudinary/signature")
async def generate_cloudinary_signature(
    resource_type: str = Query("image", enum=["image", "video"]),
    folder: str = Query("posts"),
    current_user: dict = Depends(get_current_user)
):
    ALLOWED_FOLDERS = ("users/", "posts/", "avatars/")
    if not any(folder.startswith(f) or folder == f.rstrip('/') for f in ALLOWED_FOLDERS):
        raise HTTPException(status_code=400, detail="Invalid folder path")
    
    timestamp = int(time.time())
    params = {
        "timestamp": timestamp,
        "folder": folder,
    }

    api_secret = os.environ.get("CLOUDINARY_API_SECRET")
    cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME")
    api_key = os.environ.get("CLOUDINARY_API_KEY")
    if not all(
        _is_real_config_value(value)
        for value in (api_secret, cloud_name, api_key)
    ):
        return {
            "signature": None,
            "timestamp": timestamp,
            "cloud_name": None,
            "api_key": None,
            "folder": folder,
            "resource_type": resource_type,
            "mode": "inline",
        }
    
    signature = cloudinary.utils.api_sign_request(
        params,
        api_secret
    )
    
    return {
        "signature": signature,
        "timestamp": timestamp,
        "cloud_name": cloud_name,
        "api_key": api_key,
        "folder": folder,
        "resource_type": resource_type
    }

# ==================== EXPLORE ROUTES ====================

@api_router.get("/explore", response_model=List[PostResponse])
async def explore_posts(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=50),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    skip = (page - 1) * page_size
    # Get posts with most likes
    pipeline = [
        {"$lookup": {
            "from": "likes",
            "localField": "id",
            "foreignField": "post_id",
            "as": "post_likes"
        }},
        {"$addFields": {"likes_count": {"$size": "$post_likes"}}},
        {"$sort": {"likes_count": -1, "created_at": -1}},
        {"$skip": skip},
        {"$limit": page_size},
        {"$project": {"_id": 0, "post_likes": 0}}
    ]
    
    posts = await db.posts.aggregate(pipeline).to_list(page_size)
    
    return await get_posts_with_details(posts, current_user["id"] if current_user else None)

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get(
        'CORS_ORIGINS',
        'http://localhost:3000,http://127.0.0.1:3000'
    ).split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()


@app.get("/{full_path:path}", include_in_schema=False)
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found")

    index_file = FRONTEND_BUILD_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="Frontend build not found")

    requested_file = FRONTEND_BUILD_DIR / full_path
    if full_path and requested_file.is_file():
        return FileResponse(requested_file)

    return FileResponse(index_file)
