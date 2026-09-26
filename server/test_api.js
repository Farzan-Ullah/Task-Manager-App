
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function runTest() {
  try {
    const token = jwt.sign(
      {
        userId: '6ab7f5522981745cd110855a', // admin
        email: 'farzanullah07@gmail.com',
        role: 'Admin',
      },
      process.env.SECRET_KEY,
      { expiresIn: "60h" }
    );
    
    console.log("Fetching tasks for week...");
    const res = await fetch('http://localhost:5001/api/todos/filter/week', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await res.json();
    console.log("Fetch res:", data);
  } catch(e) {
    console.error("Fetch failed:", e.message);
  }
}
runTest();
