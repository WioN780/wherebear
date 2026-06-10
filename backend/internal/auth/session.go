package auth

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"wherebear/backend/pkg/protocol"
)

type SessionVerifier struct {
	db *sql.DB
}

func NewSessionVerifier(db *sql.DB) *SessionVerifier {
	return &SessionVerifier{db: db}
}

// Verify checks if the session token is valid, not expired, and returns userID, username, image, error.
func (s *SessionVerifier) Verify(ctx context.Context, sessionToken string) (string, string, string, error) {
	var userID, name, email string
	var image sql.NullString
	var expires time.Time

	query := `
		SELECT s."userId", s."expires", u."name", u."email", u."image"
		FROM "Session" s
		JOIN "User" u ON s."userId" = u."id"
		WHERE s."sessionToken" = $1
	`
	err := s.db.QueryRowContext(ctx, query, sessionToken).Scan(&userID, &expires, &name, &email, &image)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", "", "", protocol.ErrSessionNotFound
		}
		return "", "", "", fmt.Errorf("querying session: %w", err)
	}

	if expires.Before(time.Now()) {
		return "", "", "", protocol.ErrSessionExpired
	}

	username := name
	if username == "" {
		username = email
	}
	if username == "" {
		username = "Explorer"
	}

	imgURL := ""
	if image.Valid {
		imgURL = image.String
	}

	return userID, username, imgURL, nil
}
