from flask import Flask, redirect, request, url_for, flash, get_flashed_messages, render_template, jsonify
import os
#import requests
from dotenv import load_dotenv
import anthropic
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
        message = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=500,
            messages=[
                {
                    "role": "user",
                    "content": story_prompt
                }
            ],
            timeout=60.0  # Adding a 60 second timeout because wifi sucks
        )
        story_text = message.content[0].text
        fish_response = requests.post(
            'https://api.fish.audio/v1/tts',
            headers={
                'Authorization': f'Bearer {FISH_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'text': story_text,
                #'reference_id': 'x', 
                'format': 'mp3',
                'normalize': True,
                'latency': 'normal'
            },
            timeout=30.0
        )
        
        if fish_response.status_code == 200:
            audio_data = fish_response.json()
            
            audio_url = (audio_data.get('audio') or 
                        audio_data.get('url') or 
                        audio_data.get('audio_url') or
                        audio_data.get('file'))
            
            if audio_url:
                return jsonify({
                    "success": True,
                    "story": story_text,
                    "audio_url": audio_url
                })
            else:
                # Return story without audio if Fish fails
                return jsonify({
                    "success": True,
                    "story": story_text,
                    "audio_url": None,
                    "message": "Story generated, but audio generation failed. You can still read the story!"
                })
        else:
            # Return story even if Fish Audio fails
            return jsonify({
                "success": True,
                "story": story_text,
                "audio_url": None,
                "message": f"Story generated! (Audio generation failed: {fish_response.status_code})"
            })
            
    except Exception as e:
        print(f"Error: {str(e)}")
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
    port = int(os.environ.get("PORT", 5000))
    app.run(host='0.0.0.0', port=port, debug=False)