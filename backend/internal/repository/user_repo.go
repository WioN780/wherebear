package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"wherebear/backend/internal/domain"
	"wherebear/backend/pkg/protocol"
)

type sqlUserRepository struct {
	db *sql.DB
}

func NewUserRepository(db *sql.DB) UserRepository {
	return &sqlUserRepository{db: db}
}

func (r *sqlUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	var name sql.NullString
	var email sql.NullString
	var image sql.NullString

	query := `
		SELECT "id", "name", "email", "image"
		FROM "User"
		WHERE "id" = $1
	`
	err := r.db.QueryRowContext(ctx, query, id).Scan(&id, &name, &email, &image)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, protocol.ErrUserNotFound
		}
		return nil, fmt.Errorf("getting user by id: %w", err)
	}

	u := &domain.User{
		ID: id,
	}

	if name.Valid && name.String != "" {
		u.Username = name.String
	} else if email.Valid && email.String != "" {
		u.Username = email.String
	} else {
		u.Username = "Explorer"
	}

	if email.Valid {
		u.Email = email.String
	}

	if image.Valid {
		u.Image = image.String
	}

	return u, nil
}

func (r *sqlUserRepository) FindByEmailOrName(ctx context.Context, queryStr string) (*domain.User, error) {
	var id string
	var name sql.NullString
	var email sql.NullString
	var image sql.NullString

	query := `
		SELECT "id", "name", "email", "image"
		FROM "User"
		WHERE LOWER("email") = LOWER($1) OR LOWER("name") = LOWER($1)
	`
	err := r.db.QueryRowContext(ctx, query, queryStr).Scan(&id, &name, &email, &image)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, protocol.ErrUserNotFound
		}
		return nil, fmt.Errorf("finding user by email/name: %w", err)
	}

	u := &domain.User{
		ID: id,
	}

	if name.Valid && name.String != "" {
		u.Username = name.String
	} else if email.Valid && email.String != "" {
		u.Username = email.String
	} else {
		u.Username = "Explorer"
	}

	if email.Valid {
		u.Email = email.String
	}

	if image.Valid {
		u.Image = image.String
	}

	return u, nil
}
