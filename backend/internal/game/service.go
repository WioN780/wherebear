package game

import (
	"context"
	"log"
	"time"

	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/repository"
	"wherebear/backend/internal/room"
	"wherebear/backend/pkg/protocol"
)

// roundReviewSeconds is the duration of the post-round review phase.
const roundReviewSeconds = 15

type Service struct {
	manager         *room.Manager
	roomSvc         *room.Service
	locationRepo    repository.LocationRepository
	leaderboardRepo repository.LeaderboardRepository
	notifier        domain.Notifier
}

func NewService(
	manager *room.Manager,
	roomSvc *room.Service,
	locationRepo repository.LocationRepository,
	leaderboardRepo repository.LeaderboardRepository,
	notifier domain.Notifier,
) *Service {
	return &Service{
		manager:         manager,
		roomSvc:         roomSvc,
		locationRepo:    locationRepo,
		leaderboardRepo: leaderboardRepo,
		notifier:        notifier,
	}
}

// Start initiates location fetching and transition to the starting phase.
func (s *Service) Start(ctx context.Context, roomID, hostID string) error {
	r, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	r.Mu.Lock()
	if r.HostPlayerID != hostID {
		r.Mu.Unlock()
		return protocol.ErrNotHost
	}

	if r.State != domain.RoomStateLobby {
		r.Mu.Unlock()
		return protocol.ErrNotInLobby
	}

	r.State = domain.RoomStateStarting

	// Snapshot the config fields the background fetch needs, so the goroutine
	// never reads shared room state without holding the lock.
	totalRounds := r.Config.TotalRounds
	mode := string(r.Config.Mode)
	difficulty := string(r.Config.Difficulty)
	var countryQuery string
	if r.Config.Country != nil {
		countryQuery = *r.Config.Country
	}
	r.Mu.Unlock()

	s.roomSvc.BroadcastRoomState(r)

	// Fetch locations in the background so we don't block the WebSocket handler thread.
	go func() {
		bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		locs, err := s.locationRepo.GetRandom(bgCtx, totalRounds, mode, countryQuery, difficulty)

		r.Mu.Lock()
		if err != nil || len(locs) == 0 {
			log.Printf("[GameService] Could not fetch locations for room %s (mode=%s difficulty=%s country=%q, got %d): %v",
				r.ID, mode, difficulty, countryQuery, len(locs), err)
			// Send players back to the lobby so they are never stranded on the
			// "starting" screen, and tell them exactly why the match did not begin.
			r.State = domain.RoomStateLobby
			r.Mu.Unlock()

			s.roomSvc.BroadcastRoomState(r)
			s.broadcastToRoom(r, protocol.EventError, protocol.ErrorPayload{
				Message: "Could not start match: no map locations are available for this difficulty. Seed the database with 'npm run prisma:load-locations'.",
			})
			return
		}

		log.Printf("[GameService] Loaded %d locations for room %s; starting round 1.", len(locs), r.ID)

		r.Locations = locs
		r.CurrentRound = 1
		r.Mu.Unlock()

		// startRound handles its own locking and broadcasting.
		s.startRound(r)
	}()

	return nil
}

// SubmitGuess records a player's latitude/longitude guess, scores it, and checks round completion.
func (s *Service) SubmitGuess(ctx context.Context, roomID, userID string, lat, lng float64) error {
	r, ok := s.manager.GetRoom(roomID)
	if !ok {
		return protocol.ErrRoomNotFound
	}

	r.Mu.Lock()

	if r.State != domain.RoomStateInRound {
		r.Mu.Unlock()
		return protocol.ErrNotInRound
	}

	p := r.FindPlayer(userID)
	if p == nil {
		r.Mu.Unlock()
		return protocol.ErrPlayerNotFound
	}

	if p.HasGuessed {
		r.Mu.Unlock()
		return protocol.ErrAlreadyGuessed
	}

	if r.CurrentRound < 1 || r.CurrentRound > len(r.Locations) {
		r.Mu.Unlock()
		return protocol.ErrNotInRound
	}

	currentLoc := r.Locations[r.CurrentRound-1]
	dist := CalculateDistance(currentLoc.Lat, currentLoc.Lng, lat, lng)
	score := CalculateScore(dist)

	p.LastGuess = &domain.Guess{Lat: lat, Lng: lng}
	p.LastDistance = &dist
	p.LastScore = &score
	p.Score += score
	p.HasGuessed = true
	r.Mu.Unlock()

	// Confirm the guess to the submitting player. Done without the room lock
	// held so the network write never blocks other room operations.
	s.notifier.SendToUser(userID, protocol.EventGuessConfirm, protocol.GuessConfirmPayload{
		Score:    score,
		Distance: dist,
		Lat:      lat,
		Lng:      lng,
	})

	// Advance the round if every online player has now guessed.
	s.CheckAndProgressRound(r.ID)

	return nil
}

