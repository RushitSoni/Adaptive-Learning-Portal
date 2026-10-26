# from dotenv import load_dotenv
# import os

# load_dotenv()

# GROQ_API_KEY = os.getenv("GROQ_API_KEY")
# GROQ_MODEL = os.getenv("GROQ_MODEL")

# HF_API_KEY = os.getenv("HF_API_KEY")
# HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL")


from dotenv import load_dotenv
import os

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL")

# No longer used (embeddings now run locally via fastembed), kept for compatibility
HF_API_KEY = os.getenv("HF_API_KEY")

# Falls back to a small local-friendly model if the env var is missing or empty
HF_EMBEDDING_MODEL = os.getenv("HF_EMBEDDING_MODEL") or "BAAI/bge-small-en-v1.5"