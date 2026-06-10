package game

import (
	"time"

	"wherebear/backend/internal/domain"
	"wherebear/backend/pkg/protocol"
)

func (s *Service) runRoundCountdown(r *domain.Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	r.Mu.Lock()
	stopChan := r.TimerStopChan
	r.Mu.Unlock()

	if stopChan == nil {
		return
	}

	for {
		select {
		case <-ticker.C:
			r.Mu.Lock()
			// Bail if the timer stop channel has been replaced or closed.
			if r.TimerStopChan != stopChan {
				r.Mu.Unlock()
				return
			}

			r.Timer--
			timerVal := r.Timer

			if timerVal <= 0 {
				r.StopTimer()
				r.Mu.Unlock()
				s.EndRound(r)
				return
			}
			r.Mu.Unlock()

			// Broadcast timer tick to all online players in the room.
			s.broadcastToRoom(r, protocol.EventTimerUpdate, protocol.TimerUpdatePayload{Timer: timerVal})

		case <-stopChan:
			return
		}
	}
}

func (s *Service) runReviewCountdown(r *domain.Room) {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	r.Mu.Lock()
	stopChan := r.TimerStopChan
	r.Mu.Unlock()

	if stopChan == nil {
		return
	}

	for {
		select {
		case <-ticker.C:
			r.Mu.Lock()
			// Bail if the timer stop channel has been replaced or closed.
			if r.TimerStopChan != stopChan {
				r.Mu.Unlock()
				return
			}

			r.Timer--
			timerVal := r.Timer

			if timerVal <= 0 {
				r.StopTimer()
				r.Mu.Unlock()
				s.ProgressNext(r)
				return
			}
			r.Mu.Unlock()

			// Broadcast timer tick to all online players in the room.
			s.broadcastToRoom(r, protocol.EventTimerUpdate, protocol.TimerUpdatePayload{Timer: timerVal})

		case <-stopChan:
			return
		}
	}
}
