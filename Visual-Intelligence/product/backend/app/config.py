"""
Mercer AI — Application Settings

Reads from environment variables / .env file.
Never hardcode secrets — all sensitive values come through here.
"""
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── MongoDB & Redis ───────────────────────────────────────────────────────
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "atelier_os"
    redis_url: str = "redis://localhost:6379"

    # ── Supabase Auth ─────────────────────────────────────────────────────────
    supabase_url: str = "https://your-project-ref.supabase.co"
    supabase_anon_key: str = "your-supabase-anon-key"
    supabase_jwt_secret: str = "your-supabase-jwt-secret"  # Used to verify JWT tokens server-side

    # ── OpenAI (GPT Image 2) ──────────────────────────────────────────────────
    openai_api_key: str = ""

    # ── Google Gemini (NB2 + NB Pro) ─────────────────────────────────────────
    gemini_api_key: str = ""

    # ── Cloudflare R2 (S3-compatible object storage) ─────────────────────────
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = ""
    r2_public_url: str = ""               # Your R2 custom domain / public URL base
    r2_url_expiry_seconds: int = 3600     # Signed URL expiry — 1 hour default

    # ── Razorpay (primary — India: UPI, cards, netbanking, wallets) ───────────
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    razorpay_webhook_secret: str = ""

    # ── Stripe (secondary — international cards, optional) ────────────────────
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # ── Resend (Email Marketing & Transactionals) ─────────────────────────────
    resend_api_key: str = ""
    resend_audience_id: str = ""

    # ── App Config ────────────────────────────────────────────────────────────
    environment: str = "development"       # development | staging | production
    frontend_url: str = "http://localhost:3000"

    # Routing flags (mirror of api-connection.md env vars)
    nb_pro_batch_default: bool = True      # Studio: route NB Pro through Batch unless urgent
    nb_pro_max_resolution_starter: int = 1024   # Cap Starter tier at 1K

    # Batch worker config
    batch_worker_interval_seconds: int = 900   # 15 min rolling window

    # Provider semaphore limits (tune to your API tier)
    openai_max_concurrent: int = 5
    gemini_max_concurrent: int = 10

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton — safe to call anywhere."""
    return Settings()
