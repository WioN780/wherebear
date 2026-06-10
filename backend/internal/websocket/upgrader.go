package websocket

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"

	"wherebear/backend/internal/auth"

	"github.com/gorilla/websocket"
)

type Upgrader struct {
	wsUpgrader websocket.Upgrader
	verifier   *auth.SessionVerifier
	corsOrigin string
}

type AuthUser struct {
	ID       string
	Username string
	Image    string
}

func NewUpgrader(verifier *auth.SessionVerifier, corsOrigin string) *Upgrader {
	u := &Upgrader{
		verifier:   verifier,
		corsOrigin: corsOrigin,
	}
	u.wsUpgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		CheckOrigin:     u.checkOrigin,
	}
	return u
}

// checkOrigin rejects cross-origin WebSocket handshakes. Browsers always send an
// Origin header on WS upgrades, so requiring it to match the configured origin
// blocks CSRF-style socket opens from other sites. Requests with no Origin header
// (non-browser clients, which cannot ride a victim's cookies) are allowed.
func (u *Upgrader) checkOrigin(r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	return origin == u.corsOrigin
}

// Upgrade upgrades the HTTP connection and extracts the authenticated or guest user info.
func (u *Upgrader) Upgrade(w http.ResponseWriter, r *http.Request) (*websocket.Conn, *AuthUser, error) {
	authUser, err := u.authenticate(r)
	if err != nil {
		return nil, nil, err
	}

	conn, err := u.wsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		return nil, nil, err
	}

	return conn, authUser, nil
}

func (u *Upgrader) authenticate(r *http.Request) (*AuthUser, error) {
	// Try to get the NextAuth session token from cookies.
	token := getSessionToken(r)
	if token != "" {
		userID, username, image, err := u.verifier.Verify(r.Context(), token)
		if err == nil {
			return &AuthUser{
				ID:       userID,
				Username: username,
				Image:    image,
			}, nil
		}
		// A token was presented but failed verification — reject rather than
		// silently downgrading an authenticated user to a guest.
		return nil, fmt.Errorf("invalid session: %w", err)
	}

	// No session: issue a fresh, server-generated guest identity. The guest ID is
	// never taken from the request, so a client cannot impersonate another guest.
	username := r.URL.Query().Get("username")
	if username == "" {
		username = "Guest Bear"
	}
	image := r.URL.Query().Get("image")

	return &AuthUser{
		ID:       newGuestID(),
		Username: username,
		Image:    image,
	}, nil
}

// newGuestID returns an unguessable guest identifier of the form "guest_<random>".
func newGuestID() string {
	var b [16]byte
	if _, err := rand.Read(b[:]); err != nil {
		// crypto/rand should never fail; fall back to a still-namespaced value.
		return "guest_anonymous"
	}
	return "guest_" + hex.EncodeToString(b[:])
}

func getSessionToken(r *http.Request) string {
	cookieNames := []string{
		"authjs.session-token",
		"__Secure-authjs.session-token",
		"next-auth.session-token",
		"__Secure-next-auth.session-token",
	}
	for _, name := range cookieNames {
		if cookie, err := r.Cookie(name); err == nil {
			return cookie.Value
		}
	}
	return ""
}
