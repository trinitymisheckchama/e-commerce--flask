const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const result =dotenv.config();
const authRoutes = require("./routes/auth");


require("./config/db");

const app = express();

app.use(express.json());
app.use(cors());

app.use("/api/auth",authRoutes);

const auth = require("./middleware/auth");
const roleCheck = require("./middleware/roleCheck");


app.get(
"/buyer-dashboard",
auth,
roleCheck("buyer"),
(req,res)=>{

    res.json({
        message:"Welcome Buyer"
    });

});


app.get(
"/seller-dashboard",
auth,
roleCheck("seller"),
(req,res)=>{

    res.json({
        message:"Welcome Seller"
    });

});


app.get(
"/admin-dashboard",
auth,
roleCheck("admin"),
(req,res)=>{

    res.json({
        message:"Welcome Admin"
    });

});

app.get("/", (req,res)=>{
    res.send("E-commerce API running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
    console.log(`Server running on port ${PORT}`);
    console.log(`API endpoint: http://localhost:${PORT}/`);
});