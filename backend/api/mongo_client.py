import os
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get the connection string from your environment variables
MONGO_URI = os.getenv("MONGO_URI")
client = None
db = None

try:
    if not MONGO_URI:
        print("MONGO_URI environment variable not set.")
    else:
        # Establish a connection to MongoDB
        client = MongoClient(MONGO_URI)
        
        # Select your database (it will be created if it doesn't exist)
        db = client.get_database("vytalink_chatbot")
        
        # Check if the 'conversation_summaries' collection exists and is capped
        collection_names = db.list_collection_names()
        if "conversation_summaries" not in collection_names:
            # Create a capped collection to store a max of 100 documents per user
            # Note: A better approach for per-user capping is to manually trim the collection,
            # as capped collections have a total size limit, not per-user.
            # We'll stick to a simple capped collection for the hackathon.
            db.create_collection("conversation_summaries", capped=True, size=100000, max=100)
            print("Created capped collection 'conversation_summaries'.")
            
        # Confirm connection
        client.admin.command('ping')
        print("Successfully connected to MongoDB!")

except ConnectionFailure as e:
    print(f"Could not connect to MongoDB: {e}")
    client = None
    db = None
except Exception as e:
    print(f"An error occurred: {e}")
    client = None
    db = None

def get_db():
    """Returns the database instance."""
    return db