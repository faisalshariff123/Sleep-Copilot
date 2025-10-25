let noiseLevels = [];
let movementLevels = [];
let monitoring = false;

function handleMotion(event) {
  // Keep updating display even after monitoring stops
  let acc = event.accelerationIncludingGravity || {};
  let x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
  let magnitude = Math.sqrt(x*x + y*y + z*z);
  
  // Only collect data while monitoring
  if (monitoring) {
    movementLevels.push(magnitude);
  }
  
  document.getElementById('output').textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}, Magnitude: ${magnitude.toFixed(2)}`;
}

async function enableSensors() {
  noiseLevels = [];
  movementLevels = [];
  monitoring = true;
  
  // REQUEST MOTION PERMISSION FIRST (before any other async operations!)
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      } else {
        alert('Motion sensor denied.');
        monitoring = false;
        return;
      }
    } catch (err) { 
      alert('Motion error: ' + err); 
      monitoring = false;
      return;
    }
  } else {
    // PC, Mac and Non-iOS devices
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
  
  // Microphone access and noise analysis
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
    
    alert('Sensors enabled! Monitoring for 5 seconds...');
  } catch (err) {
    alert('Microphone denied: ' + err);
    monitoring = false;
    return;
  }
  
  // Timer for testing (5 seconds) (Not for production)
  setTimeout(() => {
    monitoring = false;
    
    if (noiseLevels.length === 0 || movementLevels.length === 0) {
      alert('No data collected. Unable to determine sleep state.');
      return;
    }
    
    let avgNoise = noiseLevels.reduce((a, b) => a + b, 0) / noiseLevels.length;
    let noiseAwake = avgNoise > 2;
    
    let avgMovement = movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length;
    let movementAwake = avgMovement > 10;
    
    console.log(`Avg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    console.log(`Noise samples: ${noiseLevels.length}, Movement samples: ${movementLevels.length}`);
    
    if (noiseAwake || movementAwake) {
      audio.play().catch(err => {
        console.error('Audio play failed:', err);
        alert('Audio play failed. Please tap to play white noise manually.');
      });
      alert(`Still awake! Playing white noise.\nAvg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    } else {
      alert(`User is likely asleep.\nAvg Noise: ${avgNoise.toFixed(2)}, Avg Movement: ${avgMovement.toFixed(2)}`);
    }
  }, 5 * 1000);
}

document.getElementById('enable-sensors').addEventListener('click', enableSensors);

// Dream analysis submission
async function submitDream() {
            const dream = document.getElementById('dreamInput').value;
            const resultDiv = document.getElementById('result');  // ← Get the result div
    
            resultDiv.textContent = 'Analyzing your dream...';
            
            const response = await fetch('/dream_analysis', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ dream: dream })
            });
            
            const data = await response.json();
            document.getElementById('result').innerText = data.analysis;
        }

// Sleep Tips function
async function getSleepTips() {
    const resultDiv = document.getElementById('sleep-tips-result');
    
    resultDiv.textContent = 'Getting personalized sleep tip...';
    
    try {
        const response = await fetch('/sleep_tips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({})
        });
        
        // Get JSON response from Flask
        const data = await response.json();
        
        // Check if successful and display the tip
        if (data.success) {
            resultDiv.textContent = '💡 ' + data.tips;
        } else {
            resultDiv.textContent = 'Error: ' + (data.error || 'Unknown error');
        }
    } catch (error) {
        resultDiv.textContent = 'Error connecting to server: ' + error.message;
    }
}