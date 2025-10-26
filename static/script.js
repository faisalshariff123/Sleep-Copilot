let noiseLevels = [];
let movementLevels = [];
let monitoring = false;

// Character counter for dream input
const dreamInput = document.getElementById('dreamInput');
const charCount = document.getElementById('char-count');

if (dreamInput && charCount) {
    dreamInput.addEventListener('input', function() {
        charCount.textContent = this.value.length;
        
        if (this.value.length > 900) {
            charCount.style.color = '#fbbf24';
        } else if (this.value.length > 950) {
            charCount.style.color = '#ef4444';
        } else {
            charCount.style.color = '#6b7280';
        }
    });
}

function handleMotion(event) {
  let acc = event.accelerationIncludingGravity || {};
  let x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
  let magnitude = Math.sqrt(x*x + y*y + z*z);
  
  if (monitoring) {
    movementLevels.push(magnitude);
  }
  
  const outputContent = document.querySelector('#output .output-content');
  if (outputContent) {
    outputContent.textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}\nMagnitude: ${magnitude.toFixed(2)}`;
  }
}

async function enableSensors() {
  const button = document.getElementById('enable-sensors');
  const outputDiv = document.getElementById('output');
  const outputContent = document.querySelector('#output .output-content');
  
  // Disable button during process
  button.disabled = true;
  button.classList.add('loading');
  button.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">INITIALIZING...</span><span class="btn-glitch"></span>';
  
  noiseLevels = [];
  movementLevels = [];
  monitoring = true;
  
  // REQUEST MOTION PERMISSION FIRST
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      } else {
        alert('Motion sensor permission denied. Please enable in settings.');
        resetSensorButton(button);
        monitoring = false;
        return;
      }
    } catch (err) { 
      alert('Motion error: ' + err); 
      resetSensorButton(button);
      monitoring = false;
      return;
    }
  } else {
    window.addEventListener('devicemotion', handleMotion);
  }
  
  let audio = document.getElementById('whitenoise');
  audio.load();
  
  try {
    audio.volume = 0;
    await audio.play();
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;
  } catch (err) {
    console.log('Audio unlock attempt:', err);
  }
  
  // Microphone access
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    let audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    let analyser = audioCtx.createAnalyser();
    let dataArray = new Uint8Array(analyser.fftSize);
    let source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    
    setInterval(() => {
      if (!monitoring) return;
      analyser.getByteTimeDomainData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += Math.abs(dataArray[i] - 128);
      }
      let avg = sum / dataArray.length;
      noiseLevels.push(avg);
    }, 1000);
    
    button.innerHTML = '<span class="btn-icon">📊</span><span class="btn-text">MONITORING...</span><span class="btn-glitch"></span>';
    if (outputContent) {
      outputContent.textContent = 'Monitoring sensors for 5 seconds...';
    }
  } catch (err) {
    alert('Microphone permission denied: ' + err);
    resetSensorButton(button);
    monitoring = false;
    return;
  }
  
  // Monitor for 5 seconds
  setTimeout(() => {
    monitoring = false;
    
    if (noiseLevels.length === 0 || movementLevels.length === 0) {
      alert('No data collected. Unable to determine sleep state.');
      resetSensorButton(button);
      return;
    }
    
    let avgNoise = noiseLevels.reduce((a, b) => a + b, 0) / noiseLevels.length;
    let noiseAwake = avgNoise > 1.2;
    
    let avgMovement = movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length;
    let movementAwake = avgMovement > 9.6;
    
    console.log(`Avg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    
    if (noiseAwake || movementAwake) {
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
        alert('Audio play failed. Please tap to play white noise manually.');
      });
      if (outputContent) {
        outputContent.textContent = `Still awake detected!\nNoise: ${avgNoise.toFixed(2)} | Movement: ${avgMovement.toFixed(2)}\n\n🎵 Playing white noise...`;
      }
    } else {
      if (outputContent) {
        outputContent.textContent = `Sleep detected ✓\nNoise: ${avgNoise.toFixed(2)} | Movement: ${avgMovement.toFixed(2)}`;
      }
    }
    
    resetSensorButton(button);
  }, 5 * 1000);
}

