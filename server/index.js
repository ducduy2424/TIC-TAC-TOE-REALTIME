const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*' },
    pingTimeout: 60000,
    pingInterval: 25000,
});

const PORT = process.env.PORT || 3000;

// Game constants
const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
const MAX_ROOMS = 1000;
const ROOM_CLEANUP_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Rate limiting
const rateLimit = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 50;

function checkRateLimit(socketId) {
    const now = Date.now();
    const userRequests = rateLimit.get(socketId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < RATE_LIMIT_WINDOW);

    if (validRequests.length >= MAX_REQUESTS_PER_WINDOW) {
        return false;
    }

    validRequests.push(now);
    rateLimit.set(socketId, validRequests);
    return true;
}

function checkWinner(board) {
    for (const [a, b, c] of LINES) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], line: [a, b, c] };
        }
    }
    if (board.every(Boolean)) return { winner: 'draw' };
    return null;
}

function validateRoomId(roomId) {
    return typeof roomId === 'string' && roomId.length === 6 && /^[a-zA-Z0-9]+$/.test(roomId);
}

function validateMove(index) {
    return typeof index === 'number' && index >= 0 && index <= 8;
}

// In-memory rooms store with cleanup
const rooms = new Map();
const roomTimestamps = new Map();

// Cleanup old rooms
setInterval(() => {
    const now = Date.now();
    const cutoff = now - ROOM_CLEANUP_INTERVAL;

    for (const [roomId, timestamp] of roomTimestamps.entries()) {
        if (timestamp < cutoff) {
            rooms.delete(roomId);
            roomTimestamps.delete(roomId);
            console.log(`Cleaned up old room: ${roomId}`);
        }
    }
}, ROOM_CLEANUP_INTERVAL);

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('create_room', ({ name }) => {
        try {
            if (!checkRateLimit(socket.id)) {
                return socket.emit('error_msg', 'Quá nhiều yêu cầu, vui lòng thử lại sau');
            }

            if (rooms.size >= MAX_ROOMS) {
                return socket.emit('error_msg', 'Server đầy, vui lòng thử lại sau');
            }

            const roomId = uuidv4().slice(0, 6);
            const room = {
                id: roomId,
                players: {},
                board: Array(9).fill(null),
                turn: 'X',
                status: 'waiting',
                createdAt: Date.now()
            };

            rooms.set(roomId, room);
            roomTimestamps.set(roomId, Date.now());

            socket.join(roomId);
            room.players[socket.id] = {
                id: socket.id,
                name: (name || 'Player').slice(0, 20),
                mark: 'X'
            };

            socket.emit('room_created', { roomId, mark: 'X' });
            io.to(roomId).emit('room_state', room);

            console.log(`Room created: ${roomId} by ${socket.id}`);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('error_msg', 'Lỗi tạo phòng');
        }
    });

    socket.on('join_room', ({ roomId, name }) => {
        try {
            if (!checkRateLimit(socket.id)) {
                return socket.emit('error_msg', 'Quá nhiều yêu cầu, vui lòng thử lại sau');
            }

            if (!validateRoomId(roomId)) {
                return socket.emit('error_msg', 'Room ID không hợp lệ');
            }

            const room = rooms.get(roomId);
            if (!room) {
                return socket.emit('error_msg', 'Phòng không tồn tại');
            }

            const playerCount = Object.keys(room.players).length;
            if (playerCount >= 2) {
                return socket.emit('error_msg', 'Phòng đã đầy');
            }

            socket.join(roomId);
            room.players[socket.id] = {
                id: socket.id,
                name: (name || 'Player').slice(0, 20),
                mark: 'O'
            };
            room.status = 'playing';
            roomTimestamps.set(roomId, Date.now()); // Update timestamp

            // Send room_created event to the joining player with their mark
            socket.emit('room_created', { roomId, mark: 'O' });

            io.to(roomId).emit('player_joined', { players: room.players });
            io.to(roomId).emit('start_game', { room });
            io.to(roomId).emit('room_state', room);

            console.log(`Player joined room: ${roomId} - ${socket.id}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error_msg', 'Lỗi tham gia phòng');
        }
    });

    socket.on('get_room_state', ({ roomId }) => {
        try {
            if (!validateRoomId(roomId)) {
                return socket.emit('error_msg', 'Room ID không hợp lệ');
            }

            const room = rooms.get(roomId);
            if (!room) {
                return socket.emit('error_msg', 'Phòng không tồn tại');
            }

            // Send current room state to the requesting player
            socket.emit('room_state', room);

            // Also send room_created with their mark if they don't have it
            const currentPlayer = room.players[socket.id];
            if (currentPlayer) {
                socket.emit('room_created', { roomId, mark: currentPlayer.mark });
            }
        } catch (error) {
            console.error('Error getting room state:', error);
            socket.emit('error_msg', 'Lỗi lấy thông tin phòng');
        }
    });

    socket.on('move', ({ roomId, index }) => {
        try {
            if (!checkRateLimit(socket.id)) {
                return socket.emit('error_msg', 'Quá nhiều yêu cầu, vui lòng thử lại sau');
            }

            if (!validateRoomId(roomId)) {
                return socket.emit('error_msg', 'Room ID không hợp lệ');
            }

            if (!validateMove(index)) {
                return socket.emit('error_msg', 'Nước đi không hợp lệ');
            }

            const room = rooms.get(roomId);
            if (!room) {
                return socket.emit('error_msg', 'Phòng không tồn tại');
            }

            if (room.status !== 'playing') {
                return socket.emit('error_msg', 'Game chưa bắt đầu hoặc đã kết thúc');
            }

            const player = room.players[socket.id];
            if (!player) {
                return socket.emit('error_msg', 'Bạn không trong phòng này');
            }

            if (room.board[index]) {
                return socket.emit('error_msg', 'Ô này đã được đánh');
            }

            if (player.mark !== room.turn) {
                return socket.emit('error_msg', 'Chưa đến lượt của bạn');
            }

            room.board[index] = player.mark;
            roomTimestamps.set(roomId, Date.now()); // Update timestamp

            const result = checkWinner(room.board);
            if (result) {
                room.status = 'finished';
                io.to(roomId).emit('game_over', { result, board: room.board });
                console.log(`Game finished in room ${roomId}: ${result.winner}`);
            } else {
                room.turn = room.turn === 'X' ? 'O' : 'X';
                io.to(roomId).emit('move_made', { board: room.board, turn: room.turn });
            }
        } catch (error) {
            console.error('Error making move:', error);
            socket.emit('error_msg', 'Lỗi thực hiện nước đi');
        }
    });

    socket.on('leave_room', ({ roomId }) => {
        try {
            if (!validateRoomId(roomId)) {
                return socket.emit('error_msg', 'Room ID không hợp lệ');
            }

            const room = rooms.get(roomId);
            if (!room) return;

            delete room.players[socket.id];
            socket.leave(roomId);
            io.to(roomId).emit('room_state', room);

            if (Object.keys(room.players).length === 0) {
                rooms.delete(roomId);
                roomTimestamps.delete(roomId);
                console.log(`Room deleted: ${roomId}`);
            }
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);

        // Remove from all rooms
        for (const [roomId, room] of rooms.entries()) {
            if (room.players[socket.id]) {
                delete room.players[socket.id];
                io.to(roomId).emit('room_state', room);

                if (Object.keys(room.players).length === 0) {
                    rooms.delete(roomId);
                    roomTimestamps.delete(roomId);
                    console.log(`Room deleted after disconnect: ${roomId}`);
                }
            }
        }

        // Clean up rate limit
        rateLimit.delete(socket.id);
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({
        status: 'running',
        rooms: rooms.size,
        connections: io.engine.clientsCount,
        uptime: process.uptime()
    });
});

// Stats endpoint
app.get('/stats', (req, res) => {
    const activeRooms = Array.from(rooms.values()).filter(room =>
        Object.keys(room.players).length > 0
    );

    res.json({
        totalRooms: rooms.size,
        activeRooms: activeRooms.length,
        totalConnections: io.engine.clientsCount,
        waitingRooms: activeRooms.filter(room => room.status === 'waiting').length,
        playingRooms: activeRooms.filter(room => room.status === 'playing').length,
        finishedRooms: activeRooms.filter(room => room.status === 'finished').length
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/`);
    console.log(`📈 Stats: http://localhost:${PORT}/stats`);
});