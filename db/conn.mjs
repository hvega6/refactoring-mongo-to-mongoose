import mongoose from "mongoose";
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.ATLAS_URI) {
  throw new Error("ATLAS_URI environment variable is not defined");
}

// Connect to MongoDB using Mongoose
mongoose.connect(process.env.ATLAS_URI, {
  // No deprecated options
})
.then(() => {
  console.log("Connected to MongoDB using Mongoose");
})
.catch((error) => {
  console.error("MongoDB connection error:", error);
  process.exit(1); // Exit the application if the connection fails
});

// Export the Mongoose connection
export default mongoose;