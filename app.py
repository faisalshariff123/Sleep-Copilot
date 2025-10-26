from flask import Flask, redirect, request, url_for, flash, get_flashed_messages, render_template, jsonify
import os
import requests
from dotenv import load_dotenv
import anthropic
import base64
# from fish_audio_sdk import Session, TTSRequest

load_dotenv()  

app = Flask(__name__, static_folder='static')

FISH_KEY = os.getenv("FISH_API_KEY")
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
@app.route('/')
def index():
    return render_template('index.html', ) # maek sure index is in templates folder
@app.route('/generate_bedtime_story', methods=['POST'])
def generate_bedtime_story():
    data = request.json
    theme = data.get('theme', 'peaceful night sky')

    story_prompt = f"""Write a calming 2-minute bedtime story about {theme}. 
    Make it soothing, gentle, and perfect for falling asleep to. 
    Use slow pacing, peaceful imagery, and a tranquil tone.
    End with a peaceful resolution that encourages sleep.
    Keep it under 250 words. Plain text only, no markdown."""

    try:
        # Step 1: Generate story with Claude
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            messages=[{"role": "user", "content": story_prompt}],
            timeout=60.0
        )
        
        story_text = message.content[0].text
        print(f"✅ Story generated")
        
        # Step 2: Call Fish Audio REST API
        try:
            fish_response = requests.post(
                'https://api.fish.audio/v1/tts',
                headers={
                    'Authorization': f'Bearer {FISH_KEY}',
                    'Content-Type': 'application/json'
                },
                json={
                    'text': story_text,
                    'format': 'mp3'
                },
                timeout=30.0
            )
            
            print(f"🐟 Fish Response Status: {fish_response.status_code}")
            print(f"🐟 Fish Response Headers: {dict(fish_response.headers)}")
            
            if fish_response.status_code == 200:
                # Check if response is JSON or binary audio
                content_type = fish_response.headers.get('Content-Type', '')
                
                if 'application/json' in content_type:
                    # Response is JSON with URL
                    audio_data = fish_response.json()
                    audio_url = audio_data.get('audio') or audio_data.get('url')
                    print(f"✅ Got audio URL: {audio_url}")
                    
                    return jsonify({
                        "success": True,
                        "story": story_text,
                        "audio_url": audio_url
                    })
                elif 'audio' in content_type:
                    # Response is direct audio binary
                    # Save to static folder
                    import uuid
                    filename = f"story_{uuid.uuid4().hex[:8]}.mp3"
                    filepath = os.path.join('static', filename)
                    
                    with open(filepath, 'wb') as f:
                        f.write(fish_response.content)
                    
                    print(f"✅ Audio saved to {filename}")
                    
                    return jsonify({
                        "success": True,
                        "story": story_text,
                        "audio_url": f"/static/{filename}"
                    })
                else:
                    print(f"❌ Unknown content type: {content_type}")
                    print(f"Response preview: {fish_response.text[:200]}")
            else:
                print(f"❌ Fish API error: {fish_response.text}")
                
        except Exception as fish_error:
            print(f"❌ Fish Audio error: {fish_error}")
        
        # Return story without audio if Fish fails
        return jsonify({
            "success": True,
            "story": story_text,
            "audio_url": None,
            "message": "Story generated! (Audio feature temporarily unavailable)"
        })
            
    except Exception as e:
        print(f"💥 ERROR: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

    


@app.route('/sleep_tips', methods=['POST'])
def sleep_tips():
    data = request.json
    # sleep_data = data.get('sleep_data', '')
    prompt = f"Provide 1 personalized tip to improve sleep quality. Keep each tip under 20 words. Do not use any markdown formatting like # or ** - just plain text."
    try:
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=200,
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            timeout=60.0  # Adding a 60 second timeout because wifi sucks
        )
        tips = message.content[0].text
        return jsonify({
            "success": True,
            "tips": tips
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500


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
            "error": "No dream provided "
        }), 400
    
    prompt = f"Analyze the following dream: {dream_text}. Provide insights into its possible meanings and symbolism. Keep it under 30 words."
    
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


"""@app.route('/test-static') #debug
def test_static():
    import os
    static_path = os.path.join(app.root_path, 'static')
    return f"Static folder exists: {os.path.exists(static_path)}<br>Contents: {os.listdir(static_path) if os.path.exists(static_path) else 'N/A'}"
"""



if __name__ == "__main__":
    """port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)"""
    app.run(debug=True)