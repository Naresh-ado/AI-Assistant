import * as THREE from 'three';
import { setVRMExpression } from '@/utils/vrmUtils';

/**
 * Maps application emotion states to VRM standard expressions
 */
const EMOTION_EXPRESSION_MAP = {
  neutral: {
    expressions: { neutral: 1.0, happy: 0.0, relaxed: 0.2, surprised: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: 0, y: 0, z: 0 },
    glow: 0.25
  },
  happy: {
    expressions: { happy: 0.85, relaxed: 0.4, neutral: 0.0, surprised: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.04, y: 0.02, z: -0.03 },
    glow: 0.5
  },
  reassuring: {
    expressions: { happy: 0.5, relaxed: 0.6, neutral: 0.2, surprised: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.02, y: -0.03, z: 0.04 },
    glow: 0.4
  },
  concerned: {
    expressions: { sad: 0.45, surprised: 0.2, relaxed: 0.0, happy: 0.0, neutral: 0.2, angry: 0.0 },
    headTilt: { x: 0.03, y: 0.04, z: -0.05 },
    glow: 0.2
  },
  empathetic: {
    expressions: { relaxed: 0.5, sad: 0.25, happy: 0.2, neutral: 0.2, surprised: 0.0, angry: 0.0 },
    headTilt: { x: 0.02, y: -0.04, z: 0.05 },
    glow: 0.45
  },
  thinking: {
    expressions: { neutral: 0.5, surprised: 0.15, relaxed: 0.2, happy: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.03, y: 0.06, z: 0.06 },
    glow: 0.3
  },
  excited: {
    expressions: { happy: 0.95, surprised: 0.3, relaxed: 0.2, neutral: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.06, y: 0, z: -0.04 },
    glow: 0.7
  },
  celebrating: {
    expressions: { happy: 1.0, surprised: 0.4, relaxed: 0.3, neutral: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.08, y: -0.03, z: -0.06 },
    glow: 0.85
  },
  calm: {
    expressions: { relaxed: 0.7, neutral: 0.3, happy: 0.15, surprised: 0.0, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.01, y: 0, z: 0 },
    glow: 0.35
  },
  encouraging: {
    expressions: { happy: 0.7, relaxed: 0.4, neutral: 0.1, surprised: 0.1, sad: 0.0, angry: 0.0 },
    headTilt: { x: -0.04, y: 0.02, z: -0.03 },
    glow: 0.55
  }
};

export class EmotionController {
  constructor(vrm) {
    this.vrm = vrm;
    this.currentEmotion = 'neutral';
    this.targetEmotion = 'neutral';
    this.currentWeights = {
      happy: 0,
      relaxed: 0,
      neutral: 1,
      sad: 0,
      surprised: 0,
      angry: 0
    };
    this.targetWeights = { ...this.currentWeights };
    this.headTilt = { x: 0, y: 0, z: 0 };
    this.targetHeadTilt = { x: 0, y: 0, z: 0 };
  }

  setEmotion(emotion) {
    const config = EMOTION_EXPRESSION_MAP[emotion] || EMOTION_EXPRESSION_MAP.neutral;
    this.targetEmotion = emotion;
    this.targetWeights = { ...config.expressions };
    this.targetHeadTilt = { ...config.headTilt };
  }

  update(delta) {
    if (!this.vrm) return;

    // Smoothly interpolate expression weights (speed factor ~5/sec)
    const lerpSpeed = Math.min(1, delta * 6);
    
    for (const key of Object.keys(this.targetWeights)) {
      const current = this.currentWeights[key] || 0;
      const target = this.targetWeights[key] || 0;
      const next = THREE.MathUtils.lerp(current, target, lerpSpeed);
      this.currentWeights[key] = next;

      // Apply to VRM expression preset (standard names: happy, relaxed, sad, surprised, angry, neutral, or capitalized variants)
      setVRMExpression(this.vrm, key, next);
      setVRMExpression(this.vrm, key.charAt(0).toUpperCase() + key.slice(1), next);
      // Support VRM 0.0 JOY, SORROW, FUN, ANGRY presets
      if (key === 'happy') {
        setVRMExpression(this.vrm, 'joy', next);
        setVRMExpression(this.vrm, 'JOY', next);
      } else if (key === 'sad') {
        setVRMExpression(this.vrm, 'sorrow', next);
        setVRMExpression(this.vrm, 'SORROW', next);
      } else if (key === 'relaxed') {
        setVRMExpression(this.vrm, 'fun', next);
        setVRMExpression(this.vrm, 'FUN', next);
      }
    }

    // Smoothly interpolate head tilt
    this.headTilt.x = THREE.MathUtils.lerp(this.headTilt.x, this.targetHeadTilt.x, lerpSpeed);
    this.headTilt.y = THREE.MathUtils.lerp(this.headTilt.y, this.targetHeadTilt.y, lerpSpeed);
    this.headTilt.z = THREE.MathUtils.lerp(this.headTilt.z, this.targetHeadTilt.z, lerpSpeed);

    // Apply head tilt to humanoid head bone if available
    if (this.vrm.humanoid) {
      const head = typeof this.vrm.humanoid.getNormalizedBoneNode === 'function'
        ? this.vrm.humanoid.getNormalizedBoneNode('head')
        : this.vrm.humanoid.getBoneNode?.('head');
      if (head) {
        head.rotation.x = this.headTilt.x;
        head.rotation.y = this.headTilt.y;
        head.rotation.z = this.headTilt.z;
      }
    }
  }
}
