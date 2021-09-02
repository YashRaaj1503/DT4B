const jwt = require("jsonwebtoken");

const User = require("../models/users.js");



const auth = async(req, res, next)=>{
    try{
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, "asdasdasasdasdasasdasdasasdasdasasdasdas")

        const user = await User.findOne({_id:verifyUser._id});

        next();

    }catch(error){
        res.status(401).redirect("login");
        const pass = 1;
    }
}

module.exports = auth;