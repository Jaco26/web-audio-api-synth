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

}


function mapNotes(waveType, octaveFactor, keyFreqMap = {}) {  
  return Object.keys(keyFreqMap).reduce((accum, key) => {
    accum[key] = [
      new Synth(keyFreqMap[key] * octaveFactor, waveType), 
      new Synth((keyFreqMap[key] / 2) * octaveFactor, waveType),
      new Synth((keyFreqMap[key] / 3) * octaveFactor, waveType),
    ];
    return accum;
  }, {});
}
