-- PROTOTYPE (throwaway): does Lua get Resolve's scripting API on free 21.1?
-- free 21.1 Lua has no io library, so the report is raised as an error: it lands in ResolveDebug.txt
local UNUSED = [[/Users/maracchi/Desktop/Claude/10. October 2026/10-18-2026 Organic Chemistry/wt-lesson00/prototypes/lesson-00/star-forge-resolve/probe-log.txt]]
local out = {}
local function p(s) s = tostring(s); print(s); table.insert(out, s) end
local ok, err = pcall(function()
  local r = resolve or (Resolve and Resolve()) or (bmd and bmd.scriptapp and bmd.scriptapp("Resolve"))
  p("resolve object: " .. tostring(r))
  if not r then return end
  p("product: " .. tostring(r:GetProductName()) .. " " .. tostring(r:GetVersionString()))
  local pm = r:GetProjectManager(); p("project manager: " .. tostring(pm))
  local proj = pm and pm:GetCurrentProject(); p("project: " .. tostring(proj and proj:GetName()))
  local mp = proj and proj:GetMediaPool(); p("media pool: " .. tostring(mp))
  p("libs: io=" .. tostring(io) .. " os=" .. tostring(os) .. " bmd=" .. tostring(bmd) .. " wait=" .. tostring(bmd and bmd.wait))
  p("fusion: " .. tostring(fusion or (r.Fusion and r:Fusion())))
  local fmts = proj and proj:GetRenderFormats(); if fmts then for k,v in pairs(fmts) do p("render format: " .. k .. " = " .. v) end end
end)
if not ok then p("ERROR: " .. tostring(err)) end
error("STAR_FORGE_REPORT\n" .. table.concat(out, "\n") .. "\nSTAR_FORGE_END", 0)
