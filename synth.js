const AudioContext = window.AudioContext || window.webkitAudioContext;
const ctx = new AudioContext();

class Synth {
  constructor(freq, waveType, distortionAmount) {
    const oscillator = this.oscillator = ctx.createOscillator();
    const gain = this.gain = ctx.createGain();
    const compressor = this.compressor = ctx.createDynamicsCompressor();

    oscillator.type = waveType || 'sine';
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0, ctx.currentTime);

    if (distortionAmount) {
      this.bringTheMud(distortionAmount);
    } else {
      oscillator.connect(compressor);
      compressor.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(0);
    }
  }

  setVolume(val, attackRelease = 0.03) {
    // first, in case we're overlapping with a release, cancel the release ramp
    this.gain.gain.cancelScheduledValues(ctx.currentTime);
    // now, make sure to set a "scheduling checkpoint" of the current value
    this.gain.gain.setValueAtTime(this.gain.gain.value, ctx.currentTime);
    // now, set the ramp...
    this.gain.gain.linearRampToValueAtTime(val, ctx.currentTime + attackRelease);
  }

  bringTheMud(amount) {
    const distortionGainNode = ctx.createGain();
    const distortionNode = ctx.createWaveShaper();

    distortionNode.curve = makeDistortionCurve(amount);    
    
    this.oscillator.connect(this.gain);
    this.gain.connect(distortionGainNode);
    distortionGainNode.connect(distortionNode);
    distortionNode.connect(ctx.destination);
    this.oscillator.start(0);
  }

}


function mapNotes(waveType, octaveFactor, keyFreqMap = {}, distortionAmount) {  
  return Object.keys(keyFreqMap).reduce((accum, key) => {
    if (distortionAmount) {
      accum[key] = new Synth(keyFreqMap[key] * octaveFactor, waveType, distortionAmount);
    } else {
      accum[key] = new Synth(keyFreqMap[key] * octaveFactor, waveType);
    }
    return accum;
  }, {});
}

function makeDistortionCurve(amount) {
  let k = amount,
    nSamples = 44100,
    curve = new Float32Array(nSamples),
    deg = Math.PI / 180,
    i = 0,
    x;
  for (; i < nSamples; i++) {
    x = i * 2 / nSamples - 1;
    curve[i] = (30 + k) * x * 20 * deg / (Math.PI + amount * Math.abs(x));   
  }
  return curve;
}
