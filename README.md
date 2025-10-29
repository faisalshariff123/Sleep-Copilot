# Sleep Copilot

**Sleep Copilot** is a retro-themed AI-powered sleep assistant web application. It tracks sleep patterns (using device sensors), analyzes dreams, offers personalized sleep tips, and generates narrated bedtime stories using Claude AI and Fish Audio.
https://sleep-copilot.onrender.com
## Features

- **Sleep Tracking:** Monitor your sleep using device microphone and motion sensors and plays calming white noise to help you sleep better.
- **Dream Analysis:** Get instant AI-powered interpretations of your dreams.
- **Sleep Tips:** Receive concise personalized advice for better sleep.
- **AI Bedtime Stories:** Generate calming bedtime stories, optionally with synthesized narration.
- **Pixel Art UI:** Created my own distinctive pixel-styled retro design.

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Flask (Python)
- **AI Integration:** Claude API, Fish Audio TTS API
- **Styling:** Monocraft font, custom pixel components

## How to Run Locally

1. **Clone the repo:**
    ```
    git clone https://github.com/faisalshariff123/sleep-copilot.git
    cd sleep-copilot
    ```

2. **Install dependencies:**
    ```
    pip install -r requirements.txt
    ```

3. **Create a `.env` file:**
    - Add your API keys for Anthropic (Claude) and Fish Audio:
        ```
        ANTHROPIC_API_KEY=your_key_here
        FISH_API_KEY=your_key_here
        ```

4. **Run the app:**
    ```
    python app.py
    ```
    - Visit [http://localhost:5000](http://localhost:5000).

## Deployment

- This project can be deployed easily to Render, Heroku, or GCP App Engine.
- Static assets (fonts, images, audio) are expected in the `/static` folder.

## License

Sleep Copilot is released under the MIT License. See [LICENSE](LICENSE) for details.

## Credits

- Claude API - Anthropic
- Fish Audio TTS
- Monocraft Font by @IdreesInc

---

**Made at CalHacks 2025.**
