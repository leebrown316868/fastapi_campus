from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.db.database import init_db
from app.api import auth, notifications, activities, lost_items, users, uploads, user_notifications, activity_registrations, feed


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    await init_db()
    yield
    # Shutdown
    pass


# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    lifespan=lifespan,
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(feed.router)
app.include_router(user_notifications.router)  # Must be before notifications.router to avoid route conflicts
app.include_router(notifications.router)
app.include_router(activity_registrations.router)  # Must be before activities.router to avoid /my-registrations route conflict
app.include_router(activities.router)
app.include_router(lost_items.router)
app.include_router(users.router)
app.include_router(uploads.router)

# Mount static files directory for uploaded images
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "cors_origins": settings.CORS_ORIGINS}
