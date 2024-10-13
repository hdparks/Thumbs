extends Node3D

var player1: Player
var player2: Player
func _ready():
	print("game ready for", multiplayer.get_unique_id())
	NetworkTime.on_tick.connect(_tick)
	
	if multiplayer.is_server():
		var my_peer = multiplayer.get_unique_id()
		var other_peer = multiplayer.get_peers()[0]
		player1 = spawn_player_1(my_peer)
		player2 = spawn_player_2(other_peer)
	
func spawn_player_1(peer:int):
	var thumb = preload("res://scenes/Player.tscn").instantiate()
	thumb.position.x = 1.0
	thumb.rotate_y(PI/2)
	thumb.player = peer
	$Players.add_child(thumb, true)
	return thumb
	
func spawn_player_2(peer:int):
	var thumb = preload("res://scenes/Player.tscn").instantiate()
	thumb.position.x = -1.0
	thumb.rotate_y(-PI/2)
	thumb.player = peer
	$Players.add_child(thumb, true)
	return thumb

var player1_state_prev: int
var player2_state_prev: int
func _tick(delta, tick):
	if not is_multiplayer_authority():
		return
		
	if player1 != null and player2 != null:
		$UI/Player1State.text = str(player1.state)
		$UI/Player2State.text = str(player2.state)
	
	
