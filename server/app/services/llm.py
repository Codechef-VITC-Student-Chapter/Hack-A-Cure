import os
from ragas.llms import LangchainLLMWrapper
from ragas.embeddings import LangchainEmbeddingsWrapper
from langchain_google_genai import GoogleGenerativeAIEmbeddings, ChatGoogleGenerativeAI
from langchain_groq import ChatGroq
from dotenv import load_dotenv

load_dotenv()

# Get Gemini API key from environment variable
GEMINI_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError(
        "GOOGLE_API_KEY environment variable not set. Please export it in your shell."
    )

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_MODEL = os.getenv("GROQ_API_MODEL")

if not GROQ_API_KEY:
    raise ValueError(
        "GROQ_API_KEY environment variable not set. Please export it in your shell."
    )

if not GROQ_API_MODEL:
    raise ValueError(
        "GROQ_API_ environment variable not set. Please export it in your shell."
    )

config = {
    "model": "gemini-2.5-flash",
    "temperature": 0.2,
    "max_tokens": None,
    "top_p": 0.8,
}

evaluator_llm = LangchainLLMWrapper(
    ChatGoogleGenerativeAI(
        model=config["model"],
        temperature=config["temperature"],
        max_tokens=config["max_tokens"],
        api_key=GEMINI_API_KEY,
    )
)

evaluator_embeddings = LangchainEmbeddingsWrapper(
    GoogleGenerativeAIEmbeddings(
        model="gemini-embedding-001",
        task_type="retrieval_document",
        google_api_key=GEMINI_API_KEY,
    )
)
