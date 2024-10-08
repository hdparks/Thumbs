extends Node3D

@export var player: int

func _ready():
	if multiplayer.get_unique_id() == player:
		print(multiplayer.get_unique_id(), " this one's mine ", player)
		$Camera.current = true
	else:
		print(multiplayer.get_unique_id(), " this one's NOT mine ", player)
