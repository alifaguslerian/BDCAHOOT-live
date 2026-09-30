import test from 'node:test';
import assert from 'node:assert/strict';
import { SoundEffects } from '../lib/soundFX';

test('mute applies to every effect and persists for the tab', () => {
  const sound = new SoundEffects();
  let contexts = 0;
  const values = new Map<string, string>();
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) },
    AudioContext: class { constructor() { contexts++; } },
  } });
  try {
    sound.setMuted(true);
    sound.playTap(); sound.playSuccess(); sound.playError(); sound.playTick(); sound.playFanfare();
    assert.equal(contexts, 0);
    assert.equal(sound.isMuted(), true);
    assert.equal(values.get('bdcahoot_muted'), 'true');
    sound.setMuted(false);
    assert.equal(sound.isMuted(), false);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});

test('mute silences the active output, reload reads the preference, and nodes disconnect after playback', () => {
  const values = new Map<string, string>();
  const gains: { value: number; disconnected: boolean }[] = [];
  const oscillators: { onended?: () => void; disconnected: boolean }[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  class AudioStub {
    currentTime = 0;
    state = 'running';
    destination = {};
    createGain() {
      const state = { value: 1, disconnected: false }; gains.push(state);
      return { gain: { setValueAtTime: (value: number) => { state.value = value; }, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { state.disconnected = true; } };
    }
    createOscillator() {
      const osc = { onended: undefined as (() => void) | undefined, disconnected: false, frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {}, disconnect() { osc.disconnected = true; }, start() {}, stop() {} };
      oscillators.push(osc); return osc;
    }
  }
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {
    sessionStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }, AudioContext: AudioStub,
  } });
  try {
    const sound = new SoundEffects();
    sound.playTap();
    assert.equal(oscillators.length, 1);
    sound.setMuted(true);
    assert.equal(gains[0].value, 0);
    const reloaded = new SoundEffects();
    reloaded.playFanfare();
    assert.equal(reloaded.isMuted(), true);
    assert.equal(oscillators.length, 1);
    oscillators[0].onended?.();
    assert.equal(oscillators[0].disconnected, true);
    assert.equal(gains[1].disconnected, true);
    sound.setMuted(false);
    assert.equal(gains[0].value, 1);
    sound.playSuccess();
    assert.equal(oscillators.length, 4);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  }
});
