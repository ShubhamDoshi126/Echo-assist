import os
import tempfile
import time
import uuid
from typing import Dict, List, Optional

import google.generativeai as genai
import streamlit as st
from dotenv import load_dotenv
from gtts import gTTS
import speech_recognition as sr
import io
import base64

# Load environment variables
load_dotenv()

# Configure page
st.set_page_config(
    page_title="Voice Agent - Gemini LLM",
    page_icon="🎙️",
    layout="wide"
)

# Application styles
st.markdown("""
<style>
    .chat-message {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
    }
    .user-message {
        background-color: #f0f2f6;
        border-left: 4px solid #ff6b6b;
    }
    .assistant-message {
        background-color: #e8f5e9;
        border-left: 4px solid #4caf50;
    }
    .voice-controls {
        background-color: #f8f9fa;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #dee2e6;
    }
    .footer {
        text-align: center;
        padding: 2rem;
        background-color: #f8f9fa;
        border-radius: 0.5rem;
        margin-top: 2rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if 'history' not in st.session_state:
    st.session_state.history = []
if 'audio_file_counter' not in st.session_state:
    st.session_state.audio_file_counter = 0
if 'gemini_api_key' not in st.session_state:
    st.session_state.gemini_api_key = None

# Main title
st.title("🎙️ Voice Agent with Gemini LLM")
st.markdown("""
    This application demonstrates a voice-enabled AI assistant powered by Google's Gemini LLM.
    Speak to the assistant and receive voice responses.
""")

# API Key input
with st.sidebar:
    st.header("Configuration")
    api_key = st.text_input("Enter Gemini API Key:", type="password", 
                            help="Get your API key from Google AI Studio")
    
    if api_key:
        st.session_state.gemini_api_key = api_key
        try:
            # Configure the Gemini API with the provided key
            genai.configure(api_key=api_key)
            st.success("✅ API Key configured successfully!")
        except Exception as e:
            st.error(f"❌ Error configuring API: {str(e)}")
    
    # Voice settings
    st.subheader("Voice Settings")
    language_options = {
        "English (US)": "en",
        "English (UK)": "en-uk",
        "Spanish": "es",
        "French": "fr",
        "German": "de",
        "Italian": "it",
        "Japanese": "ja",
        "Korean": "ko",
        "Portuguese": "pt",
        "Russian": "ru",
        "Chinese": "zh-CN"
    }
    selected_language = st.selectbox("Assistant Voice Language", 
                                    options=list(language_options.keys()),
                                    index=0)
    
    voice_speed = st.slider("Voice Speed", min_value=0.5, max_value=1.5, value=1.0, step=0.1)
    
    # Persona settings
    st.subheader("Persona Settings")
    persona_options = [
        "Professional Assistant",
        "Friendly Helper",
        "Technical Expert",
        "Creative Companion",
        "Educational Tutor"
    ]
    selected_persona = st.selectbox("Assistant Persona", options=persona_options, index=0)
    
    # Context window size
    context_size = st.slider("Conversation History Size", 1, 10, 5, 
                           help="Number of past exchanges to remember")
    
    if st.button("Clear Conversation"):
        st.session_state.history = []
        st.success("Conversation history cleared!")

# Function to generate response from Gemini
def get_gemini_response(user_input: str, history: List[Dict], persona: str) -> str:
    try:
        if not st.session_state.gemini_api_key:
            return "Please enter a valid Gemini API key in the sidebar."
        
        # Create the model
        model = genai.GenerativeModel('gemini-pro')
        
        # Build the prompt with history and persona
        persona_descriptions = {
            "Professional Assistant": "You are a professional assistant. Provide clear, concise, and formal responses.",
            "Friendly Helper": "You are a friendly and approachable helper. Use casual language and be encouraging.",
            "Technical Expert": "You are a technical expert. Provide detailed technical information and explanations.",
            "Creative Companion": "You are a creative companion. Think outside the box and provide imaginative responses.",
            "Educational Tutor": "You are an educational tutor. Explain concepts clearly and thoroughly for learning."
        }
        
        persona_prompt = persona_descriptions.get(persona, persona_descriptions["Professional Assistant"])
        
        # Build conversation context
        conversation_context = ""
        if history:
            conversation_context = "\n\nPrevious conversation:\n"
            for item in history[-context_size*2:]:  # Get last few exchanges
                if item["role"] == "user":
                    conversation_context += f"User: {item['content']}\n"
                else:
                    conversation_context += f"Assistant: {item['content']}\n"
        
        # Create the full prompt
        full_prompt = f"{persona_prompt}{conversation_context}\n\nUser: {user_input}\nAssistant:"
        
        # Generate response
        response = model.generate_content(full_prompt)
        
        return response.text
    except Exception as e:
        return f"Error generating response: {str(e)}"

# Function to convert text to speech
def text_to_speech(text: str, language: str, speed: float) -> Optional[str]:
    try:
        # Create TTS object
        tts = gTTS(text=text, lang=language_options.get(language, "en"), slow=(speed < 1.0))
        
        # Save to a bytes buffer instead of a file
        audio_buffer = io.BytesIO()
        tts.write_to_fp(audio_buffer)
        audio_buffer.seek(0)
        
        # Convert to base64 for embedding in HTML
        audio_base64 = base64.b64encode(audio_buffer.read()).decode()
        
        return audio_base64
    except Exception as e:
        st.error(f"Error converting text to speech: {str(e)}")
        return None

# Function to transcribe audio from microphone
def speech_to_text() -> Optional[str]:
    r = sr.Recognizer()
    try:
        with sr.Microphone() as source:
            st.info("🎤 Listening... Please speak now.")
            # Adjust for ambient noise
            r.adjust_for_ambient_noise(source, duration=1)
            # Listen for audio with timeout
            audio = r.listen(source, timeout=5, phrase_time_limit=10)
            st.info("🔄 Processing your speech...")
        
        # Recognize speech using Google Speech Recognition
        text = r.recognize_google(audio)
        return text
    except sr.WaitTimeoutError:
        st.error("⏰ No speech detected. Please try again.")
        return None
    except sr.UnknownValueError:
        st.error("❓ Could not understand audio. Please try again.")
        return None
    except sr.RequestError as e:
        st.error(f"❌ Speech recognition error: {e}")
        return None
    except Exception as e:
        st.error(f"❌ Microphone error: {e}")
        return None

# Function to create audio player HTML
def create_audio_player(audio_base64: str) -> str:
    return f"""
    <audio controls style="width: 100%;">
        <source src="data:audio/mp3;base64,{audio_base64}" type="audio/mp3">
        Your browser does not support the audio element.
    </audio>
    """

# Main interaction area
col1, col2 = st.columns([2, 1])

with col1:
    st.subheader("💬 Conversation")
    
    # Display conversation history
    if st.session_state.history:
        for i, message in enumerate(st.session_state.history):
            if message["role"] == "user":
                st.markdown(f"""
                <div class="chat-message user-message">
                    <strong>You:</strong> {message['content']}
                </div>
                """, unsafe_allow_html=True)
            else:
                st.markdown(f"""
                <div class="chat-message assistant-message">
                    <strong>Assistant:</strong> {message['content']}
                </div>
                """, unsafe_allow_html=True)
                if 'audio_base64' in message and message['audio_base64']:
                    st.markdown(create_audio_player(message['audio_base64']), unsafe_allow_html=True)
    else:
        st.info("👋 Start a conversation by clicking the voice button or typing a message!")

with col2:
    st.subheader("🎛️ Voice Controls")
    
    with st.container():
        st.markdown('<div class="voice-controls">', unsafe_allow_html=True)
        
        # Check if API key is configured
        if not st.session_state.gemini_api_key:
            st.warning("⚠️ Please enter your Gemini API key in the sidebar to continue.")
        else:
            # Voice input button
            if st.button("🎤 Start Voice Input", key="start_recording", use_container_width=True):
                with st.spinner("🎧 Listening..."):
                    user_input = speech_to_text()
                    
                    if user_input:
                        st.success(f"✅ You said: {user_input}")
                        
                        # Add user message to history
                        st.session_state.history.append({
                            "role": "user",
                            "content": user_input
                        })
                        
                        # Generate response
                        with st.spinner("🤖 Generating response..."):
                            response = get_gemini_response(
                                user_input, 
                                st.session_state.history,
                                selected_persona
                            )
                        
                        # Generate audio for response
                        with st.spinner("🔊 Converting to speech..."):
                            audio_base64 = text_to_speech(
                                response, 
                                selected_language,
                                voice_speed
                            )
                        
                        # Add assistant response to history
                        st.session_state.history.append({
                            "role": "assistant",
                            "content": response,
                            "audio_base64": audio_base64
                        })
                        
                        # Rerun to update the UI
                        st.rerun()
        
        st.markdown("---")
        
        # Text input as an alternative to voice
        st.markdown("#### ✍️ Text Input")
        user_text_input = st.text_area("Type your message:", height=100, key="text_input")
        
        if st.button("📤 Send Message", use_container_width=True):
            if user_text_input and st.session_state.gemini_api_key:
                # Add user message to history
                st.session_state.history.append({
                    "role": "user",
                    "content": user_text_input
                })
                
                # Generate response
                with st.spinner("🤖 Generating response..."):
                    response = get_gemini_response(
                        user_text_input, 
                        st.session_state.history,
                        selected_persona
                    )
                
                # Generate audio for response
                with st.spinner("🔊 Converting to speech..."):
                    audio_base64 = text_to_speech(
                        response, 
                        selected_language,
                        voice_speed
                    )
                
                # Add assistant response to history
                st.session_state.history.append({
                    "role": "assistant",
                    "content": response,
                    "audio_base64": audio_base64
                })
                
                # Clear the text input
                st.session_state.text_input = ""
                
                # Rerun to update the UI
                st.rerun()
            elif not user_text_input:
                st.warning("⚠️ Please enter a message!")
            elif not st.session_state.gemini_api_key:
                st.warning("⚠️ Please enter your Gemini API key first!")
        
        st.markdown('</div>', unsafe_allow_html=True)

# Footer section
st.markdown("---")
st.markdown("""
<div class="footer">
    <h3>🎙️ Voice Agent with Gemini LLM Integration</h3>
    <p>Built with Streamlit, Google Gemini API, and open-source speech technologies</p>
    <p><em>Speak naturally and get intelligent voice responses powered by AI</em></p>
</div>
""", unsafe_allow_html=True)

# Display usage instructions
with st.expander("📋 Usage Instructions"):
    st.markdown("""
    ### How to use this Voice Agent:
    
    1. **Setup**: Enter your Gemini API key in the sidebar (get one from [Google AI Studio](https://makersuite.google.com/app/apikey))
    
    2. **Voice Input**: Click the "🎤 Start Voice Input" button and speak clearly
    
    3. **Text Input**: Alternatively, type your message in the text area and click "Send Message"
    
    4. **Customization**: 
       - Choose your preferred voice language and speed
       - Select an assistant persona that matches your needs
       - Adjust the conversation history size
    
    5. **Audio Playback**: Listen to the assistant's responses using the audio controls
    
    ### Tips for best results:
    - Speak clearly and at a moderate pace
    - Ensure your microphone is working properly
    - Use a quiet environment for better speech recognition
    - The assistant remembers recent conversation context
    """)

# Error handling and status indicators
if st.session_state.gemini_api_key:
    st.sidebar.success("🟢 Ready to chat!")
else:
    st.sidebar.error("🔴 API key required")

# Add some debug information in development mode
if st.sidebar.checkbox("Show Debug Info"):
    st.sidebar.markdown("### Debug Information")
    st.sidebar.write(f"History length: {len(st.session_state.history)}")
    st.sidebar.write(f"Audio counter: {st.session_state.audio_file_counter}")
    st.sidebar.write(f"API configured: {'Yes' if st.session_state.gemini_api_key else 'No'}")