package room

import (
	"context"
	"fmt"
	"time"

	"wherebear/backend/internal/domain"
	"wherebear/backend/pkg/protocol"
)

type Service struct {
	manager  *Manager
	notifier domain.Notifier
}

func NewService(manager *Manager, notifier domain.Notifier) *Service {
	return &Service{
		manager:  manager,
		notifier: notifier,
	}
}

// Create initializes a new room with a host.
// isQuickMatch should be true for matchmaker-created rooms so they auto-start and abandon correctly.
func (s *Service) Create(ctx context.Context, hostID, username, image string, isPrivate bool, isQuickMatch bool, config domain.RoomConfig) (*domain.Room, error) {
	roomID := fmt.Sprintf("room_%d", time.Now().UnixNano())
	var inviteCode string

	// Generate a unique invite code
	for {
		inviteCode = domain.GenerateInviteCode()
		if !s.manager.InviteCodeExists(inviteCode) {
			break
		}
	}

	var imgPtr *string
	if image != "" {
		imgVal := image
		imgPtr = &imgVal
	}

	hostPlayer := &domain.Player{
		ID:         hostID,
		Username:   username,
		Image:      imgPtr,
		IsOnline:   true,
		IsHost:     true,
		IsReady:    false,
		Score:      0,
		LastGuess:  nil,
		HasGuessed: false,
	}

	room := &domain.Room{
		ID:            roomID,
		InviteCode:    inviteCode,
		HostPlayerID:  hostID,
		IsPrivate:     isPrivate,
		IsQuickMatch:  isQuickMatch,
		State:         domain.RoomStateLobby,
		Config:        config,
		Players:       []*domain.Player{hostPlayer},
		CreatedAt:     time.Now(),
		CurrentRound:  1,
		Timer:         config.RoundDuration,
		Locations:     nil,
		TimerStopChan: nil,
	}

	s.manager.AddRoom(room)

	return room, nil
}

// Join adds a player to an existing room.
func (s *Service) Join(ctx context.Context, inviteCode, userID, username, image string) (*domain.Room, error) {
	room, ok := s.manager.GetRoomByInviteCode(inviteCode)
	if !ok {
		return nil, protocol.ErrRoomNotFound
	}

	room.Mu.Lock()
	defer room.Mu.Unlock()

	if room.State != domain.RoomStateLobby {
		return nil, protocol.ErrMatchAlreadyStarted
	}

	if len(room.Players) >= room.Config.MaxPlayers || len(room.Players) >= 10 {
		return nil, protocol.ErrRoomFull
	}

	// Add or reconnect player
	existingPlayer := room.FindPlayer(userID)
	if existingPlayer != nil {
		existingPlayer.IsOnline = true
	} else {
		var imgPtr *string
		if image != "" {
			imgVal := image
			imgPtr = &imgVal
		}

		newPlayer := &domain.Player{
			ID:         userID,
			Username:   username,
			Image:      imgPtr,
			IsOnline:   true,
			IsHost:     false,
			IsReady:    false,
			Score:      0,
			LastGuess:  nil,
			HasGuessed: false,
		}
		room.Players = append(room.Players, newPlayer)
	}

	// Broadcast update to all players in the room
	go s.BroadcastRoomState(room)

	return room, nil
}

// Leave removes a player from a room.
func (s *Service) Leave(ctx context.Context, roomID, userID string) error {
	room, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	room.Mu.Lock()

	// Capture name before removal for potential abandon message
	leaverName := userID
	if p := room.FindPlayer(userID); p != nil {
		leaverName = p.Username
	}

	removed := room.RemovePlayer(userID)
	if !removed {
		room.Mu.Unlock()
		return protocol.ErrPlayerNotFound
	}

	if len(room.Players) == 0 {
		room.StopTimer()
		room.Mu.Unlock()
		s.manager.DeleteRoom(roomID)
		return nil
	}

	// Quick-match mid-game: notify remaining players and end the room.
	if room.IsQuickMatch && room.State != domain.RoomStateLobby {
		var onlineIDs []string
		for _, player := range room.Players {
			if player.IsOnline {
				onlineIDs = append(onlineIDs, player.ID)
			}
		}
		room.StopTimer()
		room.Mu.Unlock()
		s.manager.DeleteRoom(roomID)
		reason := leaverName + " left the match."
		s.notifier.SendToUser(userID, protocol.EventLeftConfirm, protocol.LeftConfirmPayload{})
		for _, id := range onlineIDs {
			s.notifier.SendToUser(id, protocol.EventMatchAbandoned, protocol.MatchAbandonedPayload{Reason: reason})
		}
		return nil
	}

	// Migrate host if the host left
	if room.HostPlayerID == userID {
		room.MigrateHost()
	}

	room.Mu.Unlock()

	// Send left confirmation to the player who left
	s.notifier.SendToUser(userID, protocol.EventLeftConfirm, protocol.LeftConfirmPayload{})

	// Broadcast state update to remaining players
	go s.BroadcastRoomState(room)

	return nil
}

