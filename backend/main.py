from fastapi import FastAPI, WebSocket, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import asyncio
import json
import os
import io
import speech_recognition as sr
from dotenv import load_dotenv
from websockets import connect
from typing import Dict
import google.generativeai as genai
from textblob import TextBlob
from pydantic import BaseModel
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,  # Allow cookies or authorization headers
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

class GeminiConnection:
    def __init__(self):
        self.api_key = os.environ.get("GEMINI_API_KEY")
        self.model = "gemini-2.0-flash-exp"
        self.uri = (
            "wss://generativelanguage.googleapis.com/ws/"
            "google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={self.api_key}"
        )
        self.ws = None
        self.config = None

    async def connect(self):
        """Initialize connection to Gemini"""
        self.ws = await connect(self.uri, additional_headers={"Content-Type": "application/json"})
        
        if not self.config:
            raise ValueError("Configuration must be set before connecting")

        # Send initial setup message with configuration
        setup_message = {
            "setup": {
                "model": f"models/{self.model}",
                "generation_config": {
                    "response_modalities": ["AUDIO"],
                    "speech_config": {
                        "voice_config": {
                            "prebuilt_voice_config": {
                                "voice_name": self.config["voice"]
                            }
                        }
                    }
                },
                "system_instruction": {
                    "parts": [
                        {
                            "text": self.config["systemPrompt"]
                        }
                    ]
                }
            }
        }
        await self.ws.send(json.dumps(setup_message))
        
        # Wait for setup completion
        setup_response = await self.ws.recv()
        return setup_response

    def set_config(self, config):
        """Set configuration for the connection"""
        self.config = config

    async def send_audio(self, audio_data: str):
        """Send audio data to Gemini"""
        realtime_input_msg = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": audio_data,
                        "mime_type": "audio/pcm"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(realtime_input_msg))

    async def receive(self):
        """Receive message from Gemini"""
        return await self.ws.recv()

    async def close(self):
        """Close the connection"""
        if self.ws:
            await self.ws.close()

    async def send_image(self, image_data: str):
        """Send image data to Gemini"""
        image_message = {
            "realtime_input": {
                "media_chunks": [
                    {
                        "data": image_data,
                        "mime_type": "image/jpeg"
                    }
                ]
            }
        }
        await self.ws.send(json.dumps(image_message))

    async def send_text(self, text: str):
        """Send text message to Gemini"""
        text_message = {
            "client_content": {
                "turns": [
                    {
                        "role": "user",
                        "parts": [{"text": text}]
                    }
                ],
                "turn_complete": True
            }
        }
        await self.ws.send(json.dumps(text_message))


@app.get("/")
def root():
    return {"message": "Welcome to 2x2pac backend!"}

# Store active connections
connections: Dict[str, GeminiConnection] = {}

@app.websocket("/ws/{client_id}")
async def websocket_endpoint(websocket: WebSocket, client_id: str):
    await websocket.accept()
    
    try:
        # Create new Gemini connection for this client
        gemini = GeminiConnection()
        connections[client_id] = gemini
        
        # Wait for initial configuration
        config_data = await websocket.receive_json()
        if config_data.get("type") != "config":
            raise ValueError("First message must be configuration")
        
        # Set the configuration
        gemini.set_config(config_data.get("config", {}))
        
        # Initialize Gemini connection
        await gemini.connect()
        
        # Handle bidirectional communication
        async def receive_from_client():
            try:
                while True:
                    try:
                        # Check if connection is closed
                        if websocket.client_state.value == 3:  # WebSocket.CLOSED
                            print("WebSocket connection closed by client")
                            return
                            
                        message = await websocket.receive()
                        
                        # Check for close message
                        if message["type"] == "websocket.disconnect":
                            print("Received disconnect message")
                            return
                            
                        message_content = json.loads(message["text"])
                        msg_type = message_content["type"]
                        if msg_type == "audio":
                            await gemini.send_audio(message_content["data"])    
                        elif msg_type == "image":
                            await gemini.send_image(message_content["data"])
                        elif msg_type == "text":
                            await gemini.send_text(message_content["data"])
                        else:
                            print(f"Unknown message type: {msg_type}")
                    except json.JSONDecodeError as e:
                        print(f"JSON decode error: {e}")
                        continue
                    except KeyError as e:
                        print(f"Key error in message: {e}")
                        continue
                    except Exception as e:
                        print(f"Error processing client message: {str(e)}")
                        if "disconnect message" in str(e):
                            return
                        continue
                            
            except Exception as e:
                print(f"Fatal error in receive_from_client: {str(e)}")
                return

        async def receive_from_gemini():
            try:
                while True:
                    if websocket.client_state.value == 3:  # WebSocket.CLOSED
                        print("WebSocket closed, stopping Gemini receiver")
                        return

                    msg = await gemini.receive()
                    response = json.loads(msg)
                    
                    # Forward audio data to client
                    try:
                        parts = response["serverContent"]["modelTurn"]["parts"]
                        for p in parts:
                            # Check connection state before each send
                            if websocket.client_state.value == 3:
                                return
                                
                            if "inlineData" in p:
                                audio_data = p["inlineData"]["data"]
                                await websocket.send_json({
                                    "type": "audio",
                                    "data": audio_data
                                })
                            elif "text" in p:
                                print(f"Received text: {p['text']}")
                                await websocket.send_json({
                                    "type": "text",
                                    "data": p["text"]
                                })
                    except KeyError:
                        pass

                    # Handle turn completion
                    try:
                        if response["serverContent"]["turnComplete"]:
                            await websocket.send_json({
                                "type": "turn_complete",
                                "data": True
                            })
                    except KeyError:
                        pass
            except Exception as e:
                print(f"Error receiving from Gemini: {e}")

        # Run both receiving tasks concurrently
        async with asyncio.TaskGroup() as tg:
            tg.create_task(receive_from_client())
            tg.create_task(receive_from_gemini())

    except Exception as e:
        print(f"WebSocket error: {e}")
    finally:
        # Cleanup
        if client_id in connections:
            await connections[client_id].close()
            del connections[client_id]

