package domain

// Location represents a geographic point used as a game round target.
type Location struct {
	ID          string   `json:"id"`
	Lat         float64  `json:"lat"`
	Lng         float64  `json:"lng"`
	PanoID      *string  `json:"panoId"`
	Heading     *float64 `json:"heading"`
	Country     string   `json:"country"`
	Subdivision *string  `json:"subdivision"`
	Surface     *string  `json:"surface"`
	Elevation   *float64 `json:"elevation"`
	Difficulty  string   `json:"difficulty"`
}
