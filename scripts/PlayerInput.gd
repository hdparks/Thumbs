extends BaseNetInput
class_name PlayerInput


var dragInputBuf: Vector2
@export var dragInput: Vector2
@export var holding: bool

# states:
# idle
# tapping (0,1)
# holding (0,1)
# slam-winding-up (0,1)
# slamming (0,1)
# slam-follow-through (0,1)
@onready var player = get_parent().player
@onready var player_name = get_parent().name

var screen_touch_by_idx = {}

func _input(event):
	if multiplayer.get_unique_id() == player:
		if event is InputEventScreenDrag:
			dragInputBuf = event.velocity
			
		if event is InputEventScreenTouch:
			screen_touch_by_idx[event.index] = event.pressed

func _gather():
	if not is_multiplayer_authority():
		return 

	dragInput = dragInputBuf
	dragInputBuf = Vector2.ZERO

	holding = screen_touch_by_idx.values().any(func(pressed): return pressed)
