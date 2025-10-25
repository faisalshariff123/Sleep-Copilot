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
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            timeout=60.0  # Adding a 60 second timeout because wifi sucks
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


@app.route("/dream_analysis", methods=['POST'])  
def dream_analysis():
    data = request.json  
    dream_text = data.get('dream', '')  
    
    if not dream_text:
        return jsonify({
            "success": False,
            "error": "No dream text provided"
        }), 400
    
    prompt = f"Analyze the following dream: {dream_text}. Provide insights into its possible meanings and symbolism."
    
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=1000,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            timeout=60.0
        )
        
        analysis = message.content[0].text
        
        return jsonify({
            "success": True,
            "analysis": analysis
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500







if __name__ == "__main__":
    app.run(debug=True)