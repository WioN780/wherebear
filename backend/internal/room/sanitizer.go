package room

import (
	"time"

	"wherebear/backend/internal/domain"
)

type SerializedRoomState struct {
	RoomID       string            `json:"roomId"`
	InviteCode   string            `json:"inviteCode"`
	HostPlayerID string            `json:"hostPlayerId"`
	IsPrivate    bool              `json:"isPrivate"`
	State        domain.RoomState  `json:"state"`
	Config       domain.RoomConfig `json:"config"`
	Players      []*domain.Player  `json:"players"`
	CreatedAt    int64             `json:"createdAt"`
	CurrentRound int               `json:"currentRound"`
	Timer        int               `json:"timer"`
	// CurrentLocation is the single location the client is allowed to see for the
	// active round (nil outside of InRound/RoundReview). Future locations are never
	// serialized, so a client cannot read ahead to cheat.
	CurrentLocation *domain.Location `json:"currentLocation"`
}

// SanitizeRoomState hides other player guesses and future locations.
// It acquires a read lock on the room and returns a deep-ish copy to prevent concurrent modification races.
func SanitizeRoomState(room *domain.Room, targetUserID string) SerializedRoomState {
	room.Mu.RLock()
	defer room.Mu.RUnlock()

	sanitizedPlayers := make([]*domain.Player, len(room.Players))
	for i, p := range room.Players {
		if room.State == domain.RoomStateInRound && p.ID != targetUserID {
			sanitizedPlayers[i] = &domain.Player{
				ID:           p.ID,
				Username:     p.Username,
				Image:        p.Image,
				IsOnline:     p.IsOnline,
				IsHost:       p.IsHost,
				IsReady:      p.IsReady,
				Score:        p.Score,
				HasGuessed:   p.HasGuessed,
				LastGuess:    nil,
				LastDistance: nil,
				LastScore:    nil,
			}
		} else {
			cp := *p
			sanitizedPlayers[i] = &cp
		}
	}

	// Only expose the active round's location, and only once play has begun.
	var currentLocation *domain.Location
	if (room.State == domain.RoomStateInRound || room.State == domain.RoomStateRoundReview) &&
		room.CurrentRound > 0 && len(room.Locations) >= room.CurrentRound {
		loc := room.Locations[room.CurrentRound-1]
		currentLocation = &loc
	}

	return SerializedRoomState{
		RoomID:          room.ID,
		InviteCode:      room.InviteCode,
		HostPlayerID:    room.HostPlayerID,
		IsPrivate:       room.IsPrivate,
		State:           room.State,
		Config:          room.Config,
		Players:         sanitizedPlayers,
		CreatedAt:       room.CreatedAt.UnixNano() / int64(time.Millisecond),
		CurrentRound:    room.CurrentRound,
		Timer:           room.Timer,
		CurrentLocation: currentLocation,
	}
}