// CheckAndProgressRound checks if all online players have guessed, ending the round if true.
func (s *Service) CheckAndProgressRound(roomID string) {
	r, ok := s.manager.GetRoom(roomID)
	if !ok {
		return
	}

	r.Mu.Lock()
	if r.State != domain.RoomStateInRound {
		r.Mu.Unlock()
		return
	}

	allGuessed := true
	onlineCount := 0
	for _, p := range r.Players {
		if p.IsOnline {
			onlineCount++
			if !p.HasGuessed {
				allGuessed = false
			}
		}
	}

	if allGuessed && onlineCount > 0 {
		r.StopTimer()
		r.Mu.Unlock()
		s.EndRound(r)
		return
	}

	r.Mu.Unlock()
	s.roomSvc.BroadcastRoomState(r)
}

// EndRound transitions the room to the round review state and kicks off the review timer.
//
// It is idempotent: only the caller that observes the room still InRound performs the
// transition. This closes the race where a timer expiry and a final guess both reach
// EndRound concurrently — without the guard, both would advance the round and start
// duplicate review countdowns, skipping rounds.
func (s *Service) EndRound(r *domain.Room) {
	r.Mu.Lock()
	if r.State != domain.RoomStateInRound {
		// Another path already ended this round.
		r.Mu.Unlock()
		return
	}

	r.State = domain.RoomStateRoundReview
	r.Timer = roundReviewSeconds
	r.TimerStopChan = make(chan struct{})

	// Capture everything the broadcast needs while holding the lock, then release
	// before doing any network I/O. The RWMutex is not reentrant, so broadcasting
	// under the write lock would deadlock against the read lock the broadcast takes.
	round := r.CurrentRound
	timer := r.Timer
	location := r.Locations[r.CurrentRound-1]
	players := snapshotPlayers(r.Players)
	r.Mu.Unlock()

	// Reveal all guesses for the round that just ended.
	s.broadcastToRoom(r, protocol.EventRoundEnd, protocol.RoundEndPayload{
		Round:    round,
		Timer:    timer,
		Location: location,
		Players:  players,
	})

	s.roomSvc.BroadcastRoomState(r)

	go s.runReviewCountdown(r)
}

// ProgressNext advances the round count or completes the game session.
//
// It is idempotent on the RoundReview state for the same reason EndRound is.
func (s *Service) ProgressNext(r *domain.Room) {
	r.Mu.Lock()
	if r.State != domain.RoomStateRoundReview {
		r.Mu.Unlock()
		return
	}

	if r.CurrentRound >= r.Config.TotalRounds {
		// Game over.
		r.State = domain.RoomStateGameComplete
		r.Timer = 0

		// Snapshot player results for leaderboard submission before unlocking.
		type playerResult struct {
			ID    string
			Score int
		}
		var results []playerResult
		for _, p := range r.Players {
			if !domain.IsGuest(p.ID) {
				results = append(results, playerResult{ID: p.ID, Score: p.Score})
			}
		}
		r.Mu.Unlock()

		s.roomSvc.BroadcastRoomState(r)

		// Record results for authenticated users in the background.
		for _, res := range results {
			go func(uid string, score int) {
				if err := s.leaderboardRepo.SaveGameResult(context.Background(), uid, score); err != nil {
					log.Printf("[GameService] Error saving results for user %s: %v", uid, err)
				}
			}(res.ID, res.Score)
		}
		return
	}

	r.CurrentRound++
	r.Mu.Unlock()
	s.startRound(r)
}

// startRound sets up state for a new round and broadcasts it.
func (s *Service) startRound(r *domain.Room) {
	r.Mu.Lock()
	r.State = domain.RoomStateInRound
	r.Timer = r.Config.RoundDuration
	r.TimerStopChan = make(chan struct{})
	r.ResetPlayersForRound()

	// Snapshot before releasing the lock; broadcast happens lock-free.
	round := r.CurrentRound
	timer := r.Timer
	currentLocation := r.Locations[r.CurrentRound-1]
	r.Mu.Unlock()

	s.broadcastToRoom(r, protocol.EventRoundStart, protocol.RoundStartPayload{
		CurrentRound:    round,
		Timer:           timer,
		CurrentLocation: currentLocation,
	})

	s.roomSvc.BroadcastRoomState(r)

	go s.runRoundCountdown(r)
}

// broadcastToRoom delivers a single payload to every online player in the room.
// It briefly takes a read lock to snapshot recipients and must NOT be called while
// the caller already holds the room lock.
func (s *Service) broadcastToRoom(r *domain.Room, eventType string, payload interface{}) {
	r.Mu.RLock()
	recipients := make([]string, 0, len(r.Players))
	for _, p := range r.Players {
		if p.IsOnline {
			recipients = append(recipients, p.ID)
		}
	}
	r.Mu.RUnlock()

	for _, userID := range recipients {
		s.notifier.SendToUser(userID, eventType, payload)
	}
}

// snapshotPlayers returns a deep-enough copy of the player list for safe lock-free
// serialization. Player pointer fields are only ever reassigned (never mutated in
// place) under the room lock, so copying the struct value here is race-safe.
func snapshotPlayers(players []*domain.Player) []domain.Player {
	out := make([]domain.Player, len(players))
	for i, p := range players {
		out[i] = *p
	}
	return out
}
