package middleware

import (
	"log"
	"net/http"
	"time"
)

// Logging outputs basic request metrics such as URL, method, client remote address, and duration.
func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		log.Printf("[HTTP] Started: %s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
		next.ServeHTTP(w, r)
		log.Printf("[HTTP] Completed: %s %s in %v", r.Method, r.URL.Path, time.Since(start))
	})
}
