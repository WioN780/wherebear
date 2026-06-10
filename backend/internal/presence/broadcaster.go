package presence

import (
	"context"
	"log"

	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/repository"
	"wherebear/backend/pkg/protocol"
)

type Broadcaster struct {
	tracker    *Tracker
	friendRepo repository.FriendRepository
	userRepo   repository.UserRepository
	notifier   domain.Notifier
}

func NewBroadcaster(
	tracker *Tracker,
	friendRepo repository.FriendRepository,
	userRepo repository.UserRepository,
	notifier domain.Notifier,
) *Broadcaster {
	return &Broadcaster{
		tracker:    tracker,
		friendRepo: friendRepo,
		userRepo:   userRepo,
		notifier:   notifier,
	}
}

// BroadcastPresence notifies friends when a user's presence state transitions.
// When transitioning online, it also sends the user their own friend list state.
func (b *Broadcaster) BroadcastPresence(userID string, isOnline bool) {
	ctx := context.Background()
	friends, err := b.friendRepo.ListAccepted(ctx, userID)
	if err != nil {
		log.Printf("[Presence] Error listing friends for presence broadcast: %v", err)
		return
	}

	// 1. Broadcast online status to all online friends
	if len(friends) > 0 {
		var user *domain.User
		hasOnlineFriends := false
		for _, f := range friends {
			if b.tracker.IsUserOnline(f.UserID) {
				hasOnlineFriends = true
				break
			}
		}

		if hasOnlineFriends {
			user, err = b.userRepo.GetByID(ctx, userID)
			if err != nil {
				log.Printf("[Presence] Error fetching user %s for presence: %v", userID, err)
				return
			}

			payload := protocol.PresenceChangePayload{
				UserID:   user.ID,
				Username: user.Username,
				Image:    user.Image,
				IsOnline: isOnline,
			}

			for _, f := range friends {
				if b.tracker.IsUserOnline(f.UserID) {
					b.notifier.SendToUser(f.UserID, protocol.EventPresenceChange, payload)
				}
			}
		}
	}

	// 2. If connecting online, push their own friend list back with latest statuses
	if isOnline {
		friendList := make([]protocol.PresenceChangePayload, len(friends))
		for i, f := range friends {
			friendList[i] = protocol.PresenceChangePayload{
				UserID:   f.UserID,
				Username: f.Username,
				Image:    f.Image,
				IsOnline: b.tracker.IsUserOnline(f.UserID),
			}
		}
		b.notifier.SendToUser(userID, protocol.EventFriendListUpdate, friendList)
	}
}
