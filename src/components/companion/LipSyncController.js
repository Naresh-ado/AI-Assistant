import * as THREE from 'three';

/**
 * LipSyncController
 *
 * Smooth, natural conversational speech cadence with visible gentle head nods.
 */
export class LipSyncController {
  constructor(vrm) {
    this.vrm = vrm;
    this.isSpeaking = false;
    this.elapsedSpeakingTime = 0;
    this.currentJawWeight = 0;
    this.syllableHz = 2.6; // Natural speech cadence

    this.headBone = null;
    this.neckBone = null;
    this.spineBone = null;
    this.chestBone = null;

    this._cacheBones();
  }

  _cacheBones() {
    if (!this.vrm?.humanoid) return;
    const get = (name) =>
      this.vrm.humanoid.getNormalizedBoneNode?.(name) ||
      this.vrm.humanoid.getRawBoneNode?.(name) ||
      null;

    this.headBone  = get('head');
    this.neckBone  = get('neck');
    this.spineBone = get('spine');
    this.chestBone = get('chest') || get('upperChest');
  }

  startSpeaking() {
    this.isSpeaking = true;
    this.elapsedSpeakingTime = 0;
    this.currentJawWeight = 0;
  }

  stopSpeaking() {
    this.isSpeaking = false;
  }

  update(delta) {
    if (!this.vrm) return;

    if (this.isSpeaking) {
      this.elapsedSpeakingTime += delta;
      const t = this.elapsedSpeakingTime;

      // Natural speech rhythm with subtle emphasis pulses
      const syllable = Math.sin(t * this.syllableHz * 2.0);
      const cadence = Math.cos(t * this.syllableHz);
      const intensity = Math.max(0, (syllable * 0.7 + cadence * 0.4 + 0.3) / 1.4);

      // Smooth low-pass interpolation
      this.currentJawWeight = THREE.MathUtils.lerp(
        this.currentJawWeight,
        intensity,
        Math.min(1, delta * 8.0)
      );

      // Natural, visible speech head nod (~2.8 degrees)
      if (this.headBone) {
        const speechNod = this.currentJawWeight * 0.048; // Visible gentle nod
        this.headBone.rotation.x = THREE.MathUtils.lerp(
          this.headBone.rotation.x,
          0.02 + speechNod,
          Math.min(1, delta * 7.0)
        );
      }

      // Sympathetic neck flexion
      if (this.neckBone) {
        this.neckBone.rotation.x = THREE.MathUtils.lerp(
          this.neckBone.rotation.x,
          this.currentJawWeight * 0.02,
          Math.min(1, delta * 6.0)
        );
      }

      // Gentle chest breath/emphasis
      if (this.chestBone) {
        this.chestBone.rotation.x = THREE.MathUtils.lerp(
          this.chestBone.rotation.x,
          Math.sin(t * 1.8) * 0.015,
          Math.min(1, delta * 5.0)
        );
      }

    } else {
      // Smoothly return to calm resting state
      if (this.currentJawWeight > 0.001) {
        this.currentJawWeight = THREE.MathUtils.lerp(
          this.currentJawWeight,
          0,
          Math.min(1, delta * 5.0)
        );

        if (this.headBone) {
          this.headBone.rotation.x = THREE.MathUtils.lerp(
            this.headBone.rotation.x,
            0.01,
            Math.min(1, delta * 5.0)
          );
        }
        if (this.neckBone) {
          this.neckBone.rotation.x = THREE.MathUtils.lerp(
            this.neckBone.rotation.x,
            0,
            Math.min(1, delta * 5.0)
          );
        }
        if (this.chestBone) {
          this.chestBone.rotation.x = THREE.MathUtils.lerp(
            this.chestBone.rotation.x,
            0,
            Math.min(1, delta * 4.0)
          );
        }
      } else {
        this.currentJawWeight = 0;
      }
    }
  }
}
