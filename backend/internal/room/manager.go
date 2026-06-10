package room

import (
	"sync"

	"wherebear/backend/internal/domain"
)

type Manager struct {
	mu                 sync.RWMutex
	rooms              map[string]*domain.Room
	inviteCodeToRoomID map[string]string
}

func NewManager() *Manager {
	return &Manager{
		rooms:              make(map[string]*domain.Room),
		inviteCodeToRoomID: make(map[string]string),
	}
}

// AddRoom inserts a room into the registry.
func (m *Manager) AddRoom(room *domain.Room) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.rooms[room.ID] = room
	m.inviteCodeToRoomID[room.InviteCode] = room.ID
}

// GetRoom retrieves a room by ID.
func (m *Manager) GetRoom(roomID string) (*domain.Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.rooms[roomID]
	return r, ok
}

// GetRoomByInviteCode retrieves a room by its invite code.
func (m *Manager) GetRoomByInviteCode(inviteCode string) (*domain.Room, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	roomID, ok := m.inviteCodeToRoomID[inviteCode]
	if !ok {
		return nil, false
	}
	r, ok := m.rooms[roomID]
	return r, ok
}

// DeleteRoom removes a room from the registry.
func (m *Manager) DeleteRoom(roomID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if r, ok := m.rooms[roomID]; ok {
		delete(m.inviteCodeToRoomID, r.InviteCode)
		delete(m.rooms, roomID)
	}
}

// InviteCodeExists checks if an invite code is already registered.
func (m *Manager) InviteCodeExists(inviteCode string) bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	_, ok := m.inviteCodeToRoomID[inviteCode]
	return ok
}

// ListPublicRooms returns non-full, lobby-state public rooms.
func (m *Manager) ListPublicRooms() []*domain.Room {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []*domain.Room
	for _, r := range m.rooms {
		r.Mu.RLock()
		if !r.IsPrivate && r.State == domain.RoomStateLobby && len(r.Players) < r.Config.MaxPlayers {
			list = append(list, r)
		}
		r.Mu.RUnlock()
	}
	return list
}
