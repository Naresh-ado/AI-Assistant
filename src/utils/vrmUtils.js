import * as THREE from 'three';

/**
 * Calculates model bounding box and center
 */
export function getVRMBounds(vrm) {
  if (!vrm || !vrm.scene) {
    return { 
      box: new THREE.Box3(new THREE.Vector3(-0.5, 0, -0.5), new THREE.Vector3(0.5, 1.7, 0.5)), 
      center: new THREE.Vector3(0, 0.85, 0), 
      size: new THREE.Vector3(1, 1.7, 1) 
    };
  }
  
  vrm.scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(vrm.scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  
  return { box, center, size };
}

/**
 * Automatically adjust camera position based on model bounding box & head landmarks
 * @param {THREE.PerspectiveCamera} camera
 * @param {object} controls
 * @param {'portrait'|'full'} viewMode
 * @param {object} vrm
 */
export function frameVRMCamera(camera, controls, viewMode = 'portrait', vrm = null) {
  let modelTopY = 1.68;
  
  if (vrm && vrm.scene) {
    vrm.scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(vrm.scene);
    if (box.max.y > 1.0) {
      modelTopY = box.max.y;
    }
  }

  if (viewMode === 'portrait') {
    // Face View: perfectly frames from chest up to top of head / horns / hair with headroom
    camera.fov = 34;
    const targetY = modelTopY * 0.80; // Looking at upper chest / chin level (~1.34m - 1.40m)
    const cameraY = modelTopY * 0.84; // Slightly elevated perspective (~1.40m - 1.46m)
    camera.position.set(0, cameraY, 1.25);
    
    if (controls) {
      controls.target.set(0, targetY, 0);
      controls.minDistance = 0.50;
      controls.maxDistance = 3.5;
      controls.update();
    } else {
      camera.lookAt(0, targetY, 0);
    }
  } else {
    // Full Body View: shows entire model from feet to top of head
    camera.fov = 38;
    const targetY = modelTopY * 0.50; // Mid-torso (~0.85m)
    const cameraY = modelTopY * 0.52;
    camera.position.set(0, cameraY, 2.7);
    
    if (controls) {
      controls.target.set(0, targetY, 0);
      controls.update();
    } else {
      camera.lookAt(0, targetY, 0);
    }
  }
  
  camera.updateProjectionMatrix();
}

/**
 * Inspect available expressions in VRM
 */
export function inspectVRMExpressions(vrm) {
  const available = [];
  if (!vrm) return available;

  if (vrm.expressionManager?.expressions) {
    for (const expr of vrm.expressionManager.expressions) {
      available.push(expr.expressionName || expr.name);
    }
  } else if (vrm.blendShapeProxy?._blendShapeGroups) {
    for (const name of Object.keys(vrm.blendShapeProxy._blendShapeGroups)) {
      available.push(name);
    }
  }
  
  return available;
}

/**
 * Safely set VRM expression weight
 */
export function setVRMExpression(vrm, name, weight) {
  if (!vrm) return;
  const clamped = Math.max(0, Math.min(1, weight));
  
  if (vrm.expressionManager) {
    try {
      vrm.expressionManager.setValue(name, clamped);
    } catch {}
  } else if (vrm.blendShapeProxy) {
    try {
      vrm.blendShapeProxy.setValue(name, clamped);
    } catch {}
  }
}

/**
 * Apply a relaxed human-like idle pose to standard T-pose VRMs
 */
export function applyRestingIdlePose(vrm) {
  if (!vrm || !vrm.humanoid) return;
  
  const getBone = (boneName) => {
    return vrm.humanoid.getNormalizedBoneNode?.(boneName) || 
           vrm.humanoid.getRawBoneNode?.(boneName) || 
           vrm.humanoid.getBoneNode?.(boneName) || null;
  };
  
  // Gently lower arms from horizontal T-pose to natural side-rest
  const leftUpperArm = getBone('leftUpperArm');
  if (leftUpperArm) {
    leftUpperArm.rotation.set(0, 0, THREE.MathUtils.degToRad(68));
  }
  
  const rightUpperArm = getBone('rightUpperArm');
  if (rightUpperArm) {
    rightUpperArm.rotation.set(0, 0, THREE.MathUtils.degToRad(-68));
  }

  const leftLowerArm = getBone('leftLowerArm');
  if (leftLowerArm) {
    leftLowerArm.rotation.set(0, THREE.MathUtils.degToRad(18), 0);
  }

  const rightLowerArm = getBone('rightLowerArm');
  if (rightLowerArm) {
    rightLowerArm.rotation.set(0, THREE.MathUtils.degToRad(-18), 0);
  }
}

/**
 * Dispose Three.js objects cleanly
 */
export function disposeThreeScene(scene, renderer) {
  if (!scene) return;
  
  scene.traverse((object) => {
    if (!object.isMesh) return;
    
    if (object.geometry) {
      object.geometry.dispose();
    }
    
    if (object.material) {
      if (Array.isArray(object.material)) {
        object.material.forEach((mat) => disposeMaterial(mat));
      } else {
        disposeMaterial(object.material);
      }
    }
  });
  
  if (renderer) {
    renderer.dispose();
  }
}

function disposeMaterial(material) {
  if (!material) return;
  Object.keys(material).forEach((prop) => {
    if (!material[prop]) return;
    if (material[prop].isTexture) {
      material[prop].dispose();
    }
  });
  material.dispose();
}
