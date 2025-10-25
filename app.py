from flask import Flask, redirect, request, url_for, flash, get_flashed_messages, render_template, jsonify
import os
import requests
from dotenv import load_dotenv
import anthropic

load_dotenv()  

app = Flask(__name__, static_folder='static')

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
@app.route('/')
def index():
    return render_template('index.html')


@app.route('/ask_claude', methods=['POST'])
def ask_claude():
    data = request.json
    user_prompt = data.get('prompt', '')
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            timeout=60.0  # Add 60 second timeout (default is 10s)
        )
        
        response_text = message.content[0].text
        
        return jsonify({
            "success": True,
            "response": response_text
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


@app.route("/dream_analysis")
def dream_analysis(x):
    return x







if __name__ == "__main__":
    app.run(debug=True)