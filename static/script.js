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
  const outputContent = document.querySelector('#output .output-content');
  
  button.disabled = true;
  button.classList.add('loading');
  button.innerHTML = '<span class="btn-icon">⏳</span><span class="btn-text">INITIALIZING...</span><span class="btn-glitch"></span>';
  
  noiseLevels = [];
  movementLevels = [];
  monitoring = true;
  
  let motionGranted = false;
  let micGranted = false;
  
  // STEP 1: Request Motion Permission
  if (outputContent) {
    outputContent.textContent = 'Requesting motion sensor permission...';
  }
  
  if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
        motionGranted = true;
        if (outputContent) {
          outputContent.textContent = 'Motion sensor granted ✓\nRequesting microphone...';
        }
      } else {
        if (outputContent) {
          outputContent.textContent = 'Motion sensor denied. Continuing with microphone only...';
        }
      }
    } catch (err) { 
      console.error('Motion permission error:', err);
      if (outputContent) {
        outputContent.textContent = 'Motion sensor unavailable. Continuing with microphone...';
      }
    }
  } else {
    // Non-iOS devices or older browsers
    window.addEventListener('devicemotion', handleMotion);
    motionGranted = true;
    if (outputContent) {
      outputContent.textContent = 'Motion sensor enabled ✓\nRequesting microphone...';
    }
  }
  
  // STEP 2: Request Microphone Permission
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    micGranted = true;
    
    if (outputContent) {
      outputContent.textContent = 'Microphone granted ✓\nStarting monitoring...';
    }
    
    // Setup audio analysis
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
    
  } catch (err) {
    console.error('Microphone error:', err);
    if (outputContent) {
      outputContent.textContent = 'Microphone denied. Using motion sensor only...';
    }
  }
  
  // Check if at least one sensor is available
  if (!motionGranted && !micGranted) {
    alert('Both sensors denied. Please enable at least one sensor in your browser settings.');
    resetSensorButton(button);
    monitoring = false;
    return;
  }
  
  // STEP 3: Unlock audio element for iOS
  let audio = document.getElementById('whitenoise');
  if (audio) {
    try {
      audio.load();
      audio.volume = 0;
      await audio.play();
      audio.pause();
      audio.currentTime = 0;
      audio.volume = 1;
      console.log('Audio unlocked successfully');
    } catch (err) {
      console.log('Audio unlock attempt:', err);
    }
  }
  
  // STEP 4: Start monitoring
  button.innerHTML = '<span class="btn-icon">📊</span><span class="btn-text">MONITORING...</span><span class="btn-glitch"></span>';
  if (outputContent) {
    outputContent.textContent = 'Monitoring for 5 seconds...\n' + 
      (motionGranted ? '✓ Motion sensor active\n' : '✗ Motion sensor inactive\n') +
      (micGranted ? '✓ Microphone active' : '✗ Microphone inactive');
  }
  
  // Monitor for 5 seconds
  setTimeout(() => {
    monitoring = false;
    
    // Calculate averages
    let avgNoise = 0;
    let avgMovement = 0;
    let noiseAwake = false;
    let movementAwake = false;
    
    if (noiseLevels.length > 0) {
      avgNoise = noiseLevels.reduce((a, b) => a + b, 0) / noiseLevels.length;
      noiseAwake = avgNoise > 1.3;
    }
    
    if (movementLevels.length > 0) {
      avgMovement = movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length;
      movementAwake = avgMovement > 10;
    }
    
    console.log(`Avg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    console.log(`Noise samples: ${noiseLevels.length}, Movement samples: ${movementLevels.length}`);
    
    // Determine if user is awake
    const isAwake = noiseAwake || movementAwake;
    
    if (isAwake) {
      // Play white noise
      if (audio) {
        audio.play().then(() => {
          console.log('White noise playing');
          if (outputContent) {
            outputContent.textContent = `Still awake detected! 🎵\n\n` +
              `Noise: ${avgNoise.toFixed(2)} ${noiseAwake ? '(HIGH)' : '(low)'}\n` +
              `Movement: ${avgMovement.toFixed(2)} ${movementAwake ? '(HIGH)' : '(low)'}\n\n` +
              `Playing white noise to help you sleep...`;
          }
        }).catch(err => {
          console.error('Audio play failed:', err);
          if (outputContent) {
            outputContent.textContent = `Still awake detected!\n\n` +
              `Noise: ${avgNoise.toFixed(2)}\n` +
              `Movement: ${avgMovement.toFixed(2)}\n\n` +
              `⚠️ Couldn't play audio. Please tap the button below to play manually.`;
          }
          // Show manual play button
          const manualPlayBtn = document.createElement('button');
          manualPlayBtn.textContent = '🔊 Play White Noise';
          manualPlayBtn.className = 'btn pixel-btn';
          manualPlayBtn.style.marginTop = '10px';
          manualPlayBtn.onclick = () => {
            audio.play();
            manualPlayBtn.remove();
          };
          document.querySelector('#output').appendChild(manualPlayBtn);
        });
      }
    } else {
      if (outputContent) {
        outputContent.textContent = `Sleep detected ✓\n\n` +
          `Noise: ${avgNoise.toFixed(2)} (low)\n` +
          `Movement: ${avgMovement.toFixed(2)} (low)\n\n` +
          `You seem ready for sleep. Sweet dreams! 😴`;
      }
    }
    
    resetSensorButton(button);
  }, 5000);
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

// White noise toggle for bedtime stories
function toggleWhiteNoise() {
    const checkbox = document.getElementById('whitenoise-checkbox');
    const volumeSlider = document.getElementById('whitenoise-volume');
    const audio = document.getElementById('whitenoise');
    
    if (checkbox.checked) {
        volumeSlider.disabled = false;
        audio.volume = volumeSlider.value / 100;
        audio.play();
    } else {
        volumeSlider.disabled = true;
        audio.pause();
    }
}

function updateWhiteNoiseVolume() {
    const volumeSlider = document.getElementById('whitenoise-volume');
    const audio = document.getElementById('whitenoise');
    const volumeDisplay = document.getElementById('volume-display');
    
    audio.volume = volumeSlider.value / 100;
    volumeDisplay.textContent = volumeSlider.value + '%';
}
