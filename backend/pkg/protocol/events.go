// Package protocol defines the shared event contract between frontend and backend.
// It depends only on the dependency-free domain package (for strongly typed
// payload fields) and is consumed by both pkg consumers and internal packages.
package protocol

// Client → Server event types.
const (
	EventRoomCreate           = "ROOM_CREATE"
	EventRoomJoin             = "ROOM_JOIN"
	EventRoomLeave            = "ROOM_LEAVE"
	EventRoomUpdate           = "ROOM_UPDATE"
	EventRoomKick             = "ROOM_KICK"
	EventGameStartSignal      = "GAME_START_SIGNAL"
	EventSubmitGuess          = "SUBMIT_GUESS"
	EventFriendRequestSend    = "FRIEND_REQUEST_SEND"
	EventFriendRequestRespond = "FRIEND_REQUEST_RESPOND"
	EventQuickMatch           = "QUICK_MATCH"
)

// Server → Client event types.
const (
	EventRoomStateUpdate       = "ROOM_STATE_UPDATE"
	EventRoomDestroyed         = "ROOM_DESTROYED"
	EventRoomKicked            = "ROOM_KICKED"
	EventRoundStart            = "ROUND_START"
	EventRoundEnd              = "ROUND_END"
	EventTimerUpdate           = "TIMER_UPDATE"
	EventGuessConfirm          = "GUESS_CONFIRM"
	EventPresenceChange        = "PRESENCE_CHANGE"
	EventFriendListUpdate      = "FRIEND_LIST_UPDATE"
	EventFriendRequestReceived = "FRIEND_REQUEST_RECEIVED"
	EventError                 = "ERROR"
	EventSuccess               = "SUCCESS"
	EventLeftConfirm           = "LEFT_CONFIRM"
)
