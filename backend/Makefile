.PHONY: run build test tidy fmt clean

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

test:
	go test -v ./...

tidy:
	go mod tidy

fmt:
	go fmt ./...

clean:
	rm -rf bin/
