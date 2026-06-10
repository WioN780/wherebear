package domain

// Notifier abstracts the ability to send messages to connected users.
// Implemented by the WebSocket hub; consumed by services.
// This interface lives in domain to break the circular dependency
// between services (which need to send messages) and the WebSocket
// layer (which routes messages to services).
type Notifier interface {
	// SendToUser delivers a typed message to all active connections for a user.
	SendToUser(userID string, eventType string, payload interface{})
}
