package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"wherebear/backend/internal/domain"
)

type sqlLocationRepository struct {
	db *sql.DB
}

func NewLocationRepository(db *sql.DB) LocationRepository {
	return &sqlLocationRepository{db: db}
}

func (r *sqlLocationRepository) GetRandom(ctx context.Context, count int, mode, country, difficulty string) ([]domain.Location, error) {
	query := `
		SELECT "id", "lat", "lng", "panoId", "heading", "country", "subdivision", "surface", "elevation", "difficulty"
		FROM "Location"
		WHERE 1=1
	`
	var args []interface{}
	argIdx := 1

	if difficulty != "" {
		query += fmt.Sprintf(` AND "difficulty" = $%d`, argIdx)
		args = append(args, difficulty)
		argIdx++
	}

	if mode == "COUNTRY" && country != "" {
		query += fmt.Sprintf(` AND LOWER("country") = LOWER($%d)`, argIdx)
		args = append(args, country)
		argIdx++
	}

	query += " LIMIT 1000"

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying locations: %w", err)
	}
	defer rows.Close()

	var locations []domain.Location
	for rows.Next() {
		var loc domain.Location
		var panoID sql.NullString
		var heading sql.NullFloat64
		var subdivision sql.NullString
		var surface sql.NullString
		var elevation sql.NullFloat64

		err := rows.Scan(
			&loc.ID, &loc.Lat, &loc.Lng, &panoID, &heading,
			&loc.Country, &subdivision, &surface, &elevation, &loc.Difficulty,
		)
		if err != nil {
			return nil, fmt.Errorf("scanning location: %w", err)
		}

		if panoID.Valid {
			loc.PanoID = &panoID.String
		}
		if heading.Valid {
			loc.Heading = &heading.Float64
		}
		if subdivision.Valid {
			loc.Subdivision = &subdivision.String
		}
		if surface.Valid {
			loc.Surface = &surface.String
		}
		if elevation.Valid {
			loc.Elevation = &elevation.Float64
		}

		locations = append(locations, loc)
	}

	if err = rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating locations: %w", err)
	}

	if len(locations) == 0 {
		return nil, errors.New("no locations matching criteria found")
	}

	// Shuffle locations
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	rng.Shuffle(len(locations), func(i, j int) {
		locations[i], locations[j] = locations[j], locations[i]
	})

	if len(locations) > count {
		locations = locations[:count]
	}

	return locations, nil
}
