const jwt = require("jsonwebtoken");

const getSecret = () =>
  process.env.SECRET_KEY || "default_pro_manage_fallback_secret_key_2026";

const verifyToken = (req, res, next) => {
  const header = req.headers["authorization"];
  if (!header) {
    return res.status(401).json({
      success: false,
      message: "No token provided",
    });
  }

  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : header.split(" ")[1] || header;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Invalid token format",
    });
  }

  try {
    const decodedToken = jwt.verify(token, getSecret());
    req.user = decodedToken;
    next();
  } catch (error) {
    res.status(401).json({
      errorMessage: "Invalid token!",
      isTokenExpires: true,
    });
  }
};

const decodeJwtToken = (authHeader) => {
  try {
    if (!authHeader) return;
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : authHeader.split(" ")[1] || authHeader;
    const decode = jwt.verify(token, getSecret());
    const userId = decode.userId || decode._id || null;
    return userId;
  } catch (error) {
    console.log(error);
  }
};

module.exports = { verifyToken, decodeJwtToken };
