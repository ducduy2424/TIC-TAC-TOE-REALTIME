# 🎮 Tic-Tac-Toe Realtime Multiplayer

Một game Tic-Tac-Toe multiplayer realtime được xây dựng với React, Socket.IO và Node.js.

## ✨ Tính năng

- 🎯 Game Tic-Tac-Toe multiplayer realtime
- 🏠 Tạo và tham gia phòng chơi
- 🔄 Kết nối realtime với Socket.IO
- 📱 Responsive design
- ⚡ Performance tối ưu
- 🛡️ Rate limiting và validation
- 📊 Monitoring và health check

## 🚀 Cài đặt và chạy

### Yêu cầu
- Node.js >= 16
- npm hoặc yarn

### Bước 1: Clone repository
```bash
git clone https://github.com/ducduy2424/TIC-TAC-TOE-REALTIME.git
cd tic-tac-toe-realtime
```

### Bước 2: Cài đặt dependencies

**Server:**
```bash
cd server
npm install
```

**Client:**
```bash
cd client
npm install
```

### Bước 3: Chạy ứng dụng

**Server (Terminal 1):**
```bash
cd server
npm start
```

**Client (Terminal 2):**
```bash
cd client
npm run dev
```

### Bước 4: Truy cập
- Client: http://localhost:5173
- Server Health Check: http://localhost:3000
- Server Stats: http://localhost:3000/stats

## 🏗️ Cấu trúc dự án

```
tic-tac-toe-realtime/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── app.jsx
│   │   │   └── TicTacToeMultiplayer.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── server/                 # Node.js backend
│   ├── index.js
│   └── package.json
└── README.md
```

## 🔧 Tối ưu hóa đã thực hiện

### Client-side Optimizations:
- ✅ Socket connection management với reconnection
- ✅ Error handling và loading states
- ✅ Input validation
- ✅ Responsive design
- ✅ Performance optimization với useCallback
- ✅ Better UX với visual feedback

### Server-side Optimizations:
- ✅ Rate limiting (50 requests/minute)
- ✅ Input validation
- ✅ Error handling
- ✅ Room cleanup (30 phút)
- ✅ Memory management
- ✅ Health check endpoints
- ✅ Logging system

### Build Optimizations:
- ✅ Code splitting
- ✅ Minification
- ✅ Bundle optimization
- ✅ Dependency optimization

## 📊 API Endpoints

### Health Check
```
GET / - Server status
```

### Statistics
```
GET /stats - Game statistics
```

## 🎮 Cách chơi

1. **Tạo phòng**: Click "Tạo phòng" để tạo phòng mới
2. **Tham gia phòng**: Nhập Room ID và click "Tham gia"
3. **Chơi game**: Click vào ô trống để đánh X hoặc O
4. **Kết quả**: Game kết thúc khi có người thắng hoặc hòa

## 🛠️ Environment Variables

### Client (.env)
```env
VITE_SERVER_URL=http://localhost:3000
```

### Server (.env)
```env
PORT=3000
```

## 🔍 Monitoring

### Health Check
```bash
curl http://localhost:3000/
```

### Statistics
```bash
curl http://localhost:3000/stats
```

## 🚀 Production Deployment

### Client
```bash
cd client
npm run build
```

### Server
```bash
cd server
npm start
```

## 📈 Performance Metrics

- **Bundle Size**: ~200KB (gzipped)
- **Time to Interactive**: < 2s
- **Socket Reconnection**: Automatic
- **Memory Usage**: Optimized với cleanup

## 🐛 Troubleshooting

### Lỗi kết nối
- Kiểm tra server có đang chạy không
- Kiểm tra firewall settings
- Kiểm tra VITE_SERVER_URL trong .env

### Lỗi game
- Refresh trang nếu game bị lag
- Kiểm tra kết nối internet
- Đảm bảo chỉ có 2 người chơi trong 1 phòng

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License


MIT License - xem file LICENSE để biết thêm chi tiết. 
