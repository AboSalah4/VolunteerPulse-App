const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('It works!');
});

// We use Port 3000 because 5000 is often blocked on Mac
app.listen(3000, () => {
  console.log('!!! SUCCESS !!! Server is running on Port 3000');
  console.log('The cursor should hang here...');
});