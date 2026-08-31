import * as THREE from 'three';
import { setVRMExpression } from '@/utils/vrmUtils';

export class IdleController {
  constructor(vrm) {
    this.vrm = vrm;
    this.elapsedTime = 0;
    this.speakingTime = 0;
    
    // Disable lookAt autoUpdate so it doesn't overwrite head & neck rotations
    if (this.vrm?.lookAt) {
      this.vrm.lookAt.autoUpdate = false;
    }

    // Blinking state
    this.blinkTimer = 2.5 + Math.random() * 3.0;
    this.isBlinking = false;
    this.blinkDuration = 0.15;
    this.blinkTime = 0;
    
    // Breathing state (calm, slow rhythm)
    this.breathingSpeed = 1.2;
    
    // Gaze state
    this.gazeTimer = 3.5 + Math.random() * 4.0;
    this.currentGaze = new THREE.Vector2(0, 0);
    this.targetGaze = new THREE.Vector2(0, 0);
    
    // Idle Behavior State Machine
    this.idleState = 'normal_idle';
    this.stateTimer = 6.0 + Math.random() * 6.0;

    // Cache bones
    this.bones = this.cacheBones();
  }

  cacheBones() {
    if (!this.vrm || !this.vrm.humanoid) return {};
    const getBone = (name) => {
      return this.vrm.humanoid.getNormalizedBoneNode?.(name) || this.vrm.humanoid.getRawBoneNode?.(name) || null;
    };

    return {
      head: getBone('head'),
      neck: getBone('neck'),
      spine: getBone('spine'),
      chest: getBone('chest') || getBone('upperChest') || getBone('spine'),
      hips: getBone('hips'),
      leftShoulder: getBone('leftShoulder'),
      rightShoulder: getBone('rightShoulder'),
      leftUpperArm: getBone('leftUpperArm'),
      rightUpperArm: getBone('rightUpperArm'),
      leftLowerArm: getBone('leftLowerArm'),
      rightLowerArm: getBone('rightLowerArm'),
      leftHand: getBone('leftHand'),
      rightHand: getBone('rightHand')
    };
  }

  update(delta, isSpeaking = false) {
    if (!this.vrm) return;
    this.elapsedTime += delta;

    // 1. Natural Blinking
    this.updateBlinking(delta);

    // 2. Gentle Breathing
    this.updateBreathing(delta);

    // 3. Eye Gaze Saccades
    this.updateGaze(delta, isSpeaking);

    // 4. Smooth Hand & Arm Gestures
    this.updateArmGestures(delta, isSpeaking);

    // 5. Calm Head & Neck Movement (no shaking)
    this.updateIdleState(delta, isSpeaking);
  }

  updateBlinking(delta) {
    this.blinkTimer -= delta;

    if (this.blinkTimer <= 0 && !this.isBlinking) {
      this.isBlinking = true;
      this.blinkTime = 0;
      this.blinkDuration = 0.14 + Math.random() * 0.06;
    }

    if (this.isBlinking) {
      this.blinkTime += delta;
      const progress = this.blinkTime / this.blinkDuration;

      if (progress >= 1.0) {
        this.isBlinking = false;
        setVRMExpression(this.vrm, 'blink', 0);
        setVRMExpression(this.vrm, 'Blink', 0);
        setVRMExpression(this.vrm, 'BLINK', 0);
        const isDoubleBlink = Math.random() < 0.12;
        this.blinkTimer = isDoubleBlink ? 0.3 : (2.8 + Math.random() * 3.5);
      } else {
        const blinkWeight = Math.sin(progress * Math.PI);
        setVRMExpression(this.vrm, 'blink', blinkWeight);
        setVRMExpression(this.vrm, 'Blink', blinkWeight);
        setVRMExpression(this.vrm, 'BLINK', blinkWeight);
      }
    }
  }

