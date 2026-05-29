local out_path = app.params["out"]
if not out_path or out_path == "" then
  error("Missing --script-param out=<file.aseprite>")
end

local W = 630
local H = 860
local SAFE_X = 105
local SAFE_Y = 50
local SAFE_W = 420
local SAFE_H = 760

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

local function fill_circle(image, cx, cy, radius, color)
  local r2 = radius * radius
  for py = math.floor(cy - radius), math.ceil(cy + radius) do
    for px = math.floor(cx - radius), math.ceil(cx + radius) do
      local dx = px - cx
      local dy = py - cy
      if dx * dx + dy * dy <= r2 and px >= 0 and py >= 0 and px < image.width and py < image.height then
        image:putPixel(px, py, color)
      end
    end
  end
end

local function line_h(image, x, y, w, color, thickness)
  fill_rect(image, x, y, w, thickness or 1, color)
end

local function add_layer(sprite, name, draw_fn)
  local layer = sprite:newLayer()
  layer.name = name
  local image = Image(W, H, ColorMode.RGB)
  image:clear(rgba(0, 0, 0, 0))
  draw_fn(image)
  sprite:newCel(layer, 1, image, Point(0, 0))
  return layer
end

local sprite = Sprite(W, H, ColorMode.RGB)
sprite.filename = out_path
sprite.layers[1].name = "notes_blank"

add_layer(sprite, "bleed_area", function(image)
  fill_rect(image, 0, 0, W, H, rgba(248, 250, 252, 255))
  fill_rect(image, SAFE_X, SAFE_Y, SAFE_W, SAFE_H, rgba(248, 250, 252, 0))
end)

add_layer(sprite, "safe_area", function(image)
  fill_rect(image, SAFE_X, SAFE_Y, SAFE_W, SAFE_H, rgba(35, 205, 18, 255))
end)

add_layer(sprite, "battlefield", function(image)
  local x = SAFE_X + 10
  local y = SAFE_Y + 20
  fill_rect(image, x, y, 400, 570, rgba(69, 84, 7, 255))
  line_h(image, x, y + 285, 400, rgba(8, 8, 8, 255), 2)
end)

add_layer(sprite, "tower_dock", function(image)
  fill_rect(image, SAFE_X + 10, SAFE_Y + 605, 400, 88, rgba(233, 111, 8, 255))
end)

add_layer(sprite, "creep_dock", function(image)
  fill_rect(image, SAFE_X + 10, SAFE_Y + 701, 400, 74, rgba(49, 157, 226, 255))
end)

add_layer(sprite, "timer_round_panel", function(image)
  fill_rect(image, SAFE_X + 10, SAFE_Y + 240, 44, 220, rgba(220, 53, 235, 255))
end)

add_layer(sprite, "timer_round_containers", function(image)
  fill_circle(image, SAFE_X + 32, SAFE_Y + 270, 22, rgba(0, 0, 0, 255))
  fill_rect(image, SAFE_X + 20, SAFE_Y + 300, 24, 122, rgba(0, 0, 0, 255))
  fill_circle(image, SAFE_X + 32, SAFE_Y + 442, 22, rgba(0, 0, 0, 255))
end)

add_layer(sprite, "score_mana_panel", function(image)
  fill_rect(image, SAFE_X + 362, SAFE_Y + 250, 48, 210, rgba(245, 178, 197, 255))
end)

add_layer(sprite, "score_mana_containers", function(image)
  fill_circle(image, SAFE_X + 386, SAFE_Y + 285, 23, rgba(0, 0, 0, 255))
  fill_circle(image, SAFE_X + 386, SAFE_Y + 370, 36, rgba(0, 0, 0, 255))
  fill_circle(image, SAFE_X + 386, SAFE_Y + 435, 23, rgba(0, 0, 0, 255))
end)

add_layer(sprite, "tower_card_frames", function(image)
  local y = SAFE_Y + 610
  for _, x in ipairs({ SAFE_X + 21, SAFE_X + 97, SAFE_X + 173, SAFE_X + 249, SAFE_X + 325 }) do
    stroke_rect(image, x, y, 74, 78, rgba(128, 82, 45, 255), 3)
  end
end)

add_layer(sprite, "tower_sprite_boxes", function(image)
  local y = SAFE_Y + 617
  for _, x in ipairs({ SAFE_X + 24, SAFE_X + 100, SAFE_X + 176, SAFE_X + 252, SAFE_X + 328 }) do
    stroke_rect(image, x, y, 62, 66, rgba(35, 35, 35, 180), 1)
  end
end)

add_layer(sprite, "creep_card_frames", function(image)
  local y = SAFE_Y + 706
  for _, x in ipairs({ SAFE_X + 21, SAFE_X + 97, SAFE_X + 173, SAFE_X + 249, SAFE_X + 325 }) do
    stroke_rect(image, x, y, 74, 64, rgba(82, 91, 102, 255), 3)
  end
end)

add_layer(sprite, "creep_sprite_boxes", function(image)
  local y = SAFE_Y + 706
  for _, x in ipairs({ SAFE_X + 26, SAFE_X + 102, SAFE_X + 178, SAFE_X + 254, SAFE_X + 330 }) do
    stroke_rect(image, x, y, 58, 58, rgba(35, 35, 35, 180), 1)
  end
end)

add_layer(sprite, "battlefield_tower_positions", function(image)
  local positions = {
    { SAFE_X + 95, SAFE_Y + 70 },
    { SAFE_X + 210, SAFE_Y + 70 },
    { SAFE_X + 324, SAFE_Y + 70 },
    { SAFE_X + 147, SAFE_Y + 130 },
    { SAFE_X + 273, SAFE_Y + 130 },
    { SAFE_X + 147, SAFE_Y + 490 },
    { SAFE_X + 273, SAFE_Y + 490 },
    { SAFE_X + 95, SAFE_Y + 550 },
    { SAFE_X + 210, SAFE_Y + 550 },
    { SAFE_X + 324, SAFE_Y + 550 }
  }
  for _, p in ipairs(positions) do
    fill_circle(image, p[1], p[2], 10, rgba(245, 245, 245, 255))
    fill_circle(image, p[1], p[2], 3, rgba(20, 20, 20, 255))
  end
end)

add_layer(sprite, "debug_safe_bounds", function(image)
  stroke_rect(image, SAFE_X, SAFE_Y, SAFE_W, SAFE_H, rgba(255, 0, 0, 255), 2)
end)

sprite:saveAs(out_path)
