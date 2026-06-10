package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	_ "github.com/lib/pq"

	"wherebear/backend/internal/auth"
	"wherebear/backend/internal/config"
	"wherebear/backend/internal/domain"
	"wherebear/backend/internal/friends"
	"wherebear/backend/internal/game"
	"wherebear/backend/internal/matchmaking"
	"wherebear/backend/internal/middleware"
	"wherebear/backend/internal/presence"
	"wherebear/backend/internal/repository"
	"wherebear/backend/internal/room"
	"wherebear/backend/internal/websocket"
)

// notifierProxy solves the bootstrapping circular dependency between
// Broadcaster (which needs Notifier) and Hub (which implements Notifier but needs Broadcaster).
type notifierProxy struct {
	delegate domain.Notifier
}

func (p *notifierProxy) SendToUser(userID string, eventType string, payload interface{}) {
	if p.delegate != nil {
		p.delegate.SendToUser(userID, eventType, payload)
	}
}

func main() {
	log.Println("Initializing WhereBear backend service...")

	// 1. Load configuration
	cfg := config.Load()

	// 2. Initialize database connection
	db, err := sql.Open("postgres", cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to open database connection: %v", err)
	}

	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err = db.Ping(); err != nil {
		log.Fatalf("Database connection validation failed: %v", err)
	}
	log.Println("Connected to database successfully.")

	// 3. Construct repositories
	locRepo := repository.NewLocationRepository(db)
	userRepo := repository.NewUserRepository(db)
	friendRepo := repository.NewFriendRepository(db)
	leaderboardRepo := repository.NewLeaderboardRepository(db)

	// 4. Construct verifier, manager, and tracker
	verifier := auth.NewSessionVerifier(db)
	roomMgr := room.NewManager()
	presenceTracker := presence.NewTracker()

	// 5. Construct presence broadcaster & Hub (using proxy to break initialization cycle)
	proxy := &notifierProxy{}
	broadcaster := presence.NewBroadcaster(presenceTracker, friendRepo, userRepo, proxy)
	hub := websocket.NewHub(presenceTracker, broadcaster)
	proxy.delegate = hub // Link delegate back to the initialized Hub

	// 6. Construct business services
	roomSvc := room.NewService(roomMgr, hub)
	gameSvc := game.NewService(roomMgr, roomSvc, locRepo, leaderboardRepo, hub)
	friendSvc := friends.NewService(friendRepo, userRepo, presenceTracker, broadcaster, hub)
	matchmakeSvc := matchmaking.NewService(roomMgr, roomSvc)

	// 7. Construct WebSocket upgrader and handler
	upgrader := websocket.NewUpgrader(verifier, cfg.CORSOrigin)
	wsHandler := websocket.NewHandler(upgrader, hub, presenceTracker, roomSvc, gameSvc, friendSvc, matchmakeSvc)

	// 8. Setup HTTP routing and middleware chain
	mux := http.NewServeMux()
	mux.Handle("/api/ws", middleware.Logging(middleware.CORS(cfg.CORSOrigin)(wsHandler)))
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("OK"))
	})

	// 9. Start HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.WSPort,
		Handler:      mux,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
	}

	go func() {
		log.Printf("HTTP/WebSocket server listening on port %s", cfg.WSPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("ListenAndServe failed: %v", err)
		}
	}()

	// 10. Listen for interrupt signals for graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	<-stop
	log.Println("Shutdown signal received. stopping services...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Graceful shutdown failed: %v", err)
	}

	log.Println("Closing database connections...")
	_ = db.Close()

	log.Println("Server stopped successfully.")
}
