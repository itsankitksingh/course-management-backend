const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Connect to MongoDB with error handling
mongoose.connect('mongodb+srv://itsankitksingh:Ankit123@cluster0.1gx3s0y.mongodb.net/course-management', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('MongoDB connection error:', error));

// Handle MongoDB connection errors
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

// Course Schema
const courseSchema = new mongoose.Schema({
  courseId: { type: Number, required: true, unique: true },
  likes: { type: Number, default: 0 }
}, { timestamps: true });

const CourseLikes = mongoose.model('CourseLikes', courseSchema);

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('Client connected');

  // Listen for like updates
  socket.on('like-update', async (courseId) => {
    try {
      const course = await CourseLikes.findOneAndUpdate(
        { courseId },
        { $inc: { likes: 1 } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      
      // Broadcast the update to all connected clients
      io.emit('likes-changed', { 
        courseId, 
        likes: course.likes,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error updating likes:', error);
      socket.emit('error', { 
        message: 'Error updating likes',
        courseId 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// API endpoint to get all likes
app.get('/api/likes', async (req, res) => {
  try {
    const likes = await CourseLikes.find();
    res.json(likes);
  } catch (error) {
    console.error('Error fetching likes:', error);
    res.status(500).json({ error: 'Error fetching likes' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 