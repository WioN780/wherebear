package protocol

import "errors"

// Sentinel errors used across services. These provide structured error
// codes that the WebSocket handler can map to client-facing messages.
var (
	ErrRoomNotFound        = errors.New("room not found")
	ErrRoomFull            = errors.New("lobby is full")
	ErrMatchAlreadyStarted = errors.New("match has already started")
	ErrNotHost             = errors.New("only the host can perform this action")
	ErrNotInLobby          = errors.New("room is not in lobby state")
	ErrPlayerNotFound      = errors.New("player not found in room")
	ErrAlreadyGuessed      = errors.New("guess already submitted")
	ErrNotInRound          = errors.New("room is not in an active round")
	ErrUserNotFound        = errors.New("user not found")
	ErrCannotAddSelf       = errors.New("cannot add yourself as a friend")
	ErrAlreadyFriends      = errors.New("already friends")
	ErrRequestPending      = errors.New("friend request already pending")
	ErrRequestNotFound     = errors.New("friend request not found")
	ErrUnauthorized        = errors.New("unauthorized")
	ErrSessionNotFound     = errors.New("session not found")
	ErrSessionExpired      = errors.New("session expired")
	ErrNoLocations         = errors.New("no locations matching criteria found")
)
