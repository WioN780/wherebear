package domain

// FriendStatus represents the state of a friendship.
type FriendStatus string

const (
	FriendStatusPending  FriendStatus = "PENDING"
	FriendStatusAccepted FriendStatus = "ACCEPTED"
)

// Friendship represents a directional friend request between two users.
type Friendship struct {
	ID         string
	SenderID   string
	ReceiverID string
	Status     FriendStatus
}

// FriendWithUser is a denormalized friend entry for presence/list responses.
type FriendWithUser struct {
	UserID   string `json:"userId"`
	Username string `json:"username"`
	Image    string `json:"image"`
}

// PendingRequest is an incoming (not yet accepted) friend request with sender info.
type PendingRequest struct {
	RequestID   string `json:"requestId"`
	SenderID    string `json:"senderId"`
	SenderName  string `json:"senderName"`
	SenderImage string `json:"senderImage"`
}
