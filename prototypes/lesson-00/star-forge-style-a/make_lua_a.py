"""PROTOTYPE: generate the Resolve Lua (probe + final) from the template and the Manim beat log.
Run: python3 make_lua_a.py   -> star_forge_style_a_probe_PROTOTYPE.lua, star_forge_style_a_PROTOTYPE.lua"""
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
beats = json.loads((HERE / "out/manim/beats-16x9.json").read_text())["beats"]
CONTACT = round(beats["contact"] * 30)
TOTAL = round(beats["end"] * 30)
# Restrained finish: bloom only on the brightest things, grain barely there, a soft edge darkening.
LOOK = """{ glowThreshold = 0.62, glowGain = 0.38, glowSize = 8, grain = 0.02, grainSize = 0.8,
    vigSoft = 0.45, vigGain = 0.72, vig = { ["16x9"] = {1.25, 0.8}, ["9x16"] = {0.95, 1.6} } }"""
FLASH = '{ type = "Glow", category = "fusion", dur = 10 }'
tpl = (HERE / "star_forge_style_a.lua.in").read_text()
for mode, name, marker in (("probe", "star_forge_style_a_probe_PROTOTYPE.lua", "STYLE_A_PROBE"),
                           ("final", "star_forge_style_a_PROTOTYPE.lua", "STYLE_A")):
    s = (tpl.replace("__MODE__", mode).replace("__CONTACT__", str(CONTACT)).replace("__TOTAL__", str(TOTAL))
         .replace("__LOOK__", LOOK).replace("__FLASH__", FLASH).replace("__MARKER__", marker))
    assert "__" not in s.replace("__index", ""), "unfilled placeholder"
    (HERE / name).write_text(s)
    print(name, "contact", CONTACT, "total", TOTAL)
