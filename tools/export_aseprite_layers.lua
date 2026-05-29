local sprite = app.activeSprite
if not sprite then
  error("No active sprite")
end

local out_dir = app.params["out"]
if not out_dir or out_dir == "" then
  error("Missing --script-param out=<directory>")
end

local function join_path(a, b)
  local sep = package.config:sub(1, 1)
  if a:sub(-1) == "\\" or a:sub(-1) == "/" then
    return a .. b
  end
  return a .. sep .. b
end

local function sanitize_name(name)
  local s = name:gsub("[%c<>:\"/\\|%?%*]", "_")
  s = s:gsub("^%s+", ""):gsub("%s+$", "")
  s = s:gsub("%s+", "_")
  if s == "" then
    s = "unnamed"
  end
  return s
end

local function json_escape(value)
  local s = tostring(value)
  s = s:gsub("\\", "\\\\")
       :gsub("\"", "\\\"")
       :gsub("\b", "\\b")
       :gsub("\f", "\\f")
       :gsub("\n", "\\n")
       :gsub("\r", "\\r")
       :gsub("\t", "\\t")
  return s
end

local original = {}
local flat_layers = {}

local function collect(layer, path)
  local layer_path = path and (path .. "/" .. layer.name) or layer.name
  original[layer] = layer.isVisible

  if layer.isGroup then
    for _, child in ipairs(layer.layers) do
      collect(child, layer_path)
    end
  else
    table.insert(flat_layers, {
      layer = layer,
      path = layer_path,
      name = layer.name,
    })
  end
end

for _, layer in ipairs(sprite.layers) do
  collect(layer, nil)
end

local function set_all_visibility(layers, visible)
  for _, layer in ipairs(layers) do
    layer.isVisible = visible
    if layer.isGroup then
      set_all_visibility(layer.layers, visible)
    end
  end
end

local used_names = {}
local manifest_path = join_path(out_dir, "layer-manifest.json")
local manifest = io.open(manifest_path, "w")
if not manifest then
  error("Could not write manifest: " .. manifest_path)
end

manifest:write("{\n")
manifest:write("  \"source\": \"" .. json_escape(sprite.filename) .. "\",\n")
manifest:write("  \"canvas\": { \"width\": " .. sprite.width .. ", \"height\": " .. sprite.height .. " },\n")
manifest:write("  \"zOrderNote\": \"Export order follows Aseprite's layer collection order. zIndex is zero-based in that order; relative ordering is preserved for future mapping.\",\n")
manifest:write("  \"layers\": [\n")

for i, entry in ipairs(flat_layers) do
  local base = string.format("%02d_%s", i - 1, sanitize_name(entry.path))
  local filename = base .. ".png"
  if used_names[filename] then
    filename = base .. "_" .. tostring(i - 1) .. ".png"
  end
  used_names[filename] = true

  set_all_visibility(sprite.layers, false)
  entry.layer.isVisible = true

  local png_path = join_path(out_dir, filename)
  sprite:saveCopyAs(png_path)

  manifest:write("    {\n")
  manifest:write("      \"zIndex\": " .. (i - 1) .. ",\n")
  manifest:write("      \"name\": \"" .. json_escape(entry.name) .. "\",\n")
  manifest:write("      \"path\": \"" .. json_escape(entry.path) .. "\",\n")
  manifest:write("      \"file\": \"" .. json_escape(filename) .. "\",\n")
  manifest:write("      \"originalVisible\": " .. tostring(original[entry.layer]) .. ",\n")
  manifest:write("      \"opacity\": " .. entry.layer.opacity .. ",\n")
  manifest:write("      \"blendMode\": \"" .. json_escape(entry.layer.blendMode) .. "\"\n")
  manifest:write("    }")
  if i < #flat_layers then
    manifest:write(",")
  end
  manifest:write("\n")
end

manifest:write("  ]\n")
manifest:write("}\n")
manifest:close()

for layer, visible in pairs(original) do
  layer.isVisible = visible
end