# Configure Gemini API
api_key = os.environ.get("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    gemini_model = genai.GenerativeModel("gemini-pro")
else:
    logger.warning("GEMINI_API_KEY not found in environment variables")

class SentimentResponse(BaseModel):
    transcription: str
    sentiment: str
    polarity: float

def analyze_text_sentiment(text: str):
    """Analyze sentiment using TextBlob"""
    try:
        analysis = TextBlob(text)
        polarity = analysis.sentiment.polarity
        
        # Determine sentiment based on polarity
        if polarity > 0.05:
            sentiment = "Positive"
        elif polarity < -0.05:
            sentiment = "Negative"
        else:
            sentiment = "Neutral"
            
        return {"sentiment": sentiment, "polarity": polarity}
    except Exception as e:
        logger.error(f"Error in sentiment analysis: {str(e)}")
        return {"sentiment": "Error", "polarity": 0.0}

def transcribe_audio(audio_data: bytes) -> str:
    """Transcribe audio using speech_recognition"""
    try:
        recognizer = sr.Recognizer()
        
        # Create a temporary WAV file to ensure format compatibility
        temp_file = io.BytesIO(audio_data)
        
        # First, verify the file format
        try:
            with sr.AudioFile(temp_file) as source:
                audio = recognizer.record(source)
        except Exception as format_error:
            logger.error(f"Audio format error: {str(format_error)}")
            raise Exception(f"Audio format error: The file appears to be in an unsupported format. Please ensure it's a PCM WAV file.")
        
        # Reset position in the BytesIO object
        temp_file.seek(0)
        
        # Now try to transcribe
        with sr.AudioFile(temp_file) as source:
            audio = recognizer.record(source)
            
        # Use multiple recognition services for reliability
        try:
            # Try Google first (requires internet)
            text = recognizer.recognize_google(audio)
            logger.info(f"Transcribed with Google: {text}")
        except sr.RequestError as e:
            logger.warning(f"Google recognition request error: {e}")
            # Fallback to Sphinx (offline)
            try:
                text = recognizer.recognize_sphinx(audio)
                logger.info(f"Transcribed with Sphinx: {text}")
            except Exception as sphinx_error:
                logger.error(f"Sphinx recognition error: {str(sphinx_error)}")
                raise Exception("Unable to transcribe audio with any available service. Please try again with clearer audio.")
        except sr.UnknownValueError:
            raise Exception("Speech could not be understood. Please try again with clearer audio.")
                
        return text
    except Exception as e:
        if "format" in str(e).lower():
            # Format-related error
            raise Exception(f"Audio format error: {str(e)}. Try recording with a different microphone or browser.")
        else:
            # Other transcription error
            logger.error(f"Error transcribing audio: {str(e)}")
            raise Exception(f"Transcription error: {str(e)}")

@app.post("/analyze_sentiment", response_model=SentimentResponse)
async def analyze_sentiment(file: UploadFile = File(...)):
    """
    Analyze sentiment from audio file
    """
    try:
        logger.info(f"Received audio file: {file.filename}")
        audio_data = await file.read()
        
        if not audio_data:
            raise HTTPException(status_code=400, detail="Empty audio file")
        
        file_size = len(audio_data)
        logger.info(f"Audio file size: {file_size} bytes")
        
        if file_size < 100:  # Arbitrary small size check
            raise HTTPException(status_code=400, detail="Audio file is too small or empty")
            
        # Step 1: Transcribe audio to text
        try:
            text = transcribe_audio(audio_data)
        except Exception as transcription_error:
            logger.error(f"Transcription failed: {str(transcription_error)}")
            raise HTTPException(status_code=400, detail=str(transcription_error))
        
        if not text:
            raise HTTPException(status_code=400, detail="Could not transcribe audio - no speech detected")
            
        logger.info(f"Transcribed text: {text}")
        
        # Step 2: Analyze sentiment
        sentiment_result = analyze_text_sentiment(text)
        
        # Step 3: Return response
        return {
            "transcription": text,
            "sentiment": sentiment_result["sentiment"],
            "polarity": sentiment_result["polarity"]
        }

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Error in sentiment analysis endpoint: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)