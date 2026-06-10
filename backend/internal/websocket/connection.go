package websocket

import (
	"sync"

	"github.com/gorilla/websocket"
)

type Connection struct {
	mu   sync.Mutex
	conn *websocket.Conn
}

func NewConnection(conn *websocket.Conn) *Connection {
	return &Connection{
		conn: conn,
	}
}

// WriteJSON sends a message down the websocket. Exclusive write lock prevents concurrent writes.
func (c *Connection) WriteJSON(v interface{}) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.WriteJSON(v)
}

// Close closes the underlying websocket connection.
func (c *Connection) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.conn.Close()
}
