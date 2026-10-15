/* İstanbul: the set and the four scrapbook clips.
   The historic peninsula with its great domes and minarets, Galata Tower, the Bosphorus and its bridge,
   the Asian shore, and the towers of the new city reimagined as emerald spires. */
export default {
  id: "istanbul",
  sky: { hor: 0x5a2010, mid: 0x18050a, top: 0x040205, sunCol: 0xffa860 },
  bench: { pos: null, yaw: 0 }, // Gülhane Park; position set in build

  build(A) {
    const { THREE, K, M, pop, cityGrp, CY } = A;
    const V3 = K.V3, R = K.rng(41);
    this.bench.pos = V3(150, CY, 50);

    // Keep clear the places where the clips are filmed.
    const clear = [[34, 72, 24], [-70, 64, 12], [-140, 40, 28], [150, 50, 14], [100, 143, 8], [45, 92, 9], [-40, 118, 26], [5, 128, 26], [-95, 100, 22]];
    const free = (x, z, r = 0) => clear.every(([cx, cz, cr]) => Math.hypot(x - cx, z - cz) > cr + r);

    // The Bosphorus: a dark mirror with the lights of both shores on it.
    const water = new THREE.Mesh(new THREE.PlaneGeometry(800, 42), M.water); water.rotation.x = -Math.PI / 2; water.position.set(0, CY - .25, 170); cityGrp.add(water);
    const glints = K.bokehField(A.phone ? 160 : 320, [-300, 300, CY - .2, CY - .1, 151, 189], 12, [0xffb36b, 0xffd9a0]);
    glints.userData.u.scale.value = 260; cityGrp.add(glints); this.glints = glints;

    // The old city: great mosques first, they rise first.
    pop(K.mosque(M, { r: 11, minarets: 6 }), -40, 118, 1.2);                          // Sultanahmet
    const sofia = K.mosque(M, { r: 13, minarets: 4, minH: 50 }); pop(sofia, 5, 128, 1.6); // Ayasofya
    const sul = new THREE.Group(); const terr = new THREE.Mesh(new THREE.BoxGeometry(46, 6, 46), M.darkStone); terr.position.y = 3; sul.add(terr);
    const sm = K.mosque(M, { r: 12, minarets: 4, minH: 58 }); sm.position.y = 6; sul.add(sm); pop(sul, -95, 100, 1.4); // Süleymaniye

    // Galata Tower
    const gal = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 5, 44, 32), M.stone); shaft.position.y = 22; gal.add(shaft);
    for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.CylinderGeometry(4.45, 4.45, 1.2, 32, 1, true), M.window); w.position.y = 10 + i * 8.5; w.scale.set(1, 1, 1); gal.add(w); }
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(5.4, 4.6, 1.4, 32), M.gold); gallery.position.y = 44; gal.add(gallery);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(4.3, 4.3, 4, 32, 1, true), M.window); glass.position.y = 46.5; gal.add(glass);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(4.9, 15, 32), M.patina); roof.position.y = 56; gal.add(roof);
    const gf = K.finial(1.4, M); gf.position.y = 63.4; gal.add(gf);
    pop(gal, 45, 92, 2.2);

    // Maiden's Tower, alone in the strait.
    const kiz = new THREE.Group(); const isl = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 3, 24), M.darkStone); isl.position.y = 1.2; kiz.add(isl);
    const kb = K.block(9, 8, 7, M, 3, M.gold); kb.position.y = 2.5; kiz.add(kb); const kt = K.minaret(16, 1.6, M, 1); kt.position.set(2, 2.5, 0); kiz.add(kt);
    pop(kiz, -18, 172, 3);

    // The bridge: gold pylons, lights strung along the cables.
    const br = new THREE.Group();
    for (const z of [-34, 34]) for (const x of [-7, 7]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.2, 70, 3), M.gold); p.position.set(x, 35, z); br.add(p); }
    for (const z of [-34, 34]) { const t = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 3), M.gold); t.position.set(0, 66, z); br.add(t); }
    const deck = new THREE.Mesh(new THREE.BoxGeometry(14, 2.4, 150), M.darkStone); deck.position.y = 32; br.add(deck);
    const beads = [];
    for (const x of [-7, 7]) {
      const pts = []; for (let i = 0; i <= 40; i++) { const z = -75 + i * 150 / 40, a = Math.abs(z) < 34 ? 66 - 30 * (1 - (z / 34) ** 2) : 66 - 32 * ((Math.abs(z) - 34) / 41); pts.push(V3(x, Math.max(34, a), z)); }
      const cv = new THREE.CatmullRomCurve3(pts); br.add(new THREE.Mesh(new THREE.TubeGeometry(cv, 80, .35, 6), M.gold));
      for (let i = 0; i <= 60; i++) beads.push(cv.getPoint(i / 60));
    }
    const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(.7, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), beads.length);
    const d = new THREE.Object3D(); beads.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); bm.setMatrixAt(i, d.matrix); }); br.add(bm);
    pop(br, 175, 170, 3.4, -.5);

    // Rooftops of both shores, lit windows, copper and gold cornices.
    const trims = [M.copper, M.gold, M.copper, M.darkStone];
    for (let i = 0; i < (A.phone ? 110 : 170); i++) {
      const asian = R() < .38;
      const x = K.lerp(-240, 240, R()), z = asian ? K.lerp(196, 300, R()) : K.lerp(48, 146, R());
      if (!free(x, z, 6)) continue;
      const w = K.lerp(7, 16, R()), h = K.lerp(6, asian ? 22 : 16, R()) * (1 + (asian ? (z - 196) / 60 : 0)), dd = K.lerp(7, 14, R());
      pop(K.block(w, h, dd, M, i, trims[i % 4]), x, z, undefined, (R() - .5) * .3);
    }
    // The Asian shore's hill, crowned by Çamlıca.
    const cam = new THREE.Group(); const hillB = new THREE.Mesh(new THREE.CylinderGeometry(40, 70, 26, 32), M.darkStone); hillB.position.y = 13; cam.add(hillB);
    const cmq = K.mosque(M, { r: 12, minarets: 6, minH: 60 }); cmq.position.y = 26; cam.add(cmq); pop(cam, 90, 272, 1);

    // The new city, reimagined: emerald spires ribbed in gold.
    [[-150, 300, 110], [-132, 288, 86], [-118, 306, 128], [-104, 292, 74], [-168, 284, 66], [-90, 310, 96], [128, 318, 150]].forEach(([x, z, h], i) => {
      pop(K.spire(h, K.lerp(5, 9, (i * .37) % 1), M), x, z, .9 + i * .12);
    });
    // Paper-cut hills behind everything, like the back pages of a pop-up book.
    pop(K.cardLayer(760, 48, 3, M.copper), 0, 340, .6);
    pop(K.cardLayer(760, 70, 7, M.gold), 0, 380, .4);
    const far = K.bokehField(A.phone ? 220 : 420, [-320, 320, CY + 2, CY + 46, 330, 420], 5); cityGrp.add(far); this.far = far;
  },

  clips(A) {
    const { THREE, K, P, M, scene, CY, nes, nine } = A;
    const V3 = K.V3, R = K.rng(9);
    const tone = (c) => { const wt = K.windowTex(c & 255, 3, 3, .55); return new THREE.MeshStandardMaterial({ color: c, roughness: .8, emissive: 0xffffff, emissiveMap: wt, emissiveIntensity: 1.2, envMap: A.env, envMapIntensity: .3 }); };
    const cobble = K.canvasTex(512, 512, (x, w, h) => {
      x.fillStyle = "#1a1512"; x.fillRect(0, 0, w, h); const r = K.rng(4);
      for (let j = 0; j < 22; j++) for (let i = 0; i < 16; i++) { const ox = (j % 2) * 16; x.fillStyle = `hsl(25,${12 + r() * 10}%,${16 + r() * 12}%)`; x.beginPath(); x.ellipse(i * 32 + ox + 16, j * 24 + 12, 14, 10, 0, 0, 7); x.fill(); }
    });
    cobble.wrapS = cobble.wrapT = THREE.RepeatWrapping; cobble.repeat.set(6, 6);
    const street = (x0, x1, z0, z1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), new THREE.MeshStandardMaterial({ map: cobble, roughness: .55, metalness: .1, envMap: A.env, envMapIntensity: .5 })); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, CY + .01, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); };
    const sp = (s) => P.SPEED[s] ?? 1;

    /* 1. Galata Tower at dusk */
    street(14, 56, 50, 84);
    const tones = [0x5a2a24, 0x6a5228, 0x1f3a30, 0x6a3a3a, 0x3a2a24];
    for (let i = 0; i < 4; i++) { const s = i < 2 ? -1 : 1; const h = K.block(6.5, 10 + i % 2 * 3, 7, M, i, M.copper, tone(tones[i])); h.position.set(34 + s * 11, CY, 68 + (i % 2) * 8); scene.add(h); }
    const gl = K.lamp(M, false); gl.position.set(31, CY, 63.5); scene.add(gl);

    /* 2. Nine with her red umbrella, on a Balat street */
    street(-77, -63, 44, 90);
    for (let i = 0; i < 6; i++) for (const s of [-1, 1]) {
      const h = K.block(6, 8 + (i * 7 + s) % 3 * 2, 7.5, M, i + 10, M.copper, tone(tones[(i + (s > 0 ? 2 : 0)) % 5]));
      h.position.set(-70 + s * 10.2, CY, 48 + i * 7.6); scene.add(h);
      const bay = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.6, 3.2), tone(tones[(i + 3) % 5])); bay.position.set(-70 + s * 6.6, CY + 5, 48 + i * 7.6); scene.add(bay);
    }
    const nl = K.lamp(M, true); nl.position.set(-66.4, CY, 75); nl.userData.light.intensity = 10; scene.add(nl);

    /* 3. Simit and tea at the ferry pier */
    const T = V3(100, CY, 143);
    const table = new THREE.Group(); table.position.copy(T); scene.add(table);
    const marble = new THREE.MeshStandardMaterial({ color: 0xd8d0c4, roughness: .25, envMap: A.env, envMapIntensity: .8 });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.36, .36, .03, 40), marble); top.position.y = .72; top.receiveShadow = true; table.add(top);
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(.03, .2, .72, 12), M.iron); ped.position.y = .36; table.add(ped);
    const glassM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, roughness: .04, thickness: .004, ior: 1.5, envMap: A.env, envMapIntensity: 1.2, transparent: true });
    const tulipGlass = K.lathe([[.0, 0], [.021, 0], [.022, .006], [.018, .03], [.016, .05], [.021, .08], [.026, .1], [.0262, .102]], 32);
    const tea = new THREE.Group(); tea.position.set(.05, .735, -.04); table.add(tea);
    const sauc = new THREE.Mesh(new THREE.CylinderGeometry(.06, .045, .008, 32), new THREE.MeshStandardMaterial({ color: 0xf2ede4, roughness: .3, envMap: A.env })); tea.add(sauc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(.058, .0025, 6, 40), new THREE.MeshStandardMaterial({ color: 0xa0141e, roughness: .4 })); rim.rotation.x = Math.PI / 2; rim.position.y = .004; tea.add(rim);
    const cup = new THREE.Group(); cup.position.y = .005; tea.add(cup);
    cup.add(new THREE.Mesh(tulipGlass, glassM));
    const liquid = new THREE.Mesh(K.lathe([[.0, .004], [.019, .004], [.017, .03], [.015, .05], [.019, .072], [.0005, .072]], 32), new THREE.MeshStandardMaterial({ color: 0x7a1a08, roughness: .1, emissive: 0x5a1404, emissiveIntensity: .6, transparent: true, opacity: .92 }));
    cup.add(liquid);
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(.11, .08, .01, 32), new THREE.MeshStandardMaterial({ color: 0xe8e0d4, roughness: .35, envMap: A.env })); plate.position.set(-.13, .74, .02); table.add(plate);
    const simit = new THREE.Mesh(new THREE.TorusGeometry(.062, .019, 16, 48), new THREE.MeshStandardMaterial({ color: 0x9a4a1a, roughness: .55, envMap: A.env, envMapIntensity: .4 }));
    simit.rotation.x = Math.PI / 2; simit.position.set(-.13, .765, .02); simit.scale.z = .8; table.add(simit);
    const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(.0028, 5, 4), new THREE.MeshStandardMaterial({ color: 0xf0dcb0, roughness: .6 }), 260);
    for (let i = 0; i < 260; i++) { const a = R() * Math.PI * 2, b = R() * Math.PI * 1.1 - .1; const d = new THREE.Object3D(); d.position.set(Math.cos(a) * (.062 + .019 * Math.cos(b)), Math.sin(b) * .019 * .8 + .006, Math.sin(a) * (.062 + .019 * Math.cos(b))); d.rotation.set(R() * 3, R() * 3, R() * 3); d.scale.set(1, .6, .6); d.updateMatrix(); seeds.setMatrixAt(i, d.matrix); }
    seeds.position.set(-.13, .759, .02); table.add(seeds);
    const chair = new THREE.Group(); const cs = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .04, 24), M.wood); cs.position.y = .45; chair.add(cs);
    const cleg = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .45, 8), M.iron); cleg.position.y = .225; chair.add(cleg); chair.position.copy(T).add(V3(0, 0, -.55)); scene.add(chair);
    const steamTex = K.canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, "rgba(255,240,225,.5)"); g.addColorStop(1, "rgba(255,240,225,0)"); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    const steam = Array.from({ length: 14 }, (_, i) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: steamTex, transparent: true, depthWrite: false, opacity: 0 })); s.userData.ph = i / 14; scene.add(s); return s; });
    const pierLamp = K.lamp(M, false); pierLamp.position.copy(T).add(V3(1.6, 0, .6)); scene.add(pierLamp);

    /* 4. The Tulip Festival at Emirgan */
    const F = V3(-140, CY, 40);
    const n = A.phone ? 2200 : 4200;
    const cupG = K.lathe([[.0, 0], [.022, .006], [.03, .03], [.028, .058], [.021, .078]], 10);
    const cups = new THREE.InstancedMesh(cupG, new THREE.MeshStandardMaterial({ roughness: .55, side: THREE.DoubleSide, emissive: 0x2a0606, envMap: A.env, envMapIntensity: .4 }), n);
    const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.004, .006, 1, 4), new THREE.MeshStandardMaterial({ color: 0x2a3a18, roughness: .8 }), n);
    const tc = [0xa0141e, 0xc8202a, 0xd9a54a, 0x8f1d2e, 0xf0d8b0, 0xe0603a], c = new THREE.Color(), d = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      let x, z; do { x = K.lerp(-20, 20, R()); z = K.lerp(-14, 14, R()); } while (Math.abs(z) < 1.1);
      const h = K.lerp(.32, .5, R());
      d.position.set(F.x + x, CY + h, F.z + z); d.rotation.set((R() - .5) * .3, R() * 6, (R() - .5) * .3); d.scale.setScalar(K.lerp(.9, 1.25, R())); d.updateMatrix(); cups.setMatrixAt(i, d.matrix);
      c.set(tc[(Math.floor((x + 40) / 5) + Math.floor((z + 20) / 4) * 3) % tc.length]).multiplyScalar(K.lerp(.75, 1.1, R())); cups.setColorAt(i, c);
      d.position.set(F.x + x, CY + h / 2, F.z + z); d.rotation.set(0, 0, 0); d.scale.set(1, h, 1); d.updateMatrix(); stems.setMatrixAt(i, d.matrix);
    }
    cups.castShadow = false; scene.add(cups, stems);
    const pathM = new THREE.Mesh(new THREE.PlaneGeometry(44, 2), new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1 })); pathM.rotation.x = -Math.PI / 2; pathM.position.set(F.x, CY + .02, F.z); scene.add(pathM);
    const bulbs = [];
    for (const s of [-1, 1]) {
      const pts = []; for (let i = 0; i <= 6; i++) { const x = F.x - 18 + i * 6; const pole = new THREE.Mesh(new THREE.CylinderGeometry(.04, .05, 3.2, 6), M.iron); pole.position.set(x, CY + 1.6, F.z + s * 1.6); scene.add(pole); pts.push(V3(x, CY + 3.1, F.z + s * 1.6)); }
      for (let i = 0; i < pts.length - 1; i++) for (let k = 1; k < 8; k++) { const p = pts[i].clone().lerp(pts[i + 1], k / 8); p.y -= Math.sin(k / 8 * Math.PI) * .5; bulbs.push(p); }
    }
    const bulbM = new THREE.InstancedMesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc070 }), bulbs.length);
    bulbs.forEach((p, i) => { d.position.copy(p); d.rotation.set(0, 0, 0); d.scale.setScalar(1); d.updateMatrix(); bulbM.setMatrixAt(i, d.matrix); }); scene.add(bulbM);
    const fest = K.bokehField(A.phone ? 80 : 140, [F.x - 30, F.x + 30, CY + .5, CY + 4, F.z + 16, F.z + 40], 21, [0xffc070, 0xa0141e, 0xd9a54a]); scene.add(fest);

    const nh = (F2) => A.head(F2);
    return [
      {
        dur: 7, still: 4,
        update: (lt, k) => {
          const m = A.clipMode(), x = 38 - sp(m) * lt * .9, pos = V3(x, CY, 66);
          A.placeN(pos, -Math.PI / 2, m, lt + 3, sp(m) * lt);
          A.cam(V3(31 - k * 1.2, CY + 1.3, 54), V3(40, CY + 16, 92), 34, pos.clone().setY(CY + 1));
          A.post.aperture = 2.8; A.shadowAt(pos, 4);
        },
      },
      {
        dur: 8, still: 6,
        enter: () => { nine.root.visible = true; },
        update: (lt, k) => {
          const m = A.clipMode(), stopZ = 72.75, walk = 4.2, z = Math.min(stopZ, stopZ - sp(m) * (walk - lt));
          const pos = V3(-70, CY, z); A.placeN(pos, 0, lt < walk ? m : "stand", lt, sp(m) * lt);
          nine.root.position.set(-70.05, CY, 73.65); nine.root.rotation.y = Math.PI;
          P.gait(nine, "walk", 0, { time: lt }); nine.j.spine.rotation.x = .16; nine.j.neck.rotation.x = -.05;
          nine.j.sR.rotation.x = -.35; nine.j.sR.rotation.z = .25; nine.j.eR.rotation.x = -1.6; nine.j.wR.rotation.x = 1.2;
          const hug = K.smooth(walk - .4, walk + 1.4, lt);
          if (hug > 0) {
            const nb = nes.j.sL.getWorldPosition(new THREE.Vector3()), nsh = nes.j.sR.getWorldPosition(new THREE.Vector3());
            P.reach(nine, "L", nine.j.wL.getWorldPosition(new THREE.Vector3()).lerp(nb.add(V3(0, -.02, -.1)), hug));
            const g1 = nine.j.sL.getWorldPosition(new THREE.Vector3()).add(V3(0, 0, -.08)), g2 = nine.j.sR.getWorldPosition(new THREE.Vector3()).add(V3(0, -.12, -.1));
            if (A.mode() !== "walker") { P.reach(nes, "L", nes.j.wL.getWorldPosition(new THREE.Vector3()).lerp(g1, hug)); P.reach(nes, "R", nes.j.wR.getWorldPosition(new THREE.Vector3()).lerp(g2, hug * .9)); }
            void nsh;
          }
          P.face(nine, { smile: .8 });
          A.cam(V3(-68.6 + k * .3, CY + 1.2, 58 + k * 1.2), V3(-70, CY + 1.6, 73.2), 20, V3(-70, CY + 1.3, 73.2));
          A.post.aperture = 3.2; A.shadowAt(pos, 4);
        },
      },
      {
        dur: 7, still: 3.6,
        update: (lt, k) => {
          const m = A.mode() === "wheelchair" ? "wheelchair" : "sit";
          chair.visible = A.mode() !== "wheelchair";
          A.placeN(T.clone().add(V3(0, 0, -.58)), 0, m === "wheelchair" ? "stand" : "sit", lt);
          if (m === "sit") P.seated(nes, .47);
          nes.j.spine.rotation.x = .18; nes.j.neck.rotation.x = .25;
          // She reaches for the tea, lifts it a little, sets it down.
          const reachK = K.smooth(1, 2.6, lt), lift = K.smooth(3, 4.2, lt) * (1 - K.smooth(5.4, 6.4, lt));
          const glassW = table.localToWorld(V3(.05, .735, -.04));
          cup.position.y = .005 + lift * .06; cup.position.z = -lift * .02;
          const hand = glassW.clone().add(V3(.022, .05 + lift * .06, -.01 - lift * .02));
          const restH = T.clone().add(V3(.05, .78, -.24));
          P.reach(nes, "L", restH.clone().lerp(hand, reachK));
          P.reach(nes, "R", T.clone().add(V3(-.12, .78, -.22)));
          steam.forEach((s, i) => { const a = ((lt * .35 + s.userData.ph) % 1); s.position.copy(glassW).add(V3(Math.sin(a * 6 + i) * .01, .1 + lift * .06 + a * .16, -lift * .02)); s.scale.setScalar(.03 + a * .07); s.material.opacity = Math.sin(a * Math.PI) * .32; });
          A.cam(V3(T.x + .95 - k * .08, CY + 1.05, T.z + .55), glassW.clone().add(V3(-.08, .02, 0)), 26, glassW);
          A.post.aperture = 6; A.shadowAt(T, 2);
          if (this.glints) this.glints.userData.u.time.value = lt;
        },
      },
      {
        dur: 7, still: 4.5,
        update: (lt, k) => {
          const m = A.clipMode(), x = F.x - 6 + sp(m) * lt * .8, pos = V3(x, CY, F.z);
          A.placeN(pos, Math.PI / 2, m, lt, sp(m) * lt);
          A.cam(V3(x - 3.2 + k * .4, CY + .62, F.z - 4.4), V3(x + .4, CY + .95, F.z), 26, V3(x, CY + .9, F.z));
          A.post.aperture = 7; A.shadowAt(pos, 4);
          fest.userData.u.time.value = lt;
        },
      },
    ];
  },
};
