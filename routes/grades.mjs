import express from "express";
import { ObjectId } from "mongodb";
import Grade from "../models/Grade.mjs"; // Import the Grade model

const router = express.Router();

// Function to validate ObjectId
const isValidObjectId = (id) => {
  return ObjectId.isValid(id) && (String(new ObjectId(id)) === id);
};

// Create a single grade entry
router.post("/", async (req, res) => {
  let newDocument = req.body;

  // rename fields for backwards compatibility
  if (newDocument.student_id) {
    newDocument.learner_id = newDocument.student_id;
    delete newDocument.student_id;
  }

  let result = await Grade.create(newDocument);
  res.status(201).send(result);
});

// GET route for statistics with weighted average above 50%
router.get("/stats", async (req, res) => {
  const pipeline = [
    {
      '$unwind': {
        'path': '$scores'
      }
    }, {
      '$group': {
        '_id': '$learner_id', 
        'quiz': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'quiz'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }, 
        'exam': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'exam'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }, 
        'homework': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'homework'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }
      }
    }, {
      '$project': {
        '_id': 0, 
        'learner_id': '$_id', 
        'avg': {
          '$sum': [
            {
              '$multiply': [
                {
                  '$avg': '$exam'
                }, 0.65
              ]
            }, {
              '$multiply': [
                {
                  '$avg': '$quiz'
                }, 0.25
              ]
            }, {
              '$multiply': [
                {
                  '$avg': '$homework'
                }, 0.10
              ]
            }
          ]
        }
      }
    }, 
    {
      $group: {
        _id: null,
        totalLearners: { $sum: 1 },
        learnersAbove50: {
          $sum: {
            $cond: [{ $gt: ["$avg", 50] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalLearners: 1,
        learnersAbove50: 1,
        percentageAbove50: {
          $multiply: [
            { $divide: ["$learnersAbove50", "$totalLearners"] },
            100
          ]
        }
      }
    }
  ];

  try {
    const result = await Grade.aggregate(pipeline);

    // If no results, return default values
    if (result.length === 0) {
      return res.status(200).send({ totalLearners: 0, learnersAbove50: 0, percentageAbove50: 0 });
    }

    res.status(200).send(result[0]);
  } catch (error) {
    res.status(500).send("Error calculating statistics");
  }
});

// GET route for statistics by class_id
router.get("/stats/:id", async (req, res) => {
  console.log("Received request for /stats/:id with ID:", req.params.id);
  const classId = Number(req.params.id);

  const pipeline = [
    {
      $match: { class_id: classId }
    },
    {
      '$unwind': {
        'path': '$scores'
      }
    }, {
      '$group': {
        '_id': '$learner_id', 
        'quiz': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'quiz'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }, 
        'exam': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'exam'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }, 
        'homework': {
          '$push': {
            '$cond': [
              {
                '$eq': [
                  '$scores.type', 'homework'
                ]
              }, '$scores.score', '$$REMOVE'
            ]
          }
        }
      }
    }, {
      '$project': {
        '_id': 0, 
        'learner_id': '$_id', 
        'avg': {
          '$sum': [
            {
              '$multiply': [
                {
                  '$avg': '$exam'
                }, 0.65
              ]
            }, {
              '$multiply': [
                {
                  '$avg': '$quiz'
                }, 0.25
              ]
            }, {
              '$multiply': [
                {
                  '$avg': '$homework'
                }, 0.10
              ]
            }
          ]
        }
      }
    }, 
    {
      $group: {
        _id: null,
        totalLearners: { $sum: 1 },
        learnersAbove50: {
          $sum: {
            $cond: [{ $gt: ["$avg", 50] }, 1, 0]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        totalLearners: 1,
        learnersAbove50: 1,
        percentageAbove50: {
          $multiply: [
            { $divide: ["$learnersAbove50", "$totalLearners"] },
            100
          ]
        }
      }
    }
  ];

  try {
    const result = await Grade.aggregate(pipeline);
    res.status(200).send(result[0] || { totalLearners: 0, learnersAbove50: 0, percentageAbove50: 0 });
  } catch (error) {
    res.status(500).send("Error calculating statistics");
  }
});

// Get a single grade entry
router.get("/:id", async (req, res) => {
  console.log("Received ID:", req.params.id);

  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }

  let query = { _id: new ObjectId(req.params.id) };
  console.log("Query:", query);
  let result = await Grade.findById(query);

  if (!result) {
    return res.status(404).send("Not found");
  } else {
    return res.status(200).send(result);
  }
});

