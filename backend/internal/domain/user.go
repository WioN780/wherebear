package domain

// User represents an authenticated platform identity.
type User struct {
	ID       string
	Username string
	Email    string
	Image    string
}
