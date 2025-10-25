let noiseLevels = [];
let movementLevels = [];
let monitoring = false;

function handleMotion(event) {
  let acc = event.accelerationIncludingGravity || {};
  let x = acc.x || 0, y = acc.y || 0, z = acc.z || 0;
  let magnitude = Math.sqrt(x*x + y*y + z*z);
  
  if (monitoring) {
    movementLevels.push(magnitude);
  }
  
  // Only for test, not production. Remove or comment out in production.
  document.getElementById('output').textContent = `X: ${x.toFixed(2)}, Y: ${y.toFixed(2)}, Z: ${z.toFixed(2)}, Magnitude: ${magnitude.toFixed(2)}`;
}
async function enableSensors() {
  noiseLevels = [];
  movementLevels = [];
  monitoring = true;
  
  // Preload and unlock audio context on user interaction
  let audio = document.getElementById('whitenoise');
  audio.load(); // Preload the audio
  
  // Play and immediately pause to "unlock" audio on mobile
  try {
    audio.volume = 0;     // ← Mute it first
    await audio.play();   // ← Plays silently (unlocks audio context)
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 1;     // ← Restore volume for later playback
  } catch (err) {
    console.log('Audio unlock attempt:', err);
  }

  // Motion sensor permission (iOS)
  if (typeof DeviceMotionEvent.requestPermission === 'function') {
    try {
      const resp = await DeviceMotionEvent.requestPermission();
      if (resp === 'granted') {
        window.addEventListener('devicemotion', handleMotion);
      } else {
        alert('Motion sensor denied.');
        return;
      }
    } catch (err) { 
      alert('Motion error: ' + err); 
      return;
    }
  } else {
    window.addEventListener('devicemotion', handleMotion);
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
    }, 1000); // every second
    
    alert('Microphone access granted! Monitoring for 5 seconds...');
  } catch (err) {
    alert('Microphone denied: ' + err);
    monitoring = false;
    return;
  }
  
  // Timer for testing (5 seconds) - change back to 3600 * 1000 for production
  setTimeout(() => {
    monitoring = false;
// Check if we have any data
    if (noiseLevels.length === 0 || movementLevels.length === 0) {
      alert('No data collected. Unable to determine sleep state.');
      return;
    }
    
    // Analyze noise
    let avgNoise = noiseLevels.reduce((a, b) => a + b, 0) / noiseLevels.length;
    let noiseAwake = avgNoise > 2; // Example threshold, tune as needed
    
    // Analyze movement
    let avgMovement = movementLevels.reduce((a, b) => a + b, 0) / movementLevels.length;
    let movementAwake = avgMovement > 10; // Example threshold, tune as needed
    
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
  }, 5 * 1000); // 5 seconds for testing
}

document.getElementById('enable-sensors').addEventListener('click', enableSensors);