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
  
  button.disabled = true;
  button.classList.add('loading');
  button.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">INITIALIZING...</span><span class="btn-glitch"></span>';
  
  noiseLevels = [];
  movementLevels = [];
  monitoring = true;
  
  let motionEnabled = false;
  let micEnabled = false;
  
  // REQUEST MOTION PERMISSION FIRST
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
        motionEnabled = true;
        console.log('✅ Motion enabled');
      } else {
        console.log('❌ Motion denied');
      }
    } catch (err) { 
      console.log('Motion error:', err);
    }
  } else {
    // Desktop - motion may not be available, that's okay
    window.addEventListener('devicemotion', handleMotion);
    motionEnabled = true;
  }
  
  // Audio setup
  let audio = document.getElementById('whitenoise');
  if (audio) {
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
  }
  
  // Microphone access - WITH TIMEOUT
  button.innerHTML = '<span class="btn-icon">🎤</span><span class="btn-text">REQUESTING MIC...</span><span class="btn-glitch"></span>';
  
  try {
    // Add 5 second timeout for mic request
    const micPromise = navigator.mediaDevices.getUserMedia({ audio: true });
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 5000)
    );
    
    const stream = await Promise.race([micPromise, timeoutPromise]);
    
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
    
    micEnabled = true;
    console.log('✅ Microphone enabled');
  } catch (err) {
    console.log('⚠️ Microphone unavailable:', err.message);
    // Continue without microphone - use only motion data
  }
  
  // Check if at least ONE sensor is enabled
  if (!motionEnabled && !micEnabled) {
    alert('No sensors available. Please enable motion or microphone permissions.');
    resetSensorButton(button);
    monitoring = false;
    return;
  }
  
  button.innerHTML = '<span class="btn-icon">📊</span><span class="btn-text">MONITORING...</span><span class="btn-glitch"></span>';
  if (outputContent) {
    const sensors = [];
    if (motionEnabled) sensors.push('Motion');
    if (micEnabled) sensors.push('Microphone');
    outputContent.textContent = `Monitoring ${sensors.join(' + ')} for 5 seconds...`;
  }
  
  // Monitor for 5 seconds
  setTimeout(() => {
    monitoring = false;
    
    // Calculate averages (use 0 if no data)
    let avgNoise = noiseLevels.length > 0 
      ? noiseLevels.reduce((a, b) => a + b, 0) / noiseLevels.length 
      : 0;
    let avgMovement = movementLevels.length > 0 
      ? movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length 
      : 0;
    
    console.log(`Avg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    
    // Determine if awake (relaxed thresholds)
    let noiseAwake = avgNoise > 2;
    let movementAwake = avgMovement > 10;
    
    // If only one sensor is available, use that
    let isAwake;
    if (micEnabled && motionEnabled) {
      isAwake = noiseAwake || movementAwake;
    } else if (micEnabled) {
      isAwake = noiseAwake;
    } else if (motionEnabled) {
      isAwake = movementAwake;
    } else {
      isAwake = false; // Shouldn't happen
    }
    
    if (isAwake) {
      if (audio) {
        audio.play().catch(err => {
          console.error('Audio play failed:', err);
        });
      }
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
