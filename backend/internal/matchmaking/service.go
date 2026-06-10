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

// QuickMatch assigns a player to the first available public room matching the chosen difficulty.
// If no rooms are available, it creates a new public room with that difficulty and 2-min (120s) rounds.
func (s *Service) QuickMatch(ctx context.Context, userID, username, image string, difficulty string) (*domain.Room, error) {
	publicRooms := s.manager.ListPublicRooms()

	for _, r := range publicRooms {
		// Only join if difficulty matches the user preference
		if string(r.Config.Difficulty) == difficulty {
			joined, err := s.roomSvc.Join(ctx, r.InviteCode, userID, username, image)
			if err == nil {
				return joined, nil
			}
		}
	}

	// No public rooms found or join attempts failed; create a new room
	defaultConfig := domain.RoomConfig{
		Mode:          domain.GameModeClassic,
		Difficulty:    domain.Difficulty(difficulty),
		MaxPlayers:    5,
		TotalRounds:   5,
		RoundDuration: 120, // Standard 2 minutes
		Country:       nil,
	}

	newRoom, err := s.roomSvc.Create(ctx, userID, username, image, false, defaultConfig)
	if err != nil {
		return nil, err
	}

	return newRoom, nil
}
