// Package config provides environment-based configuration following 12-factor principles.
// Dependencies: NONE (standard library only).
package config

import (
	"bufio"
	"log"
	"os"
	"path/filepath"
	"strings"
)

// Config holds all server configuration values.
type Config struct {
	DatabaseURL string
	WSPort      string
	CORSOrigin  string
}

// Load reads configuration from environment variables, falling back to a .env file.
func Load() *Config {
	loadEnvFile()

	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/wherebear?schema=public"),
		WSPort:      getEnv("WS_PORT", "8080"),
		CORSOrigin:  getEnv("CORS_ORIGIN", "http://localhost:3000"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func loadEnvFile() {
	paths := []string{".env", "../.env"}
	for _, p := range paths {
		absPath, err := filepath.Abs(p)
		if err != nil {
			continue
		}
		file, err := os.Open(absPath)
		if err != nil {
			continue
		}
		defer file.Close()

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}
			key := strings.TrimSpace(parts[0])
			val := strings.TrimSpace(parts[1])
			if strings.HasPrefix(val, `"`) && strings.HasSuffix(val, `"`) {
				val = val[1 : len(val)-1]
			}
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
		log.Printf("Loaded environment from %s", absPath)
		break
	}
}
