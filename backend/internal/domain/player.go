package domain

// Player represents a participant inside a multiplayer room.
// JSON tags are present because Player is included in wire-format payloads.
type Player struct {
	ID           string   `json:"id"`
	Username     string   `json:"username"`
	Image        *string  `json:"image"`
	IsOnline     bool     `json:"isOnline"`
	IsHost       bool     `json:"isHost"`
	IsReady      bool     `json:"isReady"`
	Score        int      `json:"score"`
	LastGuess    *Guess   `json:"lastGuess"`
	LastDistance *float64 `json:"lastDistance"`
	LastScore    *int     `json:"lastScore"`
	HasGuessed   bool     `json:"hasGuessed"`
}

// ResetForNewRound clears per-round transient state.
func (p *Player) ResetForNewRound() {
	p.LastGuess = nil
	p.LastDistance = nil
	p.LastScore = nil
	p.HasGuessed = false
}
