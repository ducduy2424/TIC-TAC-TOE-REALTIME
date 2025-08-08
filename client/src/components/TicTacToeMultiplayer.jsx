import React, { useEffect, useState, useCallback } from "react";
import { io } from "socket.io-client";

export default function TicTacToeMultiplayer() {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [myMark, setMyMark] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));
  const [turn, setTurn] = useState("X");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showVictory, setShowVictory] = useState(false);
  const [victoryMessage, setVictoryMessage] = useState("");

  // Initialize socket connection
  useEffect(() => {
    const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";
    const newSocket = io(SOCKET_URL, {
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on("connect", () => {
      setIsConnected(true);
      setError("");
      console.log("Connected to server");
    });

    newSocket.on("disconnect", () => {
      setIsConnected(false);
      setError("Mất kết nối server");
    });

    newSocket.on("connect_error", (error) => {
      setError(`Lỗi kết nối: ${error.message}`);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleRoomCreated = ({ roomId, mark }) => {
      setRoomId(roomId);
      setMyMark(mark);
      setStatus("Đã tạo phòng");
      setIsLoading(false);
      console.log('Room created with mark:', mark);
    };

    const handleRoomState = (room) => {
      setBoard(room.board);
      setTurn(room.turn);
      setStatus(room.status);
      
      // Update myMark if not set yet
      if (!myMark) {
        const currentPlayer = room.players[socket.id];
        if (currentPlayer) {
          setMyMark(currentPlayer.mark);
          console.log('Updated myMark from room_state:', currentPlayer.mark);
        }
      }
    };

    const handleStartGame = ({ room }) => {
      setBoard(room.board);
      setTurn(room.turn);
      setStatus("Game bắt đầu");
      setIsLoading(false);
      
      // Find current player's mark in the room
      const currentPlayer = room.players[socket.id];
      if (currentPlayer) {
        setMyMark(currentPlayer.mark);
        console.log('Updated myMark from start_game:', currentPlayer.mark);
      }
    };

    const handlePlayerJoined = ({ players }) => {
      // Update myMark when another player joins
      const currentPlayer = players[socket.id];
      if (currentPlayer) {
        setMyMark(currentPlayer.mark);
        console.log('Updated myMark from player_joined:', currentPlayer.mark);
      }
    };

    const handleMoveMade = ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
      setStatus("Tiếp tục chơi");
    };

    const handleGameOver = ({ result }) => {
      if (result.winner === "draw") {
        setStatus("Hoà");
        setVictoryMessage("🎉 Trận đấu hòa!");
      } else {
        setStatus(`${result.winner} thắng`);
        setVictoryMessage(`🏆 ${result.winner} đã chiến thắng!`);
      }
      setShowVictory(true);
      setTimeout(() => setShowVictory(false), 3000);
    };

    const handleError = (message) => {
      setError(message);
      setIsLoading(false);
      setTimeout(() => setError(""), 3000);
    };

    socket.on("room_created", handleRoomCreated);
    socket.on("room_state", handleRoomState);
    socket.on("start_game", handleStartGame);
    socket.on("player_joined", handlePlayerJoined);
    socket.on("move_made", handleMoveMade);
    socket.on("game_over", handleGameOver);
    socket.on("error_msg", handleError);

    return () => {
      socket.off("room_created", handleRoomCreated);
      socket.off("room_state", handleRoomState);
      socket.off("start_game", handleStartGame);
      socket.off("player_joined", handlePlayerJoined);
      socket.off("move_made", handleMoveMade);
      socket.off("game_over", handleGameOver);
      socket.off("error_msg", handleError);
    };
  }, [socket]);

  // Ensure mark is set when game starts
  useEffect(() => {
    if (status === "Game bắt đầu" && !myMark && socket) {
      // Request current room state to get mark
      if (roomId) {
        console.log('Requesting room state to get mark...');
        socket.emit('get_room_state', { roomId });
      }
    }
  }, [status, myMark, socket, roomId]);

  const createRoom = useCallback(() => {
    if (!socket || !isConnected) {
      setError("Chưa kết nối server");
      return;
    }
    setIsLoading(true);
    setError("");
    socket.emit("create_room", { name: "Player" });
  }, [socket, isConnected]);

  const joinRoom = useCallback(() => {
    if (!socket || !isConnected) {
      setError("Chưa kết nối server");
      return;
    }
    if (!roomId.trim()) {
      setError("Nhập Room ID");
      return;
    }
    setIsLoading(true);
    setError("");
    socket.emit("join_room", { roomId: roomId.trim(), name: "Player" });
  }, [socket, isConnected, roomId]);

  const makeMove = useCallback((index) => {
    if (!socket || !isConnected) {
      setError("Chưa kết nối server");
      return;
    }
    if (!roomId) {
      setError("Vào phòng hoặc tạo phòng trước");
      return;
    }
    if (!myMark) {
      setError("Chưa được gán mark, vui lòng thử lại");
      return;
    }
    if (myMark !== turn) {
      setError("Chưa đến lượt của bạn");
      return;
    }
    if (board[index]) {
      setError("Ô này đã được đánh");
      return;
    }
    
    console.log('Making move:', { index, myMark, turn, roomId });
    socket.emit("move", { roomId, index });
  }, [socket, isConnected, roomId, myMark, turn, board]);

  const resetLocal = useCallback(() => {
    setBoard(Array(9).fill(null));
    setStatus("");
    setMyMark(null);
    setRoomId("");
    setError("");
    setShowVictory(false);
  }, []);

  const canMakeMove = (index) => {
    const canMove = isConnected && roomId && myMark === turn && !board[index] && !status.includes("thắng") && !status.includes("Hoà");
    
    // Debug logging
    if (process.env.NODE_ENV === 'development') {
      console.log('canMakeMove debug:', {
        isConnected,
        roomId,
        myMark,
        turn,
        boardIndex: board[index],
        status,
        canMove
      });
    }
    
    return canMove;
  };

  const isGameActive = () => {
    return status === "Game bắt đầu" || status === "Tiếp tục chơi";
  };

  // Create floating particles
  useEffect(() => {
    const createParticle = () => {
      const particle = document.createElement('div');
      particle.className = 'particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 6 + 's';
      particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
      document.body.appendChild(particle);
      
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 6000);
    };

    const interval = setInterval(createParticle, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card fade-in max-w-md w-full text-center">
          <div className="loading mb-4"></div>
          <h2 className="title mb-4">Đang kết nối...</h2>
          {error && <div className="error-message">{error}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="card fade-in max-w-lg w-full relative">
        {/* Victory Overlay */}
        {showVictory && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-20 flex items-center justify-center z-10">
            <div className="bg-white/10 backdrop-blur-md p-8 rounded-20 text-center">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-2">{victoryMessage}</h3>
              <button 
                onClick={() => setShowVictory(false)}
                className="btn btn-primary mt-4"
              >
                Đóng
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="title">🎮 Tic-Tac-Toe Realtime</h1>
          <p className="subtitle">Chơi game cùng bạn bè trực tuyến</p>
        </div>

        {/* Connection Status */}
        <div className="flex justify-center mb-6">
          <div className={`status-indicator ${isConnected ? 'status-connected' : 'status-disconnected'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-white' : 'bg-red-300'}`}></div>
            {isConnected ? 'Đã kết nối' : 'Mất kết nối'}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-message slide-in">
            {error}
          </div>
        )}

        {/* Room Controls */}
        <div className="room-controls">
          <button 
            onClick={createRoom} 
            disabled={isLoading}
            className="btn btn-success hover-lift focus-ring"
          >
            {isLoading ? (
              <>
                <div className="loading"></div>
                Đang tạo...
              </>
            ) : (
              <>
                <span>🏠</span>
                Tạo phòng
              </>
            )}
          </button>
          
          <input
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Nhập Room ID"
            disabled={isLoading}
            className="input room-input focus-ring"
          />
          
          <button 
            onClick={joinRoom} 
            disabled={isLoading || !roomId.trim()}
            className="btn btn-primary hover-lift focus-ring"
          >
            {isLoading ? (
              <>
                <div className="loading"></div>
                Đang tham gia...
              </>
            ) : (
              <>
                <span>🚪</span>
                Tham gia
              </>
            )}
          </button>
          
          <button 
            onClick={resetLocal} 
            className="btn btn-danger hover-lift focus-ring"
          >
            <span>🔄</span>
            Reset
          </button>
        </div>

        {/* Game Info */}
        <div className="game-info">
          <div className="info-item hover-lift">
            <div className="info-label">Bạn</div>
            <div className="info-value">{myMark || "-"}</div>
          </div>
          <div className="info-item hover-lift">
            <div className="info-label">Trạng thái</div>
            <div className="info-value">{status || "Chưa bắt đầu"}</div>
          </div>
          <div className="info-item hover-lift">
            <div className="info-label">Lượt</div>
            <div className="info-value">{turn}</div>
          </div>
        </div>

        {/* Debug Info (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-black/20 rounded-lg text-xs">
            <div className="font-bold mb-2">Debug Info:</div>
            <div>Connected: {isConnected ? 'Yes' : 'No'}</div>
            <div>Room ID: {roomId || 'None'}</div>
            <div>My Mark: {myMark || 'None'}</div>
            <div>Current Turn: {turn}</div>
            <div>Status: {status}</div>
            <div>Can Make Move: {myMark === turn ? 'Yes' : 'No'}</div>
          </div>
        )}

        {/* Turn Indicator */}
        {isGameActive() && (
          <div className="text-center mb-4">
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
              turn === 'X' ? 'bg-blue-500/20 text-blue-300' : 'bg-pink-500/20 text-pink-300'
            }`}>
              <span className="text-lg font-bold">{turn}</span>
              <span className="text-sm">đang chơi</span>
            </div>
          </div>
        )}

        {/* Game Board */}
        <div className="game-board bounce-in">
          {board.map((cell, index) => (
            <button
              key={index}
              onClick={() => makeMove(index)}
              disabled={!canMakeMove(index)}
              className={`board-cell focus-ring ${cell ? (cell === 'X' ? 'x' : 'o') : ''}`}
            >
              {cell}
            </button>
          ))}
        </div>

        {/* Game Instructions */}
        <div className="mt-6 text-center">
          <p className="text-sm text-white/70">
            💡 <strong>Hướng dẫn:</strong> Tạo phòng và chia sẻ Room ID với bạn chơi
          </p>
          {roomId && (
            <div className="mt-2 p-3 bg-white/10 rounded-lg">
              <p className="text-xs text-white/60 mb-1">Room ID:</p>
              <p className="font-mono font-bold text-white">{roomId}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
