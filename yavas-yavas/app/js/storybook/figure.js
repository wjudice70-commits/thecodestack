/* Yavaş Yavaş storybook: Nesrin as a silhouette cut from the dusk, rim-lit in gold. Never a face.
   Seen from the side, walking to the right. The way she moves follows her recovery: wheelchair,
   walker, crutches, walking, running. Drawn with strokes on a 2D canvas, about 150 units tall. */
const { lerp } = YY;

const TAU = Math.PI * 2;
const pt = (x, y, a, l) => [x + Math.sin(a) * l, y + Math.cos(a) * l];

// One pose of the body. p is the stride phase (0..1), m the mode.
function pose(m, p) {
  const s = Math.sin(p * TAU), c2 = Math.cos(p * TAU);
  const run = m === "run", aid = m === "walker" || m === "crutches";
  const swing = run ? .62 : m === "walk" ? .36 : aid ? .2 : 0;
  return {
    lean: run ? .2 : m === "walker" ? .16 : m === "crutches" ? .1 : .04,
    bob: run ? Math.abs(s) * 6 : Math.abs(s) * 2.2,
    hipF: s * swing, hipB: -s * swing,
    kneeF: Math.max(0, -c2) * (run ? 1.3 : .5) + .05, kneeB: Math.max(0, c2) * (run ? 1.3 : .5) + .05,
    armF: run ? -s * .9 : -s * swing * 1.1, armB: run ? s * .9 : s * swing * 1.1, elbow: run ? 1.6 : .35,
  };
}

function body(c, m, p, x, y, S) {
  const L = (v) => v * S, P = pose(m, p);
  const hipY = y - L(78) - P.bob, hipX = x;
  const shX = hipX + Math.sin(P.lean) * L(50), shY = hipY - Math.cos(P.lean) * L(50);
  c.lineCap = "round"; c.lineJoin = "round";
  // legs: wide trousers, so thick at the hip and the hem
  const leg = (hip, knee) => {
    const k = pt(hipX, hipY, hip, L(38)), f = pt(k[0], k[1], hip - knee, L(38));
    c.lineWidth = L(15); c.beginPath(); c.moveTo(hipX, hipY); c.lineTo(k[0], k[1]); c.stroke();
    c.lineWidth = L(16); c.beginPath(); c.moveTo(k[0], k[1]); c.lineTo(f[0], f[1]); c.stroke();
    c.beginPath(); c.ellipse(f[0] + L(4), f[1] + L(2), L(8), L(4), 0, 0, TAU); c.fill();
  };
  if (m === "wheelchair") {
    // seated: thighs forward, shins down
    c.lineWidth = L(15); c.beginPath(); c.moveTo(hipX, hipY + L(30)); c.lineTo(hipX + L(34), hipY + L(30)); c.lineTo(hipX + L(38), hipY + L(64)); c.stroke();
    c.beginPath(); c.ellipse(hipX + L(43), hipY + L(68), L(8), L(4), 0, 0, TAU); c.fill();
  } else { leg(P.hipB, P.kneeB); leg(P.hipF, P.kneeF); }
  const sy = m === "wheelchair" ? L(30) : 0;
  // torso
  c.lineWidth = L(22); c.beginPath(); c.moveTo(hipX, hipY + sy - L(4)); c.lineTo(shX, shY + sy + L(6)); c.stroke();
  // head, with her messy bun high on the back
  const hx = shX + Math.sin(P.lean) * L(17), hy = shY + sy - L(17);
  c.beginPath(); c.arc(hx, hy, L(10), 0, TAU); c.fill();
  c.beginPath(); c.arc(hx - L(6), hy - L(9), L(6.5), 0, TAU); c.fill();
  c.lineWidth = L(1.4); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(hx - L(5), hy - L(12)); c.lineTo(hx - L(8 + i * 2.5), hy - L(16 + (i % 2) * 3)); c.stroke(); }
  c.lineWidth = L(7); c.beginPath(); c.moveTo(shX, shY + sy); c.lineTo(hx - L(1), hy + L(6)); c.stroke();
  return { hipX, hipY, shX, shY: shY + sy, P, L };
}

function arm(c, from, a, elbow, L, hand) {
  const e = pt(from[0], from[1], a, L(30)), h = hand || pt(e[0], e[1], a + elbow, L(28));
  c.lineWidth = L(7.5); c.beginPath(); c.moveTo(from[0], from[1]); c.lineTo(e[0], e[1]); c.lineTo(h[0], h[1]); c.stroke();
  return h;
}

