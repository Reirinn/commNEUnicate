const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

// Load models for face-api.js
const loadModels = async () => {
  console.log("Loading models...");
  // This would ideally load the models from the 'public/models' directory
  // You may replace this with actual model loading code later if necessary
};

// Serve static files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Handle a simple route for testing
app.get('/', (req, res) => {
  res.send('Hello, Express Server!');
});

// Start server and load models
app.listen(port, async () => {
  await loadModels();
  console.log(`Server is running at http://localhost:${port}`);
});
