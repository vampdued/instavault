package agent

import (
	"context"
	"errors"
	"net"
	"sync"

	"instavault-server/pkg/adapters/nativehost"
	"instavault-server/pkg/events"
	"instavault-server/pkg/queue"
	"instavault-server/pkg/storage"
)

type Server struct {
	listener  net.Listener
	repo      *storage.Repository
	queue     *queue.QueueManager
	events    *events.EventBus
	closeOnce sync.Once
	clients   sync.WaitGroup
	mu        sync.Mutex
	closed    bool
	active    map[net.Conn]struct{}
}

func NewServer(listener net.Listener, repo *storage.Repository, queueManager *queue.QueueManager, eventBus *events.EventBus) *Server {
	return &Server{
		listener: listener,
		repo:     repo,
		queue:    queueManager,
		events:   eventBus,
		active:   make(map[net.Conn]struct{}),
	}
}

func (server *Server) Serve(ctx context.Context) error {
	go func() {
		<-ctx.Done()
		_ = server.Close()
	}()

	for {
		connection, err := server.listener.Accept()
		if err != nil {
			if ctx.Err() != nil || errors.Is(err, net.ErrClosed) {
				return nil
			}
			return err
		}
		server.mu.Lock()
		if server.closed {
			server.mu.Unlock()
			_ = connection.Close()
			continue
		}
		server.active[connection] = struct{}{}
		server.clients.Add(1)
		server.mu.Unlock()
		go func() {
			defer func() {
				_ = connection.Close()
				server.mu.Lock()
				delete(server.active, connection)
				server.mu.Unlock()
				server.clients.Done()
			}()
			host := nativehost.New(server.repo, server.queue, server.events, connection, connection)
			_ = host.ListenAndServe()
		}()
	}
}

func (server *Server) Close() error {
	var err error
	server.closeOnce.Do(func() {
		server.mu.Lock()
		server.closed = true
		for connection := range server.active {
			_ = connection.Close()
		}
		server.mu.Unlock()
		err = server.listener.Close()
	})
	server.clients.Wait()
	return err
}
