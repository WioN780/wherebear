package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"wherebear/backend/internal/domain"
	"wherebear/backend/pkg/protocol"
)

type sqlFriendRepository struct {
	db *sql.DB
}

func NewFriendRepository(db *sql.DB) FriendRepository {
	return &sqlFriendRepository{db: db}
}

func (r *sqlFriendRepository) Create(ctx context.Context, senderID, receiverID string) (*domain.Friendship, error) {
	id := fmt.Sprintf("fs_%d", time.Now().UnixNano())
	now := time.Now()

	query := `
		INSERT INTO "Friendship" ("id", "senderId", "receiverId", "status", "createdAt", "updatedAt")
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	_, err := r.db.ExecContext(ctx, query, id, senderID, receiverID, string(domain.FriendStatusPending), now, now)
	if err != nil {
		return nil, fmt.Errorf("creating friendship: %w", err)
	}

	return &domain.Friendship{
		ID:         id,
		SenderID:   senderID,
		ReceiverID: receiverID,
		Status:     domain.FriendStatusPending,
	}, nil
}

func (r *sqlFriendRepository) UpdateStatus(ctx context.Context, id string, status domain.FriendStatus) error {
	now := time.Now()
	query := `
		UPDATE "Friendship"
		SET "status" = $1, "updatedAt" = $2
		WHERE "id" = $3
	`
	res, err := r.db.ExecContext(ctx, query, string(status), now, id)
	if err != nil {
		return fmt.Errorf("updating friendship status: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return protocol.ErrRequestNotFound
	}
	return nil
}

func (r *sqlFriendRepository) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM "Friendship" WHERE "id" = $1`
	res, err := r.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("deleting friendship: %w", err)
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return protocol.ErrRequestNotFound
	}
	return nil
}

func (r *sqlFriendRepository) GetByID(ctx context.Context, id string) (*domain.Friendship, error) {
	var fs domain.Friendship
	var statusStr string

	query := `
		SELECT "id", "senderId", "receiverId", "status"
		FROM "Friendship"
		WHERE "id" = $1
	`
	err := r.db.QueryRowContext(ctx, query, id).Scan(&fs.ID, &fs.SenderID, &fs.ReceiverID, &statusStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, protocol.ErrRequestNotFound
		}
		return nil, fmt.Errorf("getting friendship by id: %w", err)
	}

	fs.Status = domain.FriendStatus(statusStr)
	return &fs, nil
}

func (r *sqlFriendRepository) FindBetween(ctx context.Context, userA, userB string) (*domain.Friendship, error) {
	var fs domain.Friendship
	var statusStr string

	query := `
		SELECT "id", "senderId", "receiverId", "status"
		FROM "Friendship"
		WHERE ("senderId" = $1 AND "receiverId" = $2) OR ("senderId" = $2 AND "receiverId" = $1)
	`
	err := r.db.QueryRowContext(ctx, query, userA, userB).Scan(&fs.ID, &fs.SenderID, &fs.ReceiverID, &statusStr)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil // Return nil, nil when no friendship exists between users
		}
		return nil, fmt.Errorf("finding friendship between users: %w", err)
	}

	fs.Status = domain.FriendStatus(statusStr)
	return &fs, nil
}

func (r *sqlFriendRepository) ListPending(ctx context.Context, receiverID string) ([]domain.PendingRequest, error) {
	query := `
		SELECT f."id", u."id", u."name", u."email", u."image"
		FROM "Friendship" f
		JOIN "User" u ON f."senderId" = u."id"
		WHERE f."receiverId" = $1 AND f."status" = 'PENDING'
	`
	rows, err := r.db.QueryContext(ctx, query, receiverID)
	if err != nil {
		return nil, fmt.Errorf("listing pending requests: %w", err)
	}
	defer rows.Close()

	var pending []domain.PendingRequest
	for rows.Next() {
		var p domain.PendingRequest
		var name, email, image sql.NullString
		if err := rows.Scan(&p.RequestID, &p.SenderID, &name, &email, &image); err != nil {
			return nil, fmt.Errorf("scanning pending request: %w", err)
		}
		if name.Valid && name.String != "" {
			p.SenderName = name.String
		} else if email.Valid && email.String != "" {
			p.SenderName = email.String
		} else {
			p.SenderName = "Explorer"
		}
		if image.Valid {
			p.SenderImage = image.String
		}
		pending = append(pending, p)
	}
	return pending, rows.Err()
}

func (r *sqlFriendRepository) ListAccepted(ctx context.Context, userID string) ([]domain.FriendWithUser, error) {
	query := `
		SELECT u."id", u."name", u."email", u."image"
		FROM "Friendship" f
		JOIN "User" u ON (f."senderId" = u."id" AND f."receiverId" = $1) OR (f."receiverId" = u."id" AND f."senderId" = $1)
		WHERE f."status" = 'ACCEPTED'
	`
	rows, err := r.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("listing friends: %w", err)
	}
	defer rows.Close()

	var friends []domain.FriendWithUser
	for rows.Next() {
		var f domain.FriendWithUser
		var name, email sql.NullString
		var image sql.NullString

		err = rows.Scan(&f.UserID, &name, &email, &image)
		if err != nil {
			return nil, fmt.Errorf("scanning friend: %w", err)
		}

		if name.Valid && name.String != "" {
			f.Username = name.String
		} else if email.Valid && email.String != "" {
			f.Username = email.String
		} else {
			f.Username = "Explorer"
		}

		if image.Valid {
			f.Image = image.String
		}

		friends = append(friends, f)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating friends: %w", err)
	}

	return friends, nil
}
