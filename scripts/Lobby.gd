extends Node

var client: NakamaClient
var session: NakamaSession
var socket : NakamaSocket
var id := OS.get_unique_id()
var multiplayer_bridge: NakamaMultiplayerBridge

func _ready():
	client = Nakama.create_client("defaultkey","127.0.0.1",7350,"http")
	client.timeout = 10
	
	socket = await Nakama.create_socket_from(client)
	
	session = await client.authenticate_device_async(OS.get_unique_id())
	if session.is_exception():
		print("session error: %s" % session)
		return
	print("authenticated")
	
	var connected : NakamaAsyncResult = await socket.connect_async(session)
	if connected.is_exception():
		print("connection error: %s" % connected)
		return 
	print("connected")
	
	multiplayer_bridge = NakamaMultiplayerBridge.new(socket)
	multiplayer_bridge.match_join_error.connect(self._on_match_join_error)
	multiplayer_bridge.match_joined.connect(self._on_match_joined)
	get_tree().get_multiplayer().set_multiplayer_peer(multiplayer_bridge.multiplayer_peer)
	get_tree().get_multiplayer().peer_connected.connect(self._on_peer_connected)
	get_tree().get_multiplayer().peer_disconnected.connect(self._on_peer_disconnected)

func get_matches() -> NakamaAPI.ApiMatchList:
	var min_players = 0
	var max_players = 10
	var limit = 10
	var authoritative = false
	var label = ""
	var query = ""
	var result = await client.list_matches_async(session, min_players, max_players, limit, authoritative, label, query)

	for m in result.matches:
		print("%s: %s/10 players" % [m.match_id, m.size])

	return result

func set_matches(matches: NakamaAPI.ApiMatchList):
	$UI/Matches.clear()
	for m in matches.matches:
		$UI/Matches.add_item(m.match_id)
		
func join_match(match_name: String):
	var m = await multiplayer_bridge.join_match(match_name)
		
func refresh_matches():
	set_matches(await get_matches())
	
func host_match():
	multiplayer_bridge.join_named_match(OS.get_unique_id())

func _on_refresh_match_list_pressed():
	refresh_matches()

func _on_matches_item_selected(index):
	print("selected item %s: %s" % [index, $UI/Matches.get_item_text(index)])
	join_match($UI/Matches.get_item_text(index))

func _on_host_match_pressed():
	host_match()
	
func _on_match_join_error(err):
	print("Unable to join match: ", err.message)

func _on_match_joined() -> void:
	print("joined match with match_id", multiplayer_bridge.match_id)

func _on_peer_connected(peer):
	print("peer connected", peer)
	
func _on_peer_disconnected(peer):
	print("peer disconnected", peer)

@rpc("any_peer","call_local")
func start_game():
	$UI.hide()
	
	if multiplayer.is_server():
		change_level.call_deferred(load("res://scenes/Game.tscn"))
		
func change_level(scene: PackedScene):
	var level = $Game
	for c in level.get_children():
		level.remove_child(c)
		c.queue_free()
		
	level.add_child(scene.instantiate())

func _on_start_pressed():
	start_game.rpc()
