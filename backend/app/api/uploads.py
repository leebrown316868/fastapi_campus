"""
File upload API endpoint for handling image uploads.
"""
import os
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Annotated

from app.db.database import get_db
from app.core.config import settings


# Type aliases for this file
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Allowed image file types
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

# Upload directory
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


def validate_image_file(file: UploadFile) -> None:
    """Validate that the uploaded file is an allowed image type."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No filename provided")

    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
        )


def generate_unique_filename(original_filename: str) -> str:
    """Generate a unique filename while preserving the extension."""
    ext = Path(original_filename).suffix.lower()
    unique_name = f"{uuid.uuid4()}{ext}"
    return unique_name


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    db: DatabaseSession = None,
) -> dict:
    """
    Upload a single image file.

    Returns:
        dict: Contains the URL of the uploaded image
    """
    # Validate file type
    validate_image_file(file)

    # Generate unique filename
    unique_filename = generate_unique_filename(file.filename)
    file_path = UPLOAD_DIR / unique_filename

    # Read and validate file content
    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB"
        )

    # Save file to disk
    try:
        with open(file_path, "wb") as f:
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Return the URL path
    # Note: In production, this should return an absolute URL to the file
    # For now, we return a relative path that will be served via static files
    return {
        "url": f"/uploads/{unique_filename}",
        "filename": unique_filename,
        "size": len(content)
    }


@router.delete("/image/{filename}")
async def delete_image(
    filename: str,
    db: DatabaseSession = None,
) -> dict:
    """
    Delete an uploaded image file.
    """
    # Security check: ensure filename doesn't contain path traversal
    if "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    try:
        file_path.unlink()
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete file: {str(e)}")
