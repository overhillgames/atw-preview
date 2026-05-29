local sprite = app.activeSprite
if not sprite then
  error("No active sprite")
end

local SAFE_X = 105
local SAFE_Y = 50
local TIMER_X = SAFE_X + 20
local TIMER_Y = SAFE_Y + 300
local TIMER_W = 24
local TIMER_H = 122
local LAYER_NAME = "timer_fill_rect_24x122"

local function rgba(r, g, b, a)
  return Color { r = r, g = g, b = b, a = a }
end

local function fill_rect(image, x, y, w, h, color)
  local x2 = math.min(image.width - 1, x + w - 1)
  local y2 = math.min(image.height - 1, y + h - 1)
  for py = math.max(0, y), y2 do
    for px = math.max(0, x), x2 do
      image:putPixel(px, py, color)
    end
  end
end

local function stroke_rect(image, x, y, w, h, color, thickness)
  thickness = thickness or 1
  fill_rect(image, x, y, w, thickness, color)
  fill_rect(image, x, y + h - thickness, w, thickness, color)
  fill_rect(image, x, y, thickness, h, color)
  fill_rect(image, x + w - thickness, y, thickness, h, color)
end

for _, layer in ipairs(sprite.layers) do
  if layer.name == LAYER_NAME then
    sprite:deleteLayer(layer)
    break
  end
end

local layer = sprite:newLayer()
layer.name = LAYER_NAME
layer.opacity = 220

local image = Image(sprite.width, sprite.height, ColorMode.RGB)
image:clear(rgba(0, 0, 0, 0))
fill_rect(image, TIMER_X, TIMER_Y, TIMER_W, TIMER_H, rgba(0, 255, 255, 70))
stroke_rect(image, TIMER_X, TIMER_Y, TIMER_W, TIMER_H, rgba(255, 255, 0, 255), 2)

sprite:newCel(layer, 1, image, Point(0, 0))
sprite:saveAs(sprite.filename)
