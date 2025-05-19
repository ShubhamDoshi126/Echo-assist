# server_nlu.py
from flask import Flask, request, jsonify
from flask_cors import CORS
from transformers import pipeline


app = Flask(__name__)
CORS(app)

# 1) Zero-shot intent classifier
intent_classifier = pipeline(
    "zero-shot-classification",
    model="facebook/bart-large-mnli"
)

# 2) Named-entity recognition
ner = pipeline(
    "ner",
    model="dslim/bert-base-NER",
    aggregation_strategy="simple"
)

# 3) Use text-generation instead of conversational
smalltalk_model = pipeline(
    "text-generation",
    model="gpt2"  # Using a simpler model that should be available
)

@app.route("/api/nlu", methods=["POST"])
def nlu():
    text = request.json.get("input", "")
    # 1. Intent classification
    candidate_intents = ["navigate", "query_jobs", "ask_info", "smalltalk"]
    intent_res = intent_classifier(text, candidate_labels=candidate_intents)
    intent = intent_res["labels"][0]  # top intent

    # 2. Entity extraction
    entities = {}
    for ent in ner(text):
        if ent["entity_group"] in ("ORG","LOC","MISC","PER"): 
            # ignore; focus on JOBS / PAGES via keyword
            continue
        # simple heuristic: look for our page names or job categories
        if ent["word"].lower() in ("home","about","contact","careers"):
            entities["page"] = ent["word"].lower()
        if ent["word"].lower() in ("cs","it","sales"):
            entities["category"] = ent["word"].lower()

    # 3. Build a structured response
    response = {"intent": intent, "entities": entities}

    # 4. If fallback smalltalk, use text generation as a simpler alternative
    if intent == "smalltalk":
        # Simple responses for common smalltalk
        if "hello" in text.lower() or "hi" in text.lower():
            response["reply"] = "Hello! How can I help you today?"
        elif "how are you" in text.lower():
            response["reply"] = "I'm doing well, thank you for asking! How can I assist you?"
        elif "thank" in text.lower():
            response["reply"] = "You're welcome! Is there anything else I can help with?"
        else:
            # Use text generation for other cases
            generated = smalltalk_model(text, max_length=50, num_return_sequences=1)
            response["reply"] = generated[0]['generated_text'].split("\n")[0]  # Take first sentence

    return jsonify(response)

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)