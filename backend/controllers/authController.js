const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const register = async (req,res)=>{

    try{

        const {username,email,password,role} = req.body;

        if(!username || !email || !password){

            return res.status(400).json({
                message:"All fields required"
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
                username,
                email,
                hashedPassword,
                role || "buyer"
            ],
            (err,result)=>{

                if(err){

                    console.log(err);

                    return res.status(500).json({
                        message:"Registration failed"
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

    const {email,password} = req.body;

    if(!email || !password){

        return res.status(400).json({
            message:"Email and password required"
        });
    }

    const sql =
    "SELECT * FROM users WHERE email=?";

    db.query(
        sql,
        [email],
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

            const match =
            await bcrypt.compare(
                password,
                user.password
            );

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