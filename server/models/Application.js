const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Matches your User model name
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task', // Matches your Task model name
    required: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected', 'Completed'],
    default: 'Pending'
  },
  appliedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Application', applicationSchema);