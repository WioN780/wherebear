package domain

import (
	"math/rand"
	"sync"
	"time"
)

// RoomState represents the current phase of a room's lifecycle.
type RoomState string

const (
	RoomStateLobby        RoomState = "Lobby"
	RoomStateStarting     RoomState = "Starting"
	RoomStateInRound      RoomState = "InRound"
	RoomStateRoundReview  RoomState = "RoundReview"
	RoomStateGameComplete RoomState = "GameComplete"
)

// Room is the aggregate root for a multiplayer game session.
// All mutations must hold Mu. Read access must hold Mu.RLock().
type Room struct {
	Mu            sync.RWMutex
	ID            string
	InviteCode    string
	HostPlayerID  string
	IsPrivate     bool
	State         RoomState
	Config        RoomConfig
	Players       []*Player
	CreatedAt     time.Time
	CurrentRound  int
	Timer         int
	Locations     []Location
	TimerStopChan chan struct{}
}

// FindPlayer returns the player with the given ID, or nil.
// Caller must hold at least Mu.RLock().
func (r *Room) FindPlayer(userID string) *Player {
	for _, p := range r.Players {
		if p.ID == userID {
			return p
		}
	}
	return nil
}

// RemovePlayer removes a player by ID. Returns true if found and removed.
// Caller must hold Mu.Lock().
func (r *Room) RemovePlayer(userID string) bool {
	for i, p := range r.Players {
		if p.ID == userID {
			r.Players = append(r.Players[:i], r.Players[i+1:]...)
			return true
		}
	}
	return false
}

// OnlinePlayerCount returns the count of currently connected players.
// Caller must hold at least Mu.RLock().
func (r *Room) OnlinePlayerCount() int {
	n := 0
	for _, p := range r.Players {
		if p.IsOnline {
			n++
		}
	}
	return n
}

// AllOnlinePlayersGuessed checks if every online player has submitted a guess.
// Caller must hold at least Mu.RLock().
func (r *Room) AllOnlinePlayersGuessed() bool {
	for _, p := range r.Players {
		if p.IsOnline && !p.HasGuessed {
			return false
		}
	}
	return true
}

// MigrateHost transfers host status to the first available online player.
// Returns the new host ID, or empty string if no players remain.
// Caller must hold Mu.Lock().
func (r *Room) MigrateHost() string {
	for _, p := range r.Players {
		p.IsHost = false
	}
	for _, p := range r.Players {
		if p.IsOnline {
			p.IsHost = true
			r.HostPlayerID = p.ID
			return p.ID
		}
	}
	if len(r.Players) > 0 {
		r.Players[0].IsHost = true
		r.HostPlayerID = r.Players[0].ID
		return r.Players[0].ID
	}
	return ""
}

// PlayerIDs returns a snapshot of all player IDs.
// Caller must hold at least Mu.RLock().
func (r *Room) PlayerIDs() []string {
	ids := make([]string, len(r.Players))
	for i, p := range r.Players {
		ids[i] = p.ID
	}
	return ids
}

// CurrentLocation returns the location for the active round, or nil.
// Caller must hold at least Mu.RLock().
func (r *Room) CurrentLocation() *Location {
	if r.CurrentRound >= 1 && r.CurrentRound <= len(r.Locations) {
		loc := r.Locations[r.CurrentRound-1]
		return &loc
	}
	return nil
}

// StopTimer safely closes the timer stop channel.
// Caller must hold Mu.Lock().
func (r *Room) StopTimer() {
	if r.TimerStopChan != nil {
		close(r.TimerStopChan)
		r.TimerStopChan = nil
	}
}

// ResetPlayersForRound clears per-round transient state on all players.
// Caller must hold Mu.Lock().
func (r *Room) ResetPlayersForRound() {
	for _, p := range r.Players {
		p.ResetForNewRound()
	}
}

// GenerateInviteCode creates a random 6-character alphanumeric code.
func GenerateInviteCode() string {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 6)
	for i := range code {
		code[i] = chars[rand.Intn(len(chars))]
	}
	return string(code)
}

// IsGuest returns whether a user ID represents a guest (unauthenticated) player.
func IsGuest(userID string) bool {
	return len(userID) >= 6 && userID[:6] == "guest_"
}
