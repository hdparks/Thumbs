class_name Player extends CharacterBody3D

@export var state = PlayerState.IDLE
@export var input: PlayerInput
@export var player := 0:
	set(id):
		print(":setting player id: ", id)
		player = id
		name = str(player)

@onready var rollback_synchronizer = $RollbackSynchronizer

func _ready():
	if multiplayer.get_unique_id() == player:
		print(multiplayer.get_unique_id(), " this one's mine ", player)
		$Camera.current = true
	else:
		print(multiplayer.get_unique_id(), " this one's NOT mine ", player)
	

	await get_tree().process_frame
	input = $PlayerInput

	set_multiplayer_authority(1)
	input.set_multiplayer_authority(player)
	rollback_synchronizer.process_settings()
	
	to_IDLE(0)





func _rollback_tick(delta, tick, is_fresh):
	match state:
		PlayerState.IDLE:
			rollback_IDLE(tick)
		PlayerState.SLAM_WINDUP:
			rollback_SLAM_WINDUP(tick)
		PlayerState.TAP_WINDUP:
			rollback_TAP_WINDUP(tick)
		PlayerState.TAP_ACTION:
			rollback_TAP_ACTION(tick)
		PlayerState.HOLD:
			rollback_HOLD(tick)
		_:
			print("UNKNOWN STATE")



### State.IDLE
var idle_target_angle = 0.
var idle_initial_tick: int
var idle_initial_transform: Transform3D
const idle_target_position = Vector3.ZERO
func to_IDLE(tick):
	state = PlayerState.IDLE
	print(multiplayer.get_unique_id(), ":player ", player, " to IDLE")
	idle_initial_tick = tick
	idle_initial_transform = $Thumb.transform

var idle_rotate_speed = 1./10
func rollback_IDLE(tick):
	idle_target_angle = fmod(tick * idle_rotate_speed, 2*PI)
	var idle_target_vector = Vector3(cos(idle_target_angle), 1, 10 + sin(idle_target_angle))

	var ticks_idle = tick - idle_initial_tick
	if ticks_idle < 10:
		$Thumb.transform = Transform3D.IDENTITY.looking_at(idle_target_vector).interpolate_with(idle_initial_transform, 1 - float(ticks_idle)/10)
	else:
		$Thumb.transform = Transform3D.IDENTITY.looking_at(idle_target_vector)
	
	# Transitions
	if input:
		if input.dragInput.y > .1:
			to_TAP_WINDUP(tick)
	
### State.SLAM_WINDUP
const SLAM_WINDUP_FRAMES = 5
var slam_windup_frames_remaining = SLAM_WINDUP_FRAMES
func to_SLAM_WINDUP():
	state = PlayerState.SLAM_WINDUP
	print(multiplayer.get_unique_id(), ":player ", player, " to SLAM_WINDUP")
	slam_windup_frames_remaining = SLAM_WINDUP_FRAMES
	$Thumb.position.y = 1
	
func rollback_SLAM_WINDUP(tick):
	slam_windup_frames_remaining -= 1
	
	if slam_windup_frames_remaining <= 0:
		to_IDLE(tick)
		
### State.TAP_WINDUP
const TAP_WINDUP_FRAMES = 10
var tap_windup_initial_tick:int
var tap_windup_initial_transform:Transform3D
var tap_windup_target_transform = Transform3D(Basis.IDENTITY, Vector3(0,1,0))
func to_TAP_WINDUP(tick):
	state = PlayerState.TAP_WINDUP
	print(multiplayer.get_unique_id(), ":player ", " to TAP_WINDUP")
	tap_windup_initial_tick = tick
	tap_windup_initial_transform = $Thumb.transform

func rollback_TAP_WINDUP(tick):
	var tap_windup_frames_remaining = tap_windup_initial_tick + TAP_WINDUP_FRAMES - tick
	
	var interpolation_weight = 1 - float(tap_windup_frames_remaining) / TAP_WINDUP_FRAMES
	$Thumb.transform = tap_windup_initial_transform.interpolate_with(tap_windup_target_transform, interpolation_weight)
	
	if tap_windup_frames_remaining <= 0:
		to_TAP_ACTION(tick)

### State.TAP_ACTION
var tap_action_initial_tick:int
var tap_action_initial_transform:Transform3D
var tap_action_target_transform = Transform3D(Basis.IDENTITY.looking_at(Vector3(0,-1,-1)), Vector3.ZERO)
const TAP_ACTION_FRAMES = 10
func to_TAP_ACTION(tick):
	state = PlayerState.TAP_ACTION
	print(multiplayer.get_unique_id(), ":player ", player, " to TAP_ACTION")
	tap_action_initial_tick = tick
	tap_action_initial_transform = $Thumb.transform
	
func rollback_TAP_ACTION(tick):
	var tap_action_frame = tick - tap_action_initial_tick
	var interp_weight = float(tap_action_frame) / TAP_ACTION_FRAMES
	$Thumb.transform = tap_action_initial_transform.interpolate_with(tap_action_target_transform, interp_weight)
	
	if tap_action_frame >= TAP_ACTION_FRAMES:
		
		if input.holding:
			to_HOLD(tick)
		else:
			to_IDLE(tick)

func to_HOLD(tick):
	state = PlayerState.HOLD
	print(multiplayer.get_unique_id(), ":player ", player, " to HOLD")
	
func rollback_HOLD(tick):
	if not input.holding:
		to_IDLE(tick)

