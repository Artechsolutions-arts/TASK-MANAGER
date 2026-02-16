"""
Redis cache service for frequently accessed data (e.g. user roles).
Fails gracefully if Redis is unavailable - cache is optional.
"""
import json
import logging
from typing import Any, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis_client: Optional[Any] = None
_cache_available: bool = False


async def _get_client():
    """Lazy init Redis client (async)."""
    global _redis_client, _cache_available
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as redis
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
        await _redis_client.ping()
        _cache_available = True
        logger.info("Redis cache connected")
    except Exception as e:
        logger.warning("Redis cache unavailable: %s. Proceeding without cache.", e)
        _cache_available = False
    return _redis_client


async def cache_get(key: str) -> Optional[Any]:
    """Get value from cache. Returns None if miss or Redis unavailable."""
    client = await _get_client()
    if not _cache_available or not client:
        return None
    try:
        data = await client.get(key)
        if data is None:
            return None
        return json.loads(data)
    except Exception as e:
        logger.debug("Cache get error for %s: %s", key, e)
        return None


async def cache_set(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """Set value in cache. No-op if Redis unavailable."""
    client = await _get_client()
    if not _cache_available or not client:
        return
    try:
        await client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except Exception as e:
        logger.debug("Cache set error for %s: %s", key, e)


async def cache_delete(key: str) -> None:
    """Delete key from cache. No-op if Redis unavailable."""
    client = await _get_client()
    if not _cache_available or not client:
        return
    try:
        await client.delete(key)
    except Exception as e:
        logger.debug("Cache delete error for %s: %s", key, e)


def cache_key_user_roles(user_id: str) -> str:
    return f"user_roles:{user_id}"
