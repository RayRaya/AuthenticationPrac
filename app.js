//jshint esversion:6
require('dotenv').config(); //needed for enviroment variables
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

//console.log(process.env.APIKEY);//access the enviroment variable

const app = express();

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true});

//now in order for the encryption to work you will need to make userSchema
//A proper new schema for mongoose instead of just new mongoose.Schema
//now it is an object from the mongoose.Schema class
const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});
const User = mongoose.model("User", userSchema);




app.use(express.static("public")); //Remember that this is important for linking css and other stuffs
app.use(bodyParser.urlencoded({extended: true})); //needed for body parser to work
app.set('view engine', 'ejs'); //needd for ejs to be read correctly



app.listen(3000, function(){
  console.log("Server is up and running!");
});


app.get('/', function(req, res){
  res.render('home');
});

app.get('/login', function(req, res){
  res.render('login');
});

app.get('/register', function(req, res){
  res.render('register');
});

app.get('/logout', function(req,res){
  res.redirect('/');
});

app.post('/login', function(req,res){
  const username = {
    email: req.body.username,
    password: req.body.password
  };
  User.findOne({email: username.email}, function(err,foundUser){
    if(!err){
      if(username.password === foundUser.password){
        res.render('secrets');
      }else{
        res.send('Invalid Credentials');
      }
    }else{
      console.log(err);
    }
  });
});


app.post('/register', function(req,res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if(err){
      console.log(err)
    }else{
      res.render('secrets');
    }
  });
});
