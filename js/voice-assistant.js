/**
 * EchoAssist Voice Assistant
 * This script handles the voice interaction functionality for the EchoAssist demo
 */

class VoiceAssistant {
    constructor() {
        // DOM Elements
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        this.assistantMessage = document.getElementById('assistant-message');
        this.assistantAvatar = document.getElementById('assistant-avatar');
        this.voiceSelect = document.getElementById('voice-select');
        this.rateSlider = document.getElementById('rate-slider');
        this.rateValue = document.getElementById('rate-value');
        this.pitchSlider = document.getElementById('pitch-slider');
        this.pitchValue = document.getElementById('pitch-value');
        this.avatarWaves = document.querySelector('.avatar-waves');
        
        // Floating Voice Assistant Elements
        this.floatingMicBtn = document.getElementById('floating-mic-button');
        this.floatingMessage = document.getElementById('floating-message');
        
        this.nluUrl = 'http://localhost:5000/api/nlu';
        
        // Speech Recognition
        this.recognition = null;
        this.isListening = false;
        
        // Speech Synthesis
        this.synth = window.speechSynthesis;
        this.voices = [];
        
        // Auto-greeting flag
        this.hasGreeted = false;
        
        // NLP Response System
        this.responses = {
            greeting: [
                "Hello! I'm EchoAssist. How can I help you today?",
                "Hi there! I'm your voice assistant. What would you like to know?",
                "Welcome to EchoAssist! I'm here to answer your questions."
            ],
            features: [
                "EchoAssist offers enhanced accessibility, intelligent responses, customizable voices, and easy integration with any website.",
                "Our features include natural language processing, high-quality text-to-speech, multiple voice options, and seamless website integration.",
                "EchoAssist can make your website more accessible, provide intelligent responses to user queries, and offer a personalized experience with customizable voices."
            ],
            integration: [
                "Integrating EchoAssist with your website is simple. Just add our JavaScript library to your site, configure your preferences, and you're ready to go!",
                "You can integrate EchoAssist by including our script in your HTML, customizing the settings, and initializing the assistant. We also offer API options for more advanced integrations.",
                "To add EchoAssist to your website, you'll need to include our script tag, set up your configuration options, and initialize the assistant. Our documentation provides step-by-step instructions."
            ],
            accessibility: [
                "EchoAssist enhances accessibility by providing voice interaction for users with visual impairments, offering customizable speech rates and pitches, and supporting screen readers.",
                "Our accessibility features include voice commands, high-contrast mode, text size adjustments, and compatibility with assistive technologies.",
                "We prioritize accessibility with features like voice navigation, keyboard shortcuts, screen reader support, and customizable text-to-speech options."
            ],
            pricing: [
                "We offer three pricing plans: Starter at $29 per month, Professional at $79 per month, and Enterprise with custom pricing. Each plan includes different voice options and query limits.",
                "Our pricing starts at $29 monthly for the Starter plan with basic features, $79 for the Professional plan with advanced features, and custom pricing for Enterprise with unlimited options.",
                "EchoAssist pricing plans include Starter, Professional, and Enterprise tiers, with increasing features and capabilities at each level. Contact us for detailed pricing information."
            ],
            fallback: [
                "I'm sorry, I didn't quite understand that. Could you rephrase your question?",
                "I'm not sure I have information about that. Is there something else I can help you with?",
                "I don't have an answer for that specific question. Would you like to know about our features, integration, accessibility, or pricing?"
            ]
        };

        this.jobs = {
            cs: [
                'Software Engineer',
                'Data Scientist',
                'Machine Learning Engineer'
            ],
            it: [
                'IT Support Specialist',
                'Network Administrator',
                'System Analyst'
            ],
            sales: [
                'Sales Representative',
                'Account Manager',
                'Business Development Executive'
            ]
            };
        
        // Initialize
        this.init();
    }
    
    init() {
        // Check browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            this.updateAssistantMessage('Sorry, your browser doesn\'t support speech recognition. Try using Chrome, Edge, or Safari.');
            this.startBtn.disabled = true;
            return;
        }
        
        // Initialize Speech Recognition
        this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load voices
        this.loadVoices();
        
        // Welcome message for demo section
        setTimeout(() => {
            if (this.assistantMessage) {
                this.assistantMessage.innerHTML = `<p>${this.getRandomResponse('greeting')}</p>`;
            }
        }, 1000);
        
