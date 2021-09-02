var mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

var UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    date: {
        type: String,
        required: true
    },
    tokens:[{
        token:{
            type: String,
            required: true
        }
    }]
});

UserSchema.methods.generateAuthToken = async function(){
    try{
        const token = jwt.sign({_id:this._id.toString()}, "asdasdasasdasdasasdasdasasdasdasasdasdas");
        this.tokens = this.tokens.concat({token:token})
        await this.save();
        return token;
    }catch (error) {
        console.log(error);
    }
} 

var User = new mongoose.model('User', UserSchema);
module.exports = User;