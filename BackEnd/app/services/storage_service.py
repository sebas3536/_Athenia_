import os
from cryptography.fernet import Fernet

KEY_PATH = os.getenv("ENC_KEY_PATH", "./enc.key")

def _load_or_create_key():
    if os.path.exists(KEY_PATH):
        with open(KEY_PATH, "rb") as f:
            return f.read()
    key = Fernet.generate_key()
    with open(KEY_PATH, "wb") as f:
        f.write(key)
    return key

_FERNET = Fernet(_load_or_create_key())

def encrypt_bytes(data: bytes) -> bytes:
    return _FERNET.encrypt(data)

def decrypt_bytes(token: bytes) -> bytes:
    return _FERNET.decrypt(token)
