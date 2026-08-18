"""
RAKSHA — Server-side encryption for sensitive data at rest.
Uses AES-256-GCM via cryptography library.
"""
from __future__ import annotations

import base64
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.exceptions import InvalidTag
from core.config import settings


class EncryptionError(Exception):
    """Raised when encryption/decryption fails."""
    pass


class EncryptionKeyMissingError(EncryptionError):
    """Raised when encryption key is not configured."""
    pass


def _get_encryption_key() -> bytes:
    """Get the encryption key from settings.
    
    Key must be 32 bytes (256 bits) for AES-256-GCM.
    Expected to be base64-encoded in environment variable.
    """
    key_b64 = settings.encryption_key
    if not key_b64:
        raise EncryptionKeyMissingError(
            "ENCRYPTION_KEY environment variable not set. "
            "Generate with: python -c 'import base64, os; print(base64.b64encode(os.urandom(32)).decode())'"
        )
    try:
        key = base64.b64decode(key_b64)
    except Exception as e:
        raise EncryptionError(f"Invalid ENCRYPTION_KEY format (must be base64): {e}")
    if len(key) != 32:
        raise EncryptionError(f"ENCRYPTION_KEY must be 32 bytes (256 bits), got {len(key)}")
    return key


def encrypt_token(plaintext: str) -> str:
    """Encrypt a token for storage.
    
    Returns base64-encoded ciphertext with prepended nonce.
    Format: base64(nonce + ciphertext + tag)
    """
    if not plaintext:
        return ""
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    nonce = os.urandom(12)  # 96-bit nonce for GCM
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    # Combine nonce + ciphertext for storage
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode("ascii")


def decrypt_token(ciphertext_b64: str) -> str:
    """Decrypt a token from storage.
    
    Returns empty string if ciphertext is empty or None.
    Raises EncryptionError if decryption fails (invalid key, corrupted data).
    """
    if not ciphertext_b64:
        return ""
    key = _get_encryption_key()
    aesgcm = AESGCM(key)
    try:
        combined = base64.b64decode(ciphertext_b64)
    except Exception as e:
        raise EncryptionError(f"Invalid base64 ciphertext: {e}")
    
    if len(combined) < 12 + 16:  # nonce(12) + tag(16) minimum
        raise EncryptionError("Ciphertext too short")
    
    nonce = combined[:12]
    ciphertext = combined[12:]
    try:
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode("utf-8")
    except InvalidTag:
        raise EncryptionError("Decryption failed: invalid key or corrupted ciphertext")
    except Exception as e:
        raise EncryptionError(f"Decryption failed: {e}")


def is_encrypted(value: str) -> bool:
    """Heuristic check if a value appears to be encrypted (base64, reasonable length)."""
    if not value:
        return False
    try:
        decoded = base64.b64decode(value)
        # Encrypted tokens: nonce(12) + ciphertext(min 1) + tag(16) = at least 29 bytes
        return len(decoded) >= 29
    except Exception:
        return False


def migrate_token(value: str) -> str:
    """Migrate a plaintext token to encrypted form if needed.
    
    If already encrypted, returns as-is.
    If plaintext, encrypts and returns encrypted version.
    """
    if not value:
        return ""
    if is_encrypted(value):
        return value  # Already encrypted
    # Plaintext token - encrypt it
    return encrypt_token(value)