package websocket

import (
	"context"
	"encoding/json"
	"log"
	"net/http"

	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/friends"
	"wherebear/backend/internal/game"
	"wherebear/backend/internal/matchmaking"
	"wherebear/backend/internal/presence"
	"wherebear/backend/internal/room"
	"wherebear/backend/pkg/protocol"
)

type Handler struct {
	upgrader     *Upgrader
	hub          *Hub
	tracker      *presence.Tracker
	roomSvc      *room.Service
	gameSvc      *game.Service
	friendSvc    *friends.Service
	matchmakeSvc *matchmaking.Service
	notifier     domain.Notifier
}

func NewHandler(
	upgrader *Upgrader,
	hub *Hub,
	tracker *presence.Tracker,
	roomSvc *room.Service,
	gameSvc *game.Service,
	friendSvc *friends.Service,
	matchmakeSvc *matchmaking.Service,
) *Handler {
	return &Handler{
		upgrader:     upgrader,
		hub:          hub,
		tracker:      tracker,
		roomSvc:      roomSvc,
		gameSvc:      gameSvc,
		friendSvc:    friendSvc,
		matchmakeSvc: matchmakeSvc,
		notifier:     hub,
	}
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	conn, authUser, err := h.upgrader.Upgrade(w, r)
	if err != nil {
		log.Printf("[Handler] Upgrade error: %v", err)
		return
	}

	safeConn := NewConnection(conn)
	h.hub.Register(safeConn, authUser.ID)

	defer func() {
		userID, roomID := h.hub.Unregister(safeConn)
		if roomID != "" && userID != "" {
			ctx := context.Background()
			_ = h.roomSvc.HandleDisconnect(ctx, roomID, userID)
			h.gameSvc.CheckAndProgressRound(roomID)
		}
		_ = safeConn.Close()
	}()

	for {
		var env protocol.Envelope
		err := conn.ReadJSON(&env)
		if err != nil {
			break
		}

		h.route(safeConn, authUser, env)
	}
}

func (h *Handler) route(c *Connection, user *AuthUser, env protocol.Envelope) {
	ctx := context.Background()

	switch env.Type {
	case protocol.EventRoomCreate:
		var p protocol.RoomCreatePayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid room create payload")
			return
		}
		config := domain.RoomConfig{
			Mode:          domain.GameMode(p.Config.Mode),
			Difficulty:    domain.Difficulty(p.Config.Difficulty),
			MaxPlayers:    p.Config.MaxPlayers,
			TotalRounds:   p.Config.TotalRounds,
			RoundDuration: p.Config.RoundDuration,
			Country:       p.Config.Country,
		}
		r, err := h.roomSvc.Create(ctx, user.ID, user.Username, user.Image, p.IsPrivate, config)
		if err != nil {
			sendError(c, err.Error())
			return
		}
		h.tracker.AssociateRoom(c, r.ID)
		// Send the initial room state back to the creator
		go h.roomSvc.BroadcastRoomState(r)

	case protocol.EventRoomJoin:
		var p protocol.RoomJoinPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid room join payload")
			return
		}
		r, err := h.roomSvc.Join(ctx, p.InviteCode, user.ID, user.Username, user.Image)
		if err != nil {
			sendError(c, err.Error())
			return
		}
		h.tracker.AssociateRoom(c, r.ID)
		// roomSvc.Join already broadcasts the new room state to every online member
		// (including the joiner), so no additional broadcast is needed here.

	case protocol.EventRoomLeave:
		roomID := h.tracker.GetRoom(c)
		if roomID == "" {
			sendError(c, "Not currently in a room")
			return
		}
		err := h.roomSvc.Leave(ctx, roomID, user.ID)
		if err != nil {
			sendError(c, err.Error())
			return
		}
		h.tracker.ClearRoom(c)

	case protocol.EventRoomUpdate:
		var p protocol.RoomUpdatePayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid room config update payload")
			return
		}
		roomID := h.tracker.GetRoom(c)
		if roomID == "" {
			sendError(c, "Not currently in a room")
			return
		}
		// Privacy toggle travels on the same event; apply it first if present.
		if p.IsPrivate != nil {
			if err := h.roomSvc.SetPrivacy(ctx, roomID, user.ID, *p.IsPrivate); err != nil {
				sendError(c, err.Error())
				return
			}
		}
		config := domain.RoomConfig{
			Mode:          domain.GameMode(p.Config.Mode),
			Difficulty:    domain.Difficulty(p.Config.Difficulty),
			MaxPlayers:    p.Config.MaxPlayers,
			TotalRounds:   p.Config.TotalRounds,
			RoundDuration: p.Config.RoundDuration,
			Country:       p.Config.Country,
		}
		err := h.roomSvc.UpdateConfig(ctx, roomID, user.ID, config)
		if err != nil {
			sendError(c, err.Error())
		}

	case protocol.EventRoomKick:
		var p protocol.RoomKickPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid room kick payload")
			return
		}
		roomID := h.tracker.GetRoom(c)
		if roomID == "" {
			sendError(c, "Not currently in a room")
			return
		}
		err := h.roomSvc.Kick(ctx, roomID, user.ID, p.TargetPlayerID)
		if err != nil {
			sendError(c, err.Error())
			return
		}
		// Disassociate all connections of kicked player from the room
		targetConns := h.tracker.GetUserConnections(p.TargetPlayerID)
		for _, connRef := range targetConns {
			h.tracker.ClearRoom(connRef)
		}

	case protocol.EventGameStartSignal:
		roomID := h.tracker.GetRoom(c)
		if roomID == "" {
			sendError(c, "Not currently in a room")
			return
		}
		err := h.gameSvc.Start(ctx, roomID, user.ID)
		if err != nil {
			sendError(c, err.Error())
		}

	case protocol.EventSubmitGuess:
		var p protocol.SubmitGuessPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid guess payload")
			return
		}
		roomID := h.tracker.GetRoom(c)
		if roomID == "" {
			sendError(c, "Not currently in a room")
			return
		}
		err := h.gameSvc.SubmitGuess(ctx, roomID, user.ID, p.Lat, p.Lng)
		if err != nil {
			sendError(c, err.Error())
		}

	case protocol.EventFriendRequestSend:
		var p protocol.FriendRequestSendPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid friend request payload")
			return
		}
		err := h.friendSvc.SendFriendRequest(ctx, user.ID, p.ReceiverEmailOrName)
		if err != nil {
			sendError(c, err.Error())
		}

	case protocol.EventFriendRequestRespond:
		var p protocol.FriendRequestRespondPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			sendError(c, "Invalid friend request respond payload")
			return
		}
		err := h.friendSvc.RespondFriendRequest(ctx, p.RequestID, user.ID, p.Action)
		if err != nil {
			sendError(c, err.Error())
		}

	case protocol.EventQuickMatch:
		var p protocol.QuickMatchPayload
		difficulty := "medium"
		if len(env.Payload) > 0 {
			if err := json.Unmarshal(env.Payload, &p); err == nil && p.Difficulty != "" {
				difficulty = p.Difficulty
			}
		}
		r, err := h.matchmakeSvc.QuickMatch(ctx, user.ID, user.Username, user.Image, difficulty)
		if err != nil {
			sendError(c, err.Error())
			return
		}
		h.tracker.AssociateRoom(c, r.ID)

		// Quick-match rooms behave exactly like hosted rooms: every player lands
		// in the lobby and waits for the host to start the match. There is no
		// auto-start. roomSvc.Join already broadcasts to existing members when a
		// second player arrives, but the room creator (the first matcher) needs
		// this initial broadcast to render their lobby.
		go h.roomSvc.BroadcastRoomState(r)

	default:
		sendError(c, "Unknown event type: "+env.Type)
	}
}

func sendError(c *Connection, errMsg string) {
	_ = c.WriteJSON(protocol.OutboundMessage{
		Type: protocol.EventError,
		Payload: protocol.ErrorPayload{
			Message: errMsg,
		},
	})
}