// Add a score to a grade entry
router.patch("/:id/add", async (req, res) => {
  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }

  let query = { _id: new ObjectId(req.params.id) };
  let result = await Grade.updateOne(query, {
    $push: { scores: req.body },
  });

  if (result.modifiedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Remove a score from a grade entry
router.patch("/:id/remove", async (req, res) => {
  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }

  let query = { _id: new ObjectId(req.params.id) };
  let result = await Grade.updateOne(query, {
    $pull: { scores: req.body },
  });

  if (result.modifiedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Delete a single grade entry
router.delete("/:id", async (req, res) => {
  // Validate ObjectId
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).send("Invalid ID format");
  }

  let query = { _id: new ObjectId(req.params.id) };
  let result = await Grade.deleteOne(query);

  if (result.deletedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Get route for backwards compatibility
router.get("/student/:id", async (req, res) => {
  res.redirect(`learner/${req.params.id}`);
});

// Get a learner's grade data
router.get("/learner/:id", async (req, res) => {
  let query = { learner_id: Number(req.params.id) };

  // Check for class_id parameter
  if (req.query.class) query.class_id = Number(req.query.class);

  let result = await Grade.find(query);

  if (!result || result.length === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Delete a learner's grade data
router.delete("/learner/:id", async (req, res) => {
  let query = { learner_id: Number(req.params.id) };

  let result = await Grade.deleteOne(query);

  if (result.deletedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Get a class's grade data
router.get("/class/:id", async (req, res) => {
  let query = { class_id: Number(req.params.id) };

  // Check for learner_id parameter
  if (req.query.learner) query.learner_id = Number(req.query.learner);

  let result = await Grade.find(query);

  if (!result || result.length === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Update a class id
router.patch("/class/:id", async (req, res) => {
  let query = { class_id: Number(req.params.id) };

  let result = await Grade.updateMany(query, {
    $set: { class_id: req.body.class_id },
  });

  if (result.modifiedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Delete a class
router.delete("/class/:id", async (req, res) => {
  let query = { class_id: Number(req.params.id) };

  let result = await Grade.deleteMany(query);

  if (result.deletedCount === 0) res.status(404).send("Not found");
  else res.status(200).send(result);
});

// Get the weighted average grade for a class
router.get("/class/:id/average", async (req, res) => {
  let classId = Number(req.params.id); // Log the class ID being queried
  console.log("Querying average for class ID:", classId);
  
  let query = { class_id: classId };

  let results = await Grade.find(query);
  console.log("Results found:", results); // Log the results

  if (!results || results.length === 0) {
    return res.status(404).send("Not found");
  }

  let totalWeightedScore = 0;
  let totalStudents = 0; // Track the number of students

  results.forEach(entry => {
    const examWeight = 0.65;
    const homeworkWeight = 0.10;
    const quizWeight = 0.25; // Remaining weight for quizzes

    // Initialize scores
    let examScore = 0;
    let homeworkScore = 0;
    let quizScore = 0;

    // Calculate scores only if they are valid numbers
    entry.scores.forEach(score => {
      if (typeof score.score === 'number') {
        if (score.type === 'exam') {
          examScore += score.score;
        } else if (score.type === 'homework') {
          homeworkScore += score.score;
        } else if (score.type === 'quiz') {
          quizScore += score.score;
        }
      }
    });

    // Calculate the weighted score only if there are scores
    if (examScore > 0 || homeworkScore > 0 || quizScore > 0) {
      let weightedScore = (examScore * examWeight) + (homeworkScore * homeworkWeight) + (quizScore * quizWeight);
      totalWeightedScore += weightedScore;
      totalStudents++; // Increment only if the student has scores
    }
  });

  // Check if there are any students with scores to avoid division by zero
  if (totalStudents === 0) {
    return res.status(404).send("No valid scores found");
  }

  let classAverage = totalWeightedScore / totalStudents; // Calculate class average

  res.status(200).send({ classAverage });
});

export default router;