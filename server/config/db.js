const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Database Connected!!");
  })
  .catch((error) => {
    console.log("Error connecting to database", error);
  });
