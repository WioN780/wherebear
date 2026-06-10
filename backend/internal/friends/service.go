package friends

import (
	"context"
	"log"

	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/presence"
	"wherebear/backend/internal/repository"
	"wherebear/backend/pkg/protocol"
)

type Service struct {
	friendRepo  repository.FriendRepository
	userRepo    repository.UserRepository
	tracker     *presence.Tracker
	broadcaster *presence.Broadcaster
	notifier    domain.Notifier
}

func NewService(
	friendRepo repository.FriendRepository,
	userRepo repository.UserRepository,
	tracker *presence.Tracker,
	broadcaster *presence.Broadcaster,
	notifier domain.Notifier,
) *Service {
	return &Service{
		friendRepo:  friendRepo,
		userRepo:    userRepo,
		tracker:     tracker,
		broadcaster: broadcaster,
		notifier:    notifier,
	}
}

// SendFriendRequest handles validating and saving a new friend request.
func (s *Service) SendFriendRequest(ctx context.Context, senderID, receiverEmailOrName string) error {
	// 1. Find the receiver
	receiver, err := s.userRepo.FindByEmailOrName(ctx, receiverEmailOrName)
	if err != nil {
		return err // User not found
	}

	if receiver.ID == senderID {
		return protocol.ErrCannotAddSelf
	}

	// 2. Check if friendship already exists
	existing, err := s.friendRepo.FindBetween(ctx, senderID, receiver.ID)
	if err != nil {
		return err
	}

	if existing != nil {
		if existing.Status == domain.FriendStatusAccepted {
			return protocol.ErrAlreadyFriends
		}
		return protocol.ErrRequestPending
	}

	// 3. Create pending friendship
	friendship, err := s.friendRepo.Create(ctx, senderID, receiver.ID)
	if err != nil {
		return err
	}

	// 4. Send success back to the sender
	s.notifier.SendToUser(senderID, protocol.EventSuccess, protocol.SuccessPayload{
		Message: "Friend request sent!",
	})

	// 5. Notify the receiver if they are currently online (include RequestID so they can respond)
	if s.tracker.IsUserOnline(receiver.ID) {
		sender, err := s.userRepo.GetByID(ctx, senderID)
		if err == nil {
			s.notifier.SendToUser(receiver.ID, protocol.EventFriendRequestReceived, protocol.FriendRequestReceivedPayload{
				RequestID:   friendship.ID,
				SenderID:    sender.ID,
				SenderName:  sender.Username,
				SenderImage: sender.Image,
			})
		} else {
			log.Printf("[FriendsService] Error looking up sender %s for notification: %v", senderID, err)
		}
	}

	return nil
}

// RespondFriendRequest processes accepting or declining an incoming request.
func (s *Service) RespondFriendRequest(ctx context.Context, requestID, userID, action string) error {
	friendship, err := s.friendRepo.GetByID(ctx, requestID)
	if err != nil {
		return err
	}

	if friendship.ReceiverID != userID {
		return protocol.ErrUnauthorized
	}

	if action == "ACCEPT" {
		// Update status to ACCEPTED
		err = s.friendRepo.UpdateStatus(ctx, requestID, domain.FriendStatusAccepted)
		if err != nil {
			return err
		}

		// Send success to receiver
		s.notifier.SendToUser(userID, protocol.EventSuccess, protocol.SuccessPayload{
			Message: "Friend request accepted!",
		})

		// Trigger presence recalculation/broadcast for both users
		go s.broadcaster.BroadcastPresence(userID, s.tracker.IsUserOnline(userID))
		go s.broadcaster.BroadcastPresence(friendship.SenderID, s.tracker.IsUserOnline(friendship.SenderID))

	} else {
		// Decline (delete friendship entry)
		err = s.friendRepo.Delete(ctx, requestID)
		if err != nil {
			return err
		}

		s.notifier.SendToUser(userID, protocol.EventSuccess, protocol.SuccessPayload{
			Message: "Friend request declined.",
		})
	}

	return nil
}
