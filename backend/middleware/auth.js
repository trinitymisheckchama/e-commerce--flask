const jwt = require("jsonwebtoken");
const db = require("../config/db");

const auth = (req,res,next)=>{

    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : authorization;

    if(!token){

        return res.status(401).json({
            message:"No token provided"
        });
    }

    try{

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        db.query(
            "SELECT id, role, status FROM users WHERE id = ? LIMIT 1",
            [decoded.id],
            (error, users) => {
                if (error) return res.status(500).json({ message: "Could not verify account" });
                if (!users.length || users[0].status !== "active") {
                    return res.status(403).json({ message: "This account is disabled" });
                }
                req.user = { id: users[0].id, role: users[0].role };
                next();
            }
        );

    }

    catch(error){

        return res.status(401).json({
            message:"Invalid token"
        });
    }

};

module.exports = auth;