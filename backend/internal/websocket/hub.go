package websocket

import (
	"wherebear/backend/internal/presence"
	"wherebear/backend/pkg/protocol"
)

type Hub struct {
	tracker     *presence.Tracker
	broadcaster *presence.Broadcaster
}

func NewHub(tracker *presence.Tracker, broadcaster *presence.Broadcaster) *Hub {
	return &Hub{
		tracker:     tracker,
		broadcaster: broadcaster,
	}
}

// Implements domain.Notifier.
// Delivers a typed message to all active connection tabs for a given user.
func (h *Hub) SendToUser(userID string, eventType string, payload interface{}) {
	conns := h.tracker.GetUserConnections(userID)
	msg := protocol.OutboundMessage{
		Type:    eventType,
		Payload: payload,
	}

	for _, cInterface := range conns {
		if c, ok := cInterface.(*Connection); ok {
			_ = c.WriteJSON(msg)
		}
	}
}

// Register registers a new active connection for a user.
func (h *Hub) Register(conn *Connection, userID string) {
	isFirst := h.tracker.AddConnection(conn, userID)
	if isFirst {
		// Broadcast to friends that this user has come online
		go h.broadcaster.BroadcastPresence(userID, true)
	}
}

// Unregister removes an active connection.
// Returns the userID and roomID so the handler can execute room cleanups.
func (h *Hub) Unregister(conn *Connection) (string, string) {
	userID, roomID, isLast := h.tracker.RemoveConnection(conn)
	if isLast && userID != "" {
		// Broadcast to friends that this user has gone offline
		go h.broadcaster.BroadcastPresence(userID, false)
	}
	return userID, roomID
}