// Draw the whole figure in the current fill/stroke style.
function draw(c, m, p, x, y, S) {
  const L = (v) => v * S;
  if (m === "wheelchair") {
    const roll = p * TAU;
    const wx = x - L(4), wy = y - L(34), r = L(34);
    c.lineWidth = L(4); c.beginPath(); c.arc(wx, wy, r, 0, TAU); c.stroke();
    c.lineWidth = L(1.5); for (let i = 0; i < 8; i++) { const a = roll + i / 8 * Math.PI; c.beginPath(); c.moveTo(wx - Math.cos(a) * r, wy - Math.sin(a) * r); c.lineTo(wx + Math.cos(a) * r, wy + Math.sin(a) * r); c.stroke(); }
    c.lineWidth = L(4); c.beginPath(); c.moveTo(x - L(16), y - L(110)); c.lineTo(x - L(10), y - L(50)); c.lineTo(x + L(36), y - L(50)); c.lineTo(x + L(42), y - L(10)); c.stroke();
    c.beginPath(); c.arc(x + L(42), y - L(6), L(6), 0, TAU); c.stroke();
    const b = body(c, "wheelchair", p, x, y + L(28), S);
    const push = Math.sin(roll) * .5;
    arm(c, [b.shX, b.shY + L(4)], .5 + push, .4, L, [wx + Math.cos(-1 + push) * r * .9, wy + Math.sin(-1 + push) * r * .9]);
    return;
  }
  const b = body(c, m, p, x, y, S), sh = [b.shX, b.shY + L(5)];
  if (m === "walker") {
    const fx = x + L(46), top = y - L(78);
    c.lineWidth = L(3.5); c.beginPath(); c.moveTo(fx - L(8), y); c.lineTo(fx - L(4), top); c.lineTo(fx + L(22), top); c.lineTo(fx + L(26), y); c.stroke();
    c.beginPath(); c.arc(fx - L(8), y - L(3), L(4), 0, TAU); c.arc(fx + L(26), y - L(3), L(4), 0, TAU); c.fill();
    arm(c, sh, 1.1, .5, L, [fx - L(2), top + L(2)]); arm(c, sh, 1.2, .4, L, [fx + L(4), top]);
  } else if (m === "crutches") {
    const sw = Math.sin(p * TAU) * .18;
    for (const k of [0, 1]) {
      const fx = x + L(30) + Math.sin(sw + k * .1) * L(30), top = [b.shX + L(4), b.shY + L(16)];
      c.lineWidth = L(3.2); c.beginPath(); c.moveTo(fx, y); c.lineTo(top[0], top[1]); c.stroke();
      c.lineWidth = L(5); c.beginPath(); c.moveTo(top[0] - L(6), top[1] - L(2)); c.lineTo(top[0] + L(6), top[1] + L(2)); c.stroke();
      arm(c, sh, .45 + k * .1, .1, L, [lerp(top[0], fx, .32), lerp(top[1], y, .32)]);
    }
  } else {
    arm(c, sh, b.P.armB, b.P.elbow, L); arm(c, sh, b.P.armF, b.P.elbow, L);
  }
}

// Paint her: a gold rim on the side facing the light, then the dark silhouette over it.
export function figure(c, mode, phase, x, y, S, o = {}) {
  const ink = o.ink || "#120a10", rim = o.rim || "#f3c66f", lx = o.light ?? 1;
  c.save();
  c.shadowColor = o.glow || "rgba(255,190,110,.45)"; c.shadowBlur = 14 * S;
  c.fillStyle = c.strokeStyle = rim; c.globalAlpha = o.alpha ?? 1;
  draw(c, mode, phase, x + lx * 1.6 * S, y - .8 * S, S);
  c.shadowBlur = 0; c.fillStyle = c.strokeStyle = ink;
  draw(c, mode, phase, x, y, S);
  c.restore();
}
// Ground speed in units per stride for each mode, so steps don't slide.
export const STRIDE = { run: 150, walk: 95, crutches: 60, walker: 45, wheelchair: 110 };
export const CADENCE = { run: 1.45, walk: .95, crutches: .6, walker: .5, wheelchair: .45 };
