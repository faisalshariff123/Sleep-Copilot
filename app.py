from flask import Flask, redirect, request, url_for, flash, get_flashed_messages, render_template, jsonify
import os
import requests
from dotenv import load_dotenv

load_dotenv()  

app = Flask(__name__, static_folder='static')

CLAUDE_API_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_KEY = os.getenv("CLAUDE_API_KEY")  

@app.route("/ask_claude", methods=["POST"])
def ask_claude():
    data = request.json
    prompt = data.get("prompt", "")
    
    headers = {
        "x-api-key": CLAUDE_KEY,
        "anthropic-version": "2023-06-01", 
        "content-type": "application/json",
    }
    body = {
        "model": "claude-3-haiku-20240307", 
        "max_tokens": 256,
        "messages": [{"role": "user", "content": prompt}]
    }
    response = requests.post(CLAUDE_API_URL, headers=headers, json=body)
    return jsonify(response.json())

@app.route("/")
def dream_analysis(x):
    return x







if __name__ == "__main__":
    app.run(debug=True)