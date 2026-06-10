package matchmaking

import (
	"context"

	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/room"
)

type Service struct {
	manager *room.Manager
	roomSvc *room.Service
}

func NewService(manager *room.Manager, roomSvc *room.Service) *Service {
	return &Service{
		manager: manager,
		roomSvc: roomSvc,
	}
}

// ListPublic returns all public lobbies that are not full.
func (s *Service) ListPublic(ctx context.Context) []*domain.Room {
	return s.manager.ListPublicRooms()
}

// QuickMatch assigns a player to the first available quick-match room matching the chosen difficulty.
// If no rooms are waiting, it creates a new 1v1 room and marks it as a quick-match room.
// Quick-match rooms auto-start when both players are present and end immediately if a player leaves.
func (s *Service) QuickMatch(ctx context.Context, userID, username, image string, difficulty string) (*domain.Room, error) {
	publicRooms := s.manager.ListPublicRooms()

	for _, r := range publicRooms {
		r.Mu.RLock()
		isQM := r.IsQuickMatch
		diff := string(r.Config.Difficulty)
		r.Mu.RUnlock()

		// Only join quick-match waiting rooms that match the requested difficulty
		if isQM && diff == difficulty {
			joined, err := s.roomSvc.Join(ctx, r.InviteCode, userID, username, image)
			if err == nil {
				return joined, nil
			}
		}
	}

	// No waiting quick-match room found; create a new 1v1 room
	defaultConfig := domain.RoomConfig{
		Mode:          domain.GameModeClassic,
		Difficulty:    domain.Difficulty(difficulty),
		MaxPlayers:    2,   // Duel format
		TotalRounds:   5,
		RoundDuration: 120,
		Country:       nil,
	}

	newRoom, err := s.roomSvc.Create(ctx, userID, username, image, false, true, defaultConfig)
	if err != nil {
		return nil, err
	}

	return newRoom, nil
}
