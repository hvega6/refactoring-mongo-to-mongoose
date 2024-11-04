import mongoose from "mongoose";

// Mongoose model definition
const gradeSchema = new mongoose.Schema({
  learner_id: Number,
  class_id: Number,
  scores: [
    {
      type: { type: String, enum: ['exam', 'homework', 'quiz'] },
      score: Number,
    },
  ],
});

// Create the model
const Grade = mongoose.model("Grade", gradeSchema);

// Export the model
export default Grade; 