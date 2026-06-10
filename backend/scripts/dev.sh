#!/bin/bash
# Development runner for WhereBear Go Backend
set -e

echo "Starting WhereBear backend development server..."
go run cmd/server/main.go