        // Check if browser supports the Permissions API
        if (navigator.permissions && navigator.permissions.query) {
            this.checkMicrophonePermission();
        }
    }
    
    // Check microphone permission status
    checkMicrophonePermission() {
        navigator.permissions.query({ name: 'microphone' })
            .then(permissionStatus => {
                console.log('Microphone permission status:', permissionStatus.state);
                
                // Listen for changes to permission state
                permissionStatus.onchange = () => {
                    console.log('Microphone permission status changed to:', permissionStatus.state);
                    if (permissionStatus.state === 'granted') {
                        // If permission is granted after a change, trigger auto-greeting
                        this.autoGreeting();
                    }
                };
                
                // If permission is already granted, we can auto-greet
                if (permissionStatus.state === 'granted') {
                    // Delay auto-greeting to ensure page has loaded
                    setTimeout(() => {
                        this.autoGreeting();
                    }, 2000);
                }
            })
            .catch(error => {
                console.error('Error checking microphone permission:', error);
            });
    }
    
    setupEventListeners() {
        // Start listening - demo section button
        this.startBtn.addEventListener('click', () => {
            this.startListening('demo');
        });
        
        // Stop listening - demo section button
        this.stopBtn.addEventListener('click', () => {
            this.stopListening('demo');
        });
        
        // Floating microphone button
        this.floatingMicBtn.addEventListener('click', () => {
            if (this.isListening) {
                this.stopListening('floating');
            } else {
                this.startListening('floating');
            }
        });
        
        // Speech recognition results
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript.trim();
            this.processUserInput(transcript);
        };
        
        // Speech recognition end
        this.recognition.onend = () => {
            if (this.isListening) {
                this.stopListening();
            }
        };
        
        // Speech recognition error
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.updateAssistantMessage(`Error: ${event.error}. Please try again.`);
            this.stopListening();
        };
        
        // Voice selection
        this.voiceSelect.addEventListener('change', () => {
            // No immediate action needed, the selected voice will be used in the next speak() call
        });
        
        // Rate slider
        this.rateSlider.addEventListener('input', () => {
            this.rateValue.textContent = this.rateSlider.value;
        });
        
        // Pitch slider
        this.pitchSlider.addEventListener('input', () => {
            this.pitchValue.textContent = this.pitchSlider.value;
        });
        
        // Sample questions
        document.querySelectorAll('.sample-questions li').forEach(item => {
            item.addEventListener('click', () => {
                const question = item.textContent.trim();
                this.updateAssistantMessage(`<em>You asked:</em> "${question}"`);
                this.processUserInput(question);
            });
        });
        
        // Voice changed event
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = this.loadVoices.bind(this);
        }
        
        // Auto-greeting when page loads
        window.addEventListener('load', () => {
            setTimeout(() => {
                this.autoGreeting();
            }, 2000);
        });
    }
    
    // Helper method to update message in both demo and floating UI
    updateAssistantMessage(message) {
        if (this.assistantMessage) {
            this.assistantMessage.innerHTML = `<p>${message}</p>`;
        }
        if (this.floatingMessage) {
            this.floatingMessage.innerHTML = `<p>${message}</p>`;
        }
    }
    
    loadVoices() {
        // Get available voices
        this.voices = this.synth.getVoices();
        
        // Clear select options
        this.voiceSelect.innerHTML = '';
        
        // Add default option
        const defaultOption = document.createElement('option');
        defaultOption.textContent = 'Default';
        defaultOption.value = 'default';
        this.voiceSelect.appendChild(defaultOption);
        
        // Add available voices
        this.voices.forEach((voice, index) => {
            const option = document.createElement('option');
            option.textContent = `${voice.name} (${voice.lang})`;
            option.value = index;
            this.voiceSelect.appendChild(option);
            
            // Select a good default English voice if available
            if (voice.name.includes('Google') && voice.lang.includes('en-')) {
                this.voiceSelect.value = index;
            }
        });
    }
    
    startListening(source = 'demo') {
        if (this.isListening) return;
        
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Update UI
        this.isListening = true;
        
        if (source === 'demo') {
            // Update demo UI
            this.startBtn.disabled = true;
            this.stopBtn.disabled = false;
            this.assistantMessage.innerHTML = '<p>Listening... Speak now.</p>';
            this.avatarWaves.classList.add('active');
        }
        
        // Update floating UI
        this.floatingMicBtn.classList.add('listening');
        this.floatingMessage.classList.add('active');
        this.floatingMessage.innerHTML = '<p>Listening... Speak now.</p>';
        
        // Start recognition
        try {
            this.recognition.start();
        } catch (error) {
            console.error('Recognition start error:', error);
            this.stopListening(source);
        }
    }
    
    stopListening(source = 'demo') {
        // Update UI
        this.isListening = false;
        
        if (source === 'demo') {
            // Update demo UI
            this.startBtn.disabled = false;
            this.stopBtn.disabled = true;
            this.avatarWaves.classList.remove('active');
        }
        
        // Update floating UI
        this.floatingMicBtn.classList.remove('listening');
        
        // Stop recognition
        try {
            this.recognition.stop();
        } catch (error) {
            console.error('Recognition stop error:', error);
        }
    }
    
    // Auto-greeting when page loads
    autoGreeting() {
        if (this.hasGreeted) return;
        
        this.hasGreeted = true;
        this.floatingMessage.classList.add('active');
        
        const greeting = "Hello! I'm EchoAssist. Click the microphone or say 'Hey Echo' to ask me something.";
        this.floatingMessage.innerHTML = `<p>${greeting}</p>`;
        this.speak(greeting);
        
        // Hide message after a few seconds
        setTimeout(() => {
            this.floatingMessage.classList.remove('active');
        }, 8000);
    }
    
    async processUserInput(input) {
    // 1) immediately show what user said
    this.updateAssistantMessage(`You said: "${input}"`);

    // 2) first try old navigation logic
    if ( this.processNavigationCommand(input) ) return;

    // 3) call NLU service
    let nlu;
    try {
        const res = await fetch(this.nluUrl, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ input })
        });
        nlu = await res.json();
    } catch (err) {
        console.error("NLU call failed:", err);
        // fallback to legacy
        return this._fallbackResponse(input);
    }

    const { intent, entities, reply } = nlu;

    // 4) handle structured intents
    if (intent === 'navigate' && entities.page) {
        return this.navigateToSection(entities.page);
    }
    if (intent === 'query_jobs' && entities.category) {
        const list = this.jobs[entities.category] || [];
        return this.speak(`${entities.category.toUpperCase()} roles: ${list.join(', ')}`);
    }
    if (intent === 'smalltalk' && reply) {
        return this.speak(reply);
    }

    // 5) everything else -> legacy generateResponse
    this._fallbackResponse(input);
    }

    // helper to encapsulate old generateResponse path
    _fallbackResponse(input) {
    const resp = this.generateResponse(input);
    this.updateAssistantMessage(resp);
    this.speak(resp);
    }

    
    // Process navigation commands
    processNavigationCommand(input) {
        input = input.toLowerCase();
        
        // Navigation commands
        if (this.containsAny(input, ['take me to pricing', 'go to pricing', 'show pricing', 'pricing section'])) {
            this.navigateToSection('pricing');
            return true;
        } else if (this.containsAny(input, ['take me to features', 'go to features', 'show features', 'features section'])) {
            this.navigateToSection('features');
            return true;
        } else if (this.containsAny(input, ['take me to demo', 'go to demo', 'show demo', 'demo section'])) {
            this.navigateToSection('demo');
            return true;
        } else if (this.containsAny(input, ['take me to contact', 'go to contact', 'show contact', 'contact section'])) {
            this.navigateToSection('contact');
            return true;
        } else if (this.containsAny(input, ['take me to top', 'go to top', 'scroll to top', 'back to top'])) {
            this.scrollToPosition('top');
            return true;
        } else if (this.containsAny(input, ['take me to bottom', 'go to bottom', 'scroll to bottom'])) {
            this.scrollToPosition('bottom');
            return true;
        }
        
        
        return false; // No navigation command found
    }
    
    // Navigate to a specific section
    navigateToSection(sectionId) {
        const section = document.getElementById(sectionId);
        if (section) {
            const response = `Navigating to the ${sectionId} section.`;
            this.updateAssistantMessage(response);
            this.speak(response);
            
            // Smooth scroll to section
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            const response = `I couldn't find the ${sectionId} section.`;
            this.updateAssistantMessage(response);
            this.speak(response);
        }
    }
    
    // Scroll to top or bottom
    scrollToPosition(position) {
        let response = '';
        
        if (position === 'top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            response = 'Scrolling to the top of the page.';
        } else if (position === 'bottom') {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
            response = 'Scrolling to the bottom of the page.';
        }
        
        this.updateAssistantMessage(response);
        this.speak(response);
    }
    
    generateResponse(input) {
        input = input.toLowerCase();
        
        // Check for different types of queries
        if (this.containsAny(input, ['hello', 'hi', 'hey', 'greetings'])) {
            return this.getRandomResponse('greeting');
        } else if (this.containsAny(input, ['feature', 'offer', 'provide', 'what can you do', 'what does echo', 'what does it do'])) {
            return this.getRandomResponse('features');
        } else if (this.containsAny(input, ['integrate', 'integration', 'add to', 'implement', 'website', 'install'])) {
            return this.getRandomResponse('integration');
        } else if (this.containsAny(input, ['accessibility', 'accessible', 'disability', 'impairment', 'screen reader'])) {
            return this.getRandomResponse('accessibility');
        } else if (this.containsAny(input, ['price', 'pricing', 'cost', 'plan', 'subscription', 'pay'])) {
            return this.getRandomResponse('pricing');
        } else {
            return this.getRandomResponse('fallback');
        }
    }
    
    containsAny(text, keywords) {
        return keywords.some(keyword => text.includes(keyword));
    }
    
    getRandomResponse(category) {
        const responses = this.responses[category] || this.responses.fallback;
        const randomIndex = Math.floor(Math.random() * responses.length);
        return responses[randomIndex];
    }
    
    speak(text) {
        // Cancel any ongoing speech
        this.synth.cancel();
        
        // Create utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice
        const voiceIndex = this.voiceSelect.value;
        if (voiceIndex !== 'default' && this.voices[voiceIndex]) {
            utterance.voice = this.voices[voiceIndex];
        }
        
        // Set rate and pitch
        utterance.rate = parseFloat(this.rateSlider.value);
        utterance.pitch = parseFloat(this.pitchSlider.value);
        
        // Speak
        this.synth.speak(utterance);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create voice assistant instance
    const assistant = new VoiceAssistant();
});
