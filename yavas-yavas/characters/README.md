# Characters (sources)
`build_char.py` builds William or Nesrin in Blender (`python3 -I build_char.py william|nesrin`, bpy) and exports the .glb with six animations. `william.blend` / `nesrin.blend` are the saved results. Copy the exported .glb files into `../app/models/`, bump `VERSION` in `../app/sw.js`, and regenerate `istanbul-bench-poster.jpg`.
Characters face -Y in Blender (+Z in glTF). Bench seat height is about 0.45 m. The script writes to `/home/claude/yy`; change `OUT` at the top for your machine.