function resetSensorButton(button) {
  button.disabled = false;
  button.classList.remove('loading');
  button.innerHTML = '<span class="btn-icon">▶</span><span class="btn-text">START TRACKING</span><span class="btn-glitch"></span>';
}

document.getElementById('enable-sensors').addEventListener('click', enableSensors);

// Dream analysis submission
async function submitDream() {
    const dream = document.getElementById('dreamInput').value.trim();
    const resultDiv = document.getElementById('result');
    
    if (!dream) {
        resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">⚠️ Please describe your dream first.</div>';
        resultDiv.style.borderColor = '#fbbf24';
        return;
    }
    
    resultDiv.innerHTML = '<div class="output-header">[ ANALYZING ]</div><div class="output-content">🔮 Analyzing your dream...</div>';
    resultDiv.style.borderColor = '#4a5568';
    
    try {
        const response = await fetch('/dream_analysis', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ dream: dream })
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = '<div class="output-header">[ ANALYSIS COMPLETE ]</div><div class="output-content">✨ ' + data.analysis + '</div>';
            resultDiv.style.borderColor = '#10b981';
        } else {
            resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌ Error: ' + (data.error || 'Unknown error') + '</div>';
            resultDiv.style.borderColor = '#ef4444';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌ Error: ' + error.message + '</div>';
        resultDiv.style.borderColor = '#ef4444';
    }
}

// Sleep Tips function
async function getSleepTips() {
    const resultDiv = document.getElementById('sleep-tips-result');
    
    resultDiv.innerHTML = '<div class="output-header">[ LOADING ]</div><div class="output-content">💭 Getting personalized sleep tip...</div>';
    resultDiv.style.borderColor = '#4a5568';
    
    try {
        const response = await fetch('/sleep_tips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = '<div class="output-header">[ TIP RECEIVED ]</div><div class="output-content">💡 ' + data.tips + '</div>';
            resultDiv.style.borderColor = '#10b981';
        } else {
            resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌ Error: ' + (data.error || 'Unknown error') + '</div>';
            resultDiv.style.borderColor = '#ef4444';
        }
    } catch (error) {
        resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌ Error: ' + error.message + '</div>';
        resultDiv.style.borderColor = '#ef4444';
    }
}

// Bedtime story 
async function generateBedtimeStory() {
    const theme = document.getElementById('story-theme').value.trim() || 'peaceful night sky';
    const resultDiv = document.getElementById('story-result');
    const audioPlayer = document.getElementById('story-audio');

    resultDiv.innerHTML = '<div class="output-header">[ GENERATING STORY ]</div><div class="output-content">🪄 Creating your bedtime story...</div>';
    resultDiv.style.borderColor = '#4a5568';
    audioPlayer.style.display = 'none';
    audioPlayer.src = "";

    try {
        const response = await fetch('/generate_bedtime_story', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ theme })
        });

        const data = await response.json();
        
        if (data.success) {
            resultDiv.innerHTML = '<div class="output-header">[ STORY READY ]</div><div class="output-content">' + data.story + '</div>';
            resultDiv.style.borderColor = '#10b981';

            if (data.audio_url) {
                audioPlayer.src = data.audio_url;
                audioPlayer.style.display = 'block';
            } else {
                resultDiv.innerHTML += '<div class="output-content">🎧 Audio unavailable, read it yourself for now!</div>';
            }
        } else {
            resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌ ' + data.error + '</div>';
            resultDiv.style.borderColor = '#ef4444';
        }

    } catch (error) {
        resultDiv.innerHTML = '<div class="output-header">[ ERROR ]</div><div class="output-content">❌❌ ' + error.message + '</div>';
        resultDiv.style.borderColor = '#ef4444';
    }
}
