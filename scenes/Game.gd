extends Node3D

func _ready():
	print("game ready for", multiplayer.get_unique_id())
	
	if multiplayer.is_server():
		var my_peer = multiplayer.get_unique_id()
		var other_peer = multiplayer.get_peers()[0]
		var thumb1 = spawn_player_1(my_peer)
		var thumb2 = spawn_player_2(other_peer)
	
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
