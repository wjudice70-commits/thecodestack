/* Yavaş Yavaş: the rigged 3D William and Nesrin (models/william.glb, models/nesrin.glb).
   Built from characters/build_char.py. Characters face +Z in glTF, 18 bones, six clips each:
   idle_stand, walk, sit_down, idle_seated, turn_180, wave.
   The rig is driven by time, never by a running clock: pose({ clip: [time, weight] }) sets exactly
   what to show, so seeking, skipping and reduced-motion stills all land on the right frame. */
import { THREE } from "./kit.js";
import { GLTFLoader } from "../vendor/GLTFLoader.js";
import { mergeGeometries } from "../vendor/BufferGeometryUtils.js";

export const CLIPS = ["idle_stand", "walk", "sit_down", "idle_seated", "turn_180", "wave"];
const url = (kind) => new URL(`../../models/${kind}.glb`, import.meta.url).href;

// The GLBs hold about 112 small skinned meshes each. Merge them per material so a phone draws ~16 instead.
// Falls back to the untouched meshes if anything about the model doesn't fit.
function mergeByMaterial(root) {
  const skinned = [];
  root.traverse((o) => { if (o.isSkinnedMesh) skinned.push(o); });
  if (!skinned.length) return;
  const skeleton = skinned[0].skeleton;
  if (!skinned.every((m) => m.skeleton === skeleton && !Array.isArray(m.material))) return;
  const groups = new Map();
  for (const m of skinned) (groups.get(m.material) || groups.set(m.material, []).get(m.material)).push(m);
  const made = [];
  for (const [mat, list] of groups) {
    const geo = mergeGeometries(list.map((m) => m.geometry), false);
    if (!geo) { made.forEach((s) => s.geometry.dispose()); return; }   // mismatch: keep the originals
    const sm = new THREE.SkinnedMesh(geo, mat);
    sm.name = mat.name || "part";
    sm.bind(skeleton, list[0].bindMatrix);
    made.push(sm);
    sm.userData.from = list;
  }
  for (const sm of made) {
    const list = sm.userData.from; delete sm.userData.from;
    list[0].parent.add(sm);
    for (const m of list) { m.parent.remove(m); m.geometry.dispose(); }
  }
}

export class Character {
  constructor(kind, gltf) {
    this.kind = kind;
    this.root = new THREE.Group(); this.root.name = kind;
    this.model = gltf.scene; this.root.add(this.model);
    mergeByMaterial(this.model);
    this.bones = {};
    let skel = null;
    this.model.traverse((o) => {
      if (o.isSkinnedMesh) {
        skel ||= o.skeleton;
        o.frustumCulled = false;            // the bounding sphere is the bind pose; the sit pose moves outside it
        o.castShadow = true; o.receiveShadow = true;
        const m = o.material;
        m.envMapIntensity = .85;
        if (m.transparent) { m.depthWrite = false; o.renderOrder = 2; }
      }
    });
    // three.js strips dots from node names ("foot.L" becomes "footL"); accept both spellings.
    skel?.bones.forEach((b) => { this.bones[b.name] = b; this.bones[b.name.replace(/([a-z])(L|R)$/, "$1.$2")] = b; });
    this.mixer = new THREE.AnimationMixer(this.model);
    this.clips = {}; this.actions = {};
    const pre = kind.toUpperCase() + "_";
    for (const c of gltf.animations) {
      const name = c.name.startsWith(pre) ? c.name.slice(pre.length) : c.name;
      this.clips[name] = c.duration;
      const a = this.mixer.clipAction(c);
      a.play(); a.setEffectiveWeight(0); a.setEffectiveTimeScale(0);   // we set .time ourselves
      this.actions[name] = a;
    }
    this.look = 0;                           // extra head yaw in radians (+ turns towards world +X when facing +Z)
    this.lookPitch = 0;
  }

  // Show exactly this: { clip: [time, weight] }. Looping clips wrap; the rest clamp.
  pose(spec) {
    for (const name in this.actions) {
      const a = this.actions[name], s = spec[name], d = this.clips[name];
      if (!s || s[1] <= 0) { a.setEffectiveWeight(0); continue; }
      const loops = name === "walk" || name.startsWith("idle");
      a.time = loops ? ((s[0] % d) + d) % d : Math.min(Math.max(s[0], 0), d - 1e-3);
      a.setEffectiveWeight(s[1]);
    }
    this.mixer.update(0);
    this.applyLook();
  }

  // Turn the head by a world-space yaw/pitch on top of whatever the clip is doing.
  applyLook() {
    const h = this.bones.head; if (!h || (!this.look && !this.lookPitch)) return;
    h.parent.updateWorldMatrix(true, false);
    const pq = h.parent.getWorldQuaternion(_q1), hq = _q2.copy(pq).multiply(h.quaternion);
    const yaw = _q3.setFromAxisAngle(_Y, this.look);
    const pitch = _q4.setFromAxisAngle(_X, this.lookPitch);
    // yaw and pitch are in the character's own frame (its facing), so use the root's world rotation.
    const rq = this.root.getWorldQuaternion(_q5);
    const world = _q6.copy(rq).multiply(yaw).multiply(pitch).multiply(_q7.copy(rq).invert()).multiply(hq);
    h.quaternion.copy(pq.invert().multiply(world));
  }

  // World-ish measurements of a pose, with the root at the origin facing +Z.
  measure(spec) {
    const keep = [this.root.position.clone(), this.root.quaternion.clone(), this.look, this.lookPitch];
    this.root.position.set(0, 0, 0); this.root.quaternion.identity(); this.look = this.lookPitch = 0;
    this.pose(spec); this.root.updateMatrixWorld(true);
    const p = (n) => this.bones[n].getWorldPosition(new THREE.Vector3());
    const out = { hips: p("hips"), head: p("head"), footL: p("foot.L"), footR: p("foot.R"), shinL: p("shin.L"), thighL: p("thigh.L") };
    this.root.position.copy(keep[0]); this.root.quaternion.copy(keep[1]); this.look = keep[2]; this.lookPitch = keep[3];
    return out;
  }

  dispose() {
    this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model);
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      for (const m of [].concat(o.material || [])) { m.map?.dispose(); m.dispose(); }
    });
    this.root.removeFromParent();
  }
}
const _Y = new THREE.Vector3(0, 1, 0), _X = new THREE.Vector3(1, 0, 0);
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _q3 = new THREE.Quaternion(), _q4 = new THREE.Quaternion();
const _q5 = new THREE.Quaternion(), _q6 = new THREE.Quaternion(), _q7 = new THREE.Quaternion();

// Loads one character. Rejects if the file is missing or the model is broken, so callers can fall back.
export async function loadCharacter(kind) {
  const gltf = await new GLTFLoader().loadAsync(url(kind));
  if (!gltf.animations?.length || !gltf.scene) throw new Error(`${kind}.glb has no rig or animations`);
  return new Character(kind, gltf);
}
