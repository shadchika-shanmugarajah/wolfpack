const mongoose = require('mongoose');

const WorkoutFolderSchema = new mongoose.Schema({
  folderName: {
    type: String,
    required: true,
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('WorkoutFolder', WorkoutFolderSchema);
