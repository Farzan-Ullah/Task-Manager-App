const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(400).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = header.split(" ")[1];
  if (!token) {
    return res.status(400).json({
      success: false,
      message: "Invalid token format",
    });
  }

  try {
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.log(error);
    res.status(401).json({
      errorMessage: "Invalid token!",
      isTokenExpires: true,
    });
  }
};

const decodeJwtToken = (authHeader) => {
  try {
    if (!authHeader) return;
    const decode = jwt.verify(authHeader, process.env.SECRET_KEY);
    const userId = decode.userId || null;
    return userId;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { verifyToken, decodeJwtToken };
