const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req,res)=>{

    try{

        const { username, email, password, role = "buyer" } = req.body;

        if (!username?.trim() || !email?.trim() || !password) {

            return res.status(400).json({
                message:"All fields required"
            });
        }

        if (!/^\S+@\S+\.\S+$/.test(email.trim()) || password.length < 8 || !["buyer", "seller"].includes(role)) {
            return res.status(400).json({
                message: "Use a valid email, a password of at least 8 characters, and a buyer or seller account"
            });
        }

        const hashedPassword =
        await bcrypt.hash(password,10);

        const sql = `
        INSERT INTO users
        (username,email,password,role)
        VALUES(?,?,?,?)
        `;

        db.query(
            sql,
            [
                username.trim(),
                email.trim().toLowerCase(),
                hashedPassword,
                role || "buyer"
            ],
            (err,result)=>{

                if(err){

                    return res.status(500).json({
                        message: err.code === "ER_DUP_ENTRY" ? "An account with that email already exists" : "Registration failed"
                    });
                }

                return res.status(201).json({
                    message:"User registered"
                });

            }
        );

    }

    catch(error){

        console.log(error);

        return res.status(500).json({
            message:"Server error"
        });

    }

};


const login = (req,res)=>{

    const { email, username, password } = req.body;
    const identifier = (email || username || "").trim();

    if (!identifier || !password) {

        return res.status(400).json({
            message:"Email or username and password required"
        });
    }

    const sql =
    "SELECT * FROM users WHERE email=? OR username=? LIMIT 1";

    db.query(
        sql,
        [identifier.toLowerCase(), identifier],
        async (err,results)=>{

            if(err){

                return res.status(500).json({
                    message:"Server error"
                });
            }

            if(results.length===0){

                return res.status(401).json({
                    message:"Invalid credentials"
                });
            }

            const user = results[0];

            let match;
            try {
                match = await bcrypt.compare(password, user.password);
            } catch (error) {
                return res.status(500).json({ message: "Server error" });
            }

            if(!match){

                return res.status(401).json({
                    message:"Invalid credentials"
                });
            }

            const token = jwt.sign(
                {
                    id:user.id,
                    role:user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn:"1d"
                }
            );

            return res.json({
                message:"Login successful",
                token,
                role:user.role
            });

        }
    );

};

module.exports = {
    register,
    login
};