const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  socketId: { type: String, required: true },
  name: { type: String, required: true },
  joinedAt: { type: Date, default: Date.now },
  leftAt: { type: Date, default: null },
  connections: [{
    withUser: String,
    withName: String,
    connectedAt: { type: Date, default: Date.now },
    disconnectedAt: { type: Date, default: null },
  }],
});

module.exports = mongoose.model('Session', sessionSchema);
