package presence

import (
	"sync"
)

// Tracker tracks mapping from user IDs to their active connection(s),
// supporting multi-tab clients (only offline when all connections close).
type Tracker struct {
	mu                sync.RWMutex
	activeConnections map[string]map[interface{}]bool // userID -> set of connection references
	connectionToUser  map[interface{}]string
	connectionToRoom  map[interface{}]string
}

func NewTracker() *Tracker {
	return &Tracker{
		activeConnections: make(map[string]map[interface{}]bool),
		connectionToUser:  make(map[interface{}]string),
		connectionToRoom:  make(map[interface{}]string),
	}
}

// AddConnection adds a connection to the tracker for a user.
// Returns true if this is the user's first connection (user transitions online).
func (t *Tracker) AddConnection(conn interface{}, userID string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()

	t.connectionToUser[conn] = userID

	if _, ok := t.activeConnections[userID]; !ok {
		t.activeConnections[userID] = make(map[interface{}]bool)
	}

	isFirst := len(t.activeConnections[userID]) == 0
	t.activeConnections[userID][conn] = true

	return isFirst
}

// RemoveConnection removes a connection from the tracker.
// Returns user ID, room ID, and true if this was the user's last connection (user transitions offline).
func (t *Tracker) RemoveConnection(conn interface{}) (string, string, bool) {
	t.mu.Lock()
	defer t.mu.Unlock()

	userID := t.connectionToUser[conn]
	roomID := t.connectionToRoom[conn]

	delete(t.connectionToUser, conn)
	delete(t.connectionToRoom, conn)

	if userID == "" {
		return "", "", false
	}

	isLast := false
	if conns, ok := t.activeConnections[userID]; ok {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(t.activeConnections, userID)
			isLast = true
		}
	}

	return userID, roomID, isLast
}

// AssociateRoom links a connection to a room ID.
func (t *Tracker) AssociateRoom(conn interface{}, roomID string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.connectionToRoom[conn] = roomID
}

// ClearRoom removes the room association for a connection.
func (t *Tracker) ClearRoom(conn interface{}) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.connectionToRoom, conn)
}

// GetRoom retrieves the room ID associated with a connection.
func (t *Tracker) GetRoom(conn interface{}) string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.connectionToRoom[conn]
}

// GetUser retrieves the user ID associated with a connection.
func (t *Tracker) GetUser(conn interface{}) string {
	t.mu.RLock()
	defer t.mu.RUnlock()
	return t.connectionToUser[conn]
}

// IsUserOnline returns true if the user has one or more active connections.
func (t *Tracker) IsUserOnline(userID string) bool {
	t.mu.RLock()
	defer t.mu.RUnlock()
	conns, ok := t.activeConnections[userID]
	return ok && len(conns) > 0
}

// GetUserConnections returns a slice of all active connections for a user.
func (t *Tracker) GetUserConnections(userID string) []interface{} {
	t.mu.RLock()
	defer t.mu.RUnlock()
	conns, ok := t.activeConnections[userID]
	if !ok {
		return nil
	}
	list := make([]interface{}, 0, len(conns))
	for c := range conns {
		list = append(list, c)
	}
	return list
}