  updateBreathing(delta) {
    const breath = Math.sin(this.elapsedTime * this.breathingSpeed);
    
    if (this.bones.chest) {
      this.bones.chest.rotation.x = breath * 0.015; // Gentle natural breathing
    }
    if (this.bones.spine) {
      this.bones.spine.rotation.x = breath * 0.008;
    }
    if (this.bones.leftShoulder) {
      this.bones.leftShoulder.rotation.z = breath * 0.006;
    }
    if (this.bones.rightShoulder) {
      this.bones.rightShoulder.rotation.z = -breath * 0.006;
    }
  }

  updateArmGestures(delta, isSpeaking) {
    const { leftUpperArm, rightUpperArm, leftLowerArm, rightLowerArm, leftHand, rightHand } = this.bones;
    const t = this.elapsedTime;

    if (isSpeaking) {
      this.speakingTime += delta;
      const st = this.speakingTime;

      // Gentle conversational gesture waves
      const wave1 = Math.sin(st * 1.6);
      const wave2 = Math.cos(st * 1.2);

      // Right arm: smooth conversational emphasis
      const targetRUA_Z = THREE.MathUtils.degToRad(-46 + wave1 * 6);
      const targetRUA_X = THREE.MathUtils.degToRad(20 + wave2 * 6);
      const targetRUA_Y = THREE.MathUtils.degToRad(-15 + wave1 * 4);

      const targetRLA_Y = THREE.MathUtils.degToRad(-45 + wave1 * 8);
      const targetRLA_X = THREE.MathUtils.degToRad(20 + wave2 * 5);
      const targetRHand_Z = THREE.MathUtils.degToRad(wave1 * 6);

      // Left arm: relaxed posture
      const targetLUA_Z = THREE.MathUtils.degToRad(64 + Math.sin(t * 1.1) * 3);
      const targetLUA_X = THREE.MathUtils.degToRad(12 + Math.cos(t * 0.9) * 4);
      const targetLLA_Y = THREE.MathUtils.degToRad(20 + Math.sin(t * 1.3) * 4);
      const targetLHand_Z = THREE.MathUtils.degToRad(Math.sin(t * 1.5) * 4);

      const lerpSpeed = delta * 3.5;
      if (rightUpperArm) {
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, targetRUA_Z, lerpSpeed);
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, targetRUA_X, lerpSpeed);
        rightUpperArm.rotation.y = THREE.MathUtils.lerp(rightUpperArm.rotation.y, targetRUA_Y, lerpSpeed);
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, targetRLA_Y, lerpSpeed);
        rightLowerArm.rotation.x = THREE.MathUtils.lerp(rightLowerArm.rotation.x, targetRLA_X, lerpSpeed);
      }
      if (rightHand) {
        rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, targetRHand_Z, lerpSpeed);
      }

      if (leftUpperArm) {
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(leftUpperArm.rotation.z, targetLUA_Z, lerpSpeed);
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, targetLUA_X, lerpSpeed);
      }
      if (leftLowerArm) {
        leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, targetLLA_Y, lerpSpeed);
      }
      if (leftHand) {
        leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, targetLHand_Z, lerpSpeed);
      }

    } else {
      // Natural resting idle arm posture with gentle calm drift
      this.speakingTime = 0;
      const sway = Math.sin(t * 0.9) * 0.025;
      const armSway = Math.cos(t * 0.7) * 0.02;

      let baseLUA_Z = THREE.MathUtils.degToRad(68) + sway;
      let baseRUA_Z = THREE.MathUtils.degToRad(-68) - sway;
      let baseLLA_Y = THREE.MathUtils.degToRad(18) + armSway;
      let baseRLA_Y = THREE.MathUtils.degToRad(-18) - armSway;
      let baseRUA_X = 0.05;
      let baseLUA_X = 0.05;

      if (this.idleState === 'thinking') {
        baseRUA_Z = THREE.MathUtils.degToRad(-48);
        baseRUA_X = THREE.MathUtils.degToRad(16);
        baseRLA_Y = THREE.MathUtils.degToRad(-35);
      }

      const lerpSpeed = delta * 2.5;
      if (leftUpperArm) {
        leftUpperArm.rotation.z = THREE.MathUtils.lerp(leftUpperArm.rotation.z, baseLUA_Z, lerpSpeed);
        leftUpperArm.rotation.x = THREE.MathUtils.lerp(leftUpperArm.rotation.x, baseLUA_X, lerpSpeed);
      }
      if (rightUpperArm) {
        rightUpperArm.rotation.z = THREE.MathUtils.lerp(rightUpperArm.rotation.z, baseRUA_Z, lerpSpeed);
        rightUpperArm.rotation.x = THREE.MathUtils.lerp(rightUpperArm.rotation.x, baseRUA_X, lerpSpeed);
      }
      if (leftLowerArm) {
        leftLowerArm.rotation.y = THREE.MathUtils.lerp(leftLowerArm.rotation.y, baseLLA_Y, lerpSpeed);
      }
      if (rightLowerArm) {
        rightLowerArm.rotation.y = THREE.MathUtils.lerp(rightLowerArm.rotation.y, baseRLA_Y, lerpSpeed);
      }
      if (leftHand) {
        leftHand.rotation.z = THREE.MathUtils.lerp(leftHand.rotation.z, sway * 0.4, lerpSpeed);
      }
      if (rightHand) {
        rightHand.rotation.z = THREE.MathUtils.lerp(rightHand.rotation.z, -sway * 0.4, lerpSpeed);
      }
    }
  }

  updateGaze(delta, isSpeaking) {
    this.gazeTimer -= delta;

    if (this.gazeTimer <= 0) {
      if (isSpeaking || Math.random() < 0.8) {
        this.targetGaze.set((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.03);
        this.gazeTimer = 3.0 + Math.random() * 3.5;
      } else {
        const glanceX = (Math.random() > 0.5 ? 1 : -1) * (0.08 + Math.random() * 0.08);
        const glanceY = (Math.random() - 0.3) * 0.06;
        this.targetGaze.set(glanceX, glanceY);
        this.gazeTimer = 1.8 + Math.random() * 2.0;
      }
    }

    this.currentGaze.lerp(this.targetGaze, Math.min(1, delta * 3.5));
  }

  updateIdleState(delta, isSpeaking) {
    this.stateTimer -= delta;
    if (this.stateTimer <= 0) {
      const states = ['normal_idle', 'thinking', 'gentle_sway'];
      this.idleState = states[Math.floor(Math.random() * states.length)];
      this.stateTimer = 6.0 + Math.random() * 6.0;
    }

    const t = this.elapsedTime;
    let targetNeckY = Math.sin(t * 0.5) * 0.025;
    let targetNeckZ = Math.cos(t * 0.4) * 0.015;
    let targetHeadX = Math.sin(t * 0.6) * 0.012;
    let targetSpineY = Math.sin(t * 0.4) * 0.012;

    if (isSpeaking) {
      targetNeckY = Math.sin(t * 1.2) * 0.03;
      targetNeckZ = Math.cos(t * 1.0) * 0.02;
    } else if (this.idleState === 'thinking') {
      targetNeckY += 0.04;
      targetNeckZ -= 0.025;
      targetHeadX += 0.015;
    }

    if (this.bones.neck) {
      this.bones.neck.rotation.y = THREE.MathUtils.lerp(this.bones.neck.rotation.y, targetNeckY, delta * 2.5);
      this.bones.neck.rotation.z = THREE.MathUtils.lerp(this.bones.neck.rotation.z, targetNeckZ, delta * 2.5);
      if (!isSpeaking) {
        this.bones.neck.rotation.x = THREE.MathUtils.lerp(this.bones.neck.rotation.x, 0, delta * 2.5);
      }
    }
    if (this.bones.head) {
      if (!isSpeaking) {
        this.bones.head.rotation.x = THREE.MathUtils.lerp(this.bones.head.rotation.x, targetHeadX, delta * 2.5);
      }
      this.bones.head.rotation.y = THREE.MathUtils.lerp(this.bones.head.rotation.y, targetNeckY * 0.5, delta * 2.5);
    }
    if (this.bones.spine) {
      this.bones.spine.rotation.y = THREE.MathUtils.lerp(this.bones.spine.rotation.y, targetSpineY, delta * 2.0);
    }
  }
}