// Kick removes a player from the room (host only).
func (s *Service) Kick(ctx context.Context, roomID, hostID, targetPlayerID string) error {
	room, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	room.Mu.Lock()
	if room.HostPlayerID != hostID {
		room.Mu.Unlock()
		return protocol.ErrNotHost
	}

	if targetPlayerID == hostID {
		room.Mu.Unlock()
		return fmt.Errorf("cannot kick yourself")
	}

	removed := room.RemovePlayer(targetPlayerID)
	if !removed {
		room.Mu.Unlock()
		return protocol.ErrPlayerNotFound
	}

	room.Mu.Unlock()

	// Notify kicked player
	s.notifier.SendToUser(targetPlayerID, protocol.EventRoomKicked, protocol.KickedPayload{Message: "Kicked by host"})
	s.notifier.SendToUser(targetPlayerID, protocol.EventLeftConfirm, protocol.LeftConfirmPayload{})

	// Broadcast state update to remaining players
	go s.BroadcastRoomState(room)

	return nil
}

// UpdateConfig changes room settings (host only, lobby state).
func (s *Service) UpdateConfig(ctx context.Context, roomID, hostID string, config domain.RoomConfig) error {
	room, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	room.Mu.Lock()
	if room.HostPlayerID != hostID {
		room.Mu.Unlock()
		return protocol.ErrNotHost
	}

	if room.State != domain.RoomStateLobby {
		room.Mu.Unlock()
		return protocol.ErrNotInLobby
	}

	room.Config = config
	room.Timer = config.RoundDuration
	room.Mu.Unlock()

	// Broadcast updated lobby state
	go s.BroadcastRoomState(room)

	return nil
}

// SetPrivacy toggles a room between public and private (host only, lobby state).
func (s *Service) SetPrivacy(ctx context.Context, roomID, hostID string, isPrivate bool) error {
	room, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	room.Mu.Lock()
	if room.HostPlayerID != hostID {
		room.Mu.Unlock()
		return protocol.ErrNotHost
	}

	if room.State != domain.RoomStateLobby {
		room.Mu.Unlock()
		return protocol.ErrNotInLobby
	}

	room.IsPrivate = isPrivate
	room.Mu.Unlock()

	go s.BroadcastRoomState(room)

	return nil
}

// HandleDisconnect marks a player as offline.
func (s *Service) HandleDisconnect(ctx context.Context, roomID, userID string) error {
	room, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	room.Mu.Lock()
	p := room.FindPlayer(userID)
	if p == nil {
		room.Mu.Unlock()
		return protocol.ErrPlayerNotFound
	}

	leaverName := p.Username
	p.IsOnline = false

	// Collect remaining online players
	var onlineIDs []string
	for _, player := range room.Players {
		if player.IsOnline {
			onlineIDs = append(onlineIDs, player.ID)
		}
	}

	if len(onlineIDs) == 0 {
		room.StopTimer()
		room.Mu.Unlock()
		s.manager.DeleteRoom(roomID)
		return nil
	}

	// Quick-match mid-game: notify remaining player and end the room.
	if room.IsQuickMatch && room.State != domain.RoomStateLobby {
		room.StopTimer()
		room.Mu.Unlock()
		s.manager.DeleteRoom(roomID)
		reason := leaverName + " disconnected from the match."
		for _, id := range onlineIDs {
			s.notifier.SendToUser(id, protocol.EventMatchAbandoned, protocol.MatchAbandonedPayload{Reason: reason})
		}
		return nil
	}

	// Migrate host if the host disconnected
	if room.HostPlayerID == userID {
		room.MigrateHost()
	}

	room.Mu.Unlock()

	// Broadcast state update to remaining online players
	go s.BroadcastRoomState(room)

	return nil
}

// BroadcastRoomState sends a customized (sanitized) update to each player.
func (s *Service) BroadcastRoomState(room *domain.Room) {
	room.Mu.RLock()
	playersSnapshot := make([]*domain.Player, len(room.Players))
	for i, p := range room.Players {
		playersSnapshot[i] = p
	}
	room.Mu.RUnlock()

	for _, p := range playersSnapshot {
		if p.IsOnline {
			sanitized := SanitizeRoomState(room, p.ID)
			s.notifier.SendToUser(p.ID, protocol.EventRoomStateUpdate, sanitized)
		}
	}
}
