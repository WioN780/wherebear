package protocol

import (
	"encoding/json"

	"wherebear/backend/internal/domain"
)

// Envelope is the top-level WebSocket message wire format.
type Envelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// OutboundMessage is a typed outbound message ready for serialization.
type OutboundMessage struct {
	Type    string      `json:"type"`
	Payload interface{} `json:"payload"`
}

// --- Client → Server Payloads ---

// RoomCreatePayload is sent by the client to create a new room.
type RoomCreatePayload struct {
	IsPrivate bool              `json:"isPrivate"`
	Config    RoomConfigPayload `json:"config"`
}

// RoomConfigPayload carries room configuration as primitive types.
// The handler converts these to domain.RoomConfig.
type RoomConfigPayload struct {
	Mode          string  `json:"mode"`
	Difficulty    string  `json:"difficulty"`
	MaxPlayers    int     `json:"maxPlayers"`
	TotalRounds   int     `json:"totalRounds"`
	RoundDuration int     `json:"roundDuration"`
	Country       *string `json:"country"`
}

// RoomJoinPayload is sent by the client to join a room.
type RoomJoinPayload struct {
	InviteCode string `json:"inviteCode"`
}

// RoomUpdatePayload is sent by the host to update room config and/or privacy.
// IsPrivate is a pointer so an omitted value leaves the room's privacy unchanged,
// letting a config-only update and a privacy-only update share one event.
type RoomUpdatePayload struct {
	Config    RoomConfigPayload `json:"config"`
	IsPrivate *bool             `json:"isPrivate"`
}

// RoomKickPayload is sent by the host to kick a player.
type RoomKickPayload struct {
	TargetPlayerID string `json:"targetPlayerId"`
}

// SubmitGuessPayload is sent by a player to submit a guess.
type SubmitGuessPayload struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

// QuickMatchPayload is sent by a player to search for a quick match.
type QuickMatchPayload struct {
	Difficulty string `json:"difficulty"`
}

// FriendRequestSendPayload is sent to initiate a friend request.
type FriendRequestSendPayload struct {
	ReceiverEmailOrName string `json:"receiverEmailOrName"`
}

// FriendRequestRespondPayload is sent to accept or decline a friend request.
type FriendRequestRespondPayload struct {
	RequestID string `json:"requestId"`
	Action    string `json:"action"` // "ACCEPT" or "DECLINE"
}

// --- Server → Client Payloads ---

// ErrorPayload reports an error to the client.
type ErrorPayload struct {
	Message string `json:"message"`
}

// SuccessPayload confirms a successful operation.
type SuccessPayload struct {
	Message string `json:"message"`
}

// TimerUpdatePayload broadcasts the current countdown value.
type TimerUpdatePayload struct {
	Timer int `json:"timer"`
}

// GuessConfirmPayload confirms a guess submission with scoring.
type GuessConfirmPayload struct {
	Score    int     `json:"score"`
	Distance float64 `json:"distance"`
	Lat      float64 `json:"lat"`
	Lng      float64 `json:"lng"`
}

// KickedPayload notifies a player they were kicked.
type KickedPayload struct {
	Message string `json:"message"`
}

// PresenceChangePayload notifies about a friend's online status change.
type PresenceChangePayload struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Image    string `json:"image"`
	IsOnline bool   `json:"isOnline"`
}

// FriendRequestReceivedPayload notifies about an incoming friend request.
type FriendRequestReceivedPayload struct {
	RequestID   string `json:"requestId"`
	SenderID    string `json:"senderId"`
	SenderName  string `json:"senderName"`
	SenderImage string `json:"senderImage"`
}

// PendingRequestsPayload sends all pending incoming friend requests on connect.
type PendingRequestsPayload struct {
	Requests []domain.PendingRequest `json:"requests"`
}

// MatchAbandonedPayload notifies the remaining player that their opponent left a quick match.
type MatchAbandonedPayload struct {
	Reason string `json:"reason"`
}

// RoundStartPayload announces the start of a new round.
type RoundStartPayload struct {
	CurrentRound    int             `json:"currentRound"`
	Timer           int             `json:"timer"`
	CurrentLocation domain.Location `json:"currentLocation"`
}

// RoundEndPayload announces round results. Timer carries the review-phase
// countdown so the client can sync immediately without waiting for the
// follow-up ROOM_STATE_UPDATE.
type RoundEndPayload struct {
	Round    int             `json:"round"`
	Timer    int             `json:"timer"`
	Location domain.Location `json:"location"`
	Players  []domain.Player `json:"players"`
}

// LeftConfirmPayload confirms room departure.
type LeftConfirmPayload struct{}
