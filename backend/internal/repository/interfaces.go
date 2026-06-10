package repository

import (
	"context"

	"wherebear/backend/internal/domain"
)

type LocationRepository interface {
	GetRandom(ctx context.Context, count int, mode, country, difficulty string) ([]domain.Location, error)
}

type UserRepository interface {
	GetByID(ctx context.Context, id string) (*domain.User, error)
	FindByEmailOrName(ctx context.Context, query string) (*domain.User, error)
}

type FriendRepository interface {
	Create(ctx context.Context, senderID, receiverID string) (*domain.Friendship, error)
	UpdateStatus(ctx context.Context, id string, status domain.FriendStatus) error
	Delete(ctx context.Context, id string) error
	GetByID(ctx context.Context, id string) (*domain.Friendship, error)
	FindBetween(ctx context.Context, userA, userB string) (*domain.Friendship, error)
	ListAccepted(ctx context.Context, userID string) ([]domain.FriendWithUser, error)
	ListPending(ctx context.Context, receiverID string) ([]domain.PendingRequest, error)
}

type LeaderboardRepository interface {
	SaveGameResult(ctx context.Context, userID string, score int) error
}
