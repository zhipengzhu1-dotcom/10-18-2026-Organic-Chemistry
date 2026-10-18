-- PROTOTYPE (throwaway): cut 3 of star-forge, assembled in DaVinci Resolve (free 21.1) by Lua.
-- Takes the native Remotion renders, adds a Fusion finish (soft glow, film grain, 0.5 s fade-in),
-- and renders both aspects. Run from Workspace > Scripts with any project open; it makes its own project.
local ROOT = [[/Users/maracchi/Desktop/Claude/10. October 2026/10-18-2026 Organic Chemistry/wt-lesson00/prototypes/lesson-00]]
local SRC = { ["16x9"] = ROOT .. "/star-forge-remotion/out/star-forge-native-16x9.mp4",
              ["9x16"] = ROOT .. "/star-forge-remotion/out/star-forge-native-9x16.mp4" }
local SIZE = { ["16x9"] = {1920, 1080}, ["9x16"] = {1080, 1920} }
local OUT = ROOT .. "/star-forge-resolve/out"
local lines = {}
-- free 21.1 Lua has no io library: progress is printed, and the full report is raised as an error at the end
-- so it lands in ResolveDebug.txt
local function p(s) s = tostring(s); print(s); table.insert(lines, s) end

local function finish(item, tag)
  local comp = item:AddFusionComp()
  if not comp then p(tag .. ": AddFusionComp failed, rendering without the Fusion finish"); return end
  local mi, mo = comp:FindTool("MediaIn1"), comp:FindTool("MediaOut1")
  comp:Lock()
  local glow = comp:AddTool("SoftGlow")
  local grain = comp:AddTool("FilmGrain")
  local fade = comp:AddTool("BrightnessContrast")
  comp:Unlock()
  p(tag .. ": tools glow=" .. tostring(glow) .. " grain=" .. tostring(grain) .. " fade=" .. tostring(fade))
  local last = mi
  if glow then glow.Input = last.Output; glow.Threshold = 0.55; glow.Gain = 0.6; last = glow end
  if grain then grain.Input = last.Output; pcall(function() grain.Size = 1.2; grain.Strength = 0.25 end); last = grain end
  if fade then
    fade.Input = last.Output
    fade.Gain = comp:BezierSpline({})
    fade.Gain[0] = 0; fade.Gain[15] = 1
    last = fade
  end
  mo.Input = last.Output
end

local ok, err = pcall(function()
  local resolve = resolve or Resolve()
  p("Resolve: " .. resolve:GetProductName() .. " " .. resolve:GetVersionString())
  local pm = resolve:GetProjectManager()
  local name = "star-forge-PROTOTYPE-" .. tostring(math.random(100000, 999999))
  local proj = pm:CreateProject(name)
  assert(proj, "could not create project " .. name)
  p("project: " .. name)
  proj:SetSetting("timelineFrameRate", "30")
  proj:SetSetting("timelinePlaybackFrameRate", "30")
  local mp = proj:GetMediaPool()
  for _, aspect in ipairs({"16x9", "9x16"}) do
    local w, h = SIZE[aspect][1], SIZE[aspect][2]
    local clips = mp:ImportMedia({ SRC[aspect] })
    assert(clips and clips[1], "import failed: " .. SRC[aspect])
    local tl = mp:CreateTimelineFromClips("star-forge " .. aspect, { clips[1] })
    assert(tl, "timeline failed for " .. aspect)
    tl:SetSetting("useCustomSettings", "1")
    tl:SetSetting("timelineResolutionWidth", tostring(w))
    tl:SetSetting("timelineResolutionHeight", tostring(h))
    proj:SetCurrentTimeline(tl)
    finish(tl:GetItemListInTrack("video", 1)[1], aspect)
    local codec
    for k, v in pairs(proj:GetRenderCodecs("mp4") or {}) do
      p("mp4 codec: " .. tostring(k) .. " = " .. tostring(v))
      if not codec and (tostring(v):find("264") or tostring(k):find("264")) then codec = v end
    end
    p(aspect .. ": codec " .. tostring(codec) .. " set=" .. tostring(proj:SetCurrentRenderFormatAndCodec("mp4", codec or "H264")))
    proj:SetRenderSettings({ SelectAllFrames = true, TargetDir = OUT,
      CustomName = "star-forge-resolve-" .. aspect, FormatWidth = w, FormatHeight = h, ExportAudio = false })
    local job = proj:AddRenderJob()
    p(aspect .. ": render job " .. tostring(job))
    proj:StartRendering(job)
    while proj:IsRenderingInProgress() do if bmd and bmd.wait then bmd.wait(1) end end
    p(aspect .. ": " .. tostring(proj:GetRenderJobStatus(job) and proj:GetRenderJobStatus(job).JobStatus))
  end
  pm:SaveProject()
  p("done: " .. OUT)
end)
if not ok then p("ERROR: " .. tostring(err)) end
error("STAR_FORGE_REPORT\n" .. table.concat(lines, "\n") .. "\nSTAR_FORGE_END", 0)
