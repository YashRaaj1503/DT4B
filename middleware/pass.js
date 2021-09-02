const jwt = require("jsonwebtoken");

const User = require("../models/users.js");



const pass = async(req, res, next)=>{
    try{
        const token = req.cookies.jwt;
        const verifyUser = jwt.verify(token, "asdasdasasdasdasasdasdasasdasdasasdasdas")

        const user = await User.findOne({_id:verifyUser._id});

        res.status(401).redirect("home");

    }catch(error){
        const pass = 1;
    }
}

module.exports = pass;