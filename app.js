//jshint //jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy; //notice that this a strategy
const findOrCreate = require('mongoose-findorcreate'); //used since findorcreate didnt exist in the documentation in passport
const FacebookStrategy = require('passport-facebook').Strategy; //new facebook strategy

//Just a message to let you know that strategies are a group of authentication methods

const app = express();

app.use(express.static("public")); //this makes it so we can see local CSS and other assets
app.set('view engine', 'ejs'); //used for the views ejs folder to be seen
app.use(bodyParser.urlencoded({extended: true})); //like always this is used to get bodyParser to work like wanted

app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
})); //Makes a new session

app.use(passport.initialize());
app.use(passport.session());
//Now what this does is it creates the cookie

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true, useUnifiedTopology: true });
mongoose.set("useCreateIndex", true);

//how the data gets stored in the database.
const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

//In the documentation it was important that you add theses a schema plugins
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

//Is responsible to setup passport-local with the correct options
passport.use(User.createStrategy());


//what this does is it makes a cookie with the only thing save being the userId
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

//now this is what takes the saved cookie goes inside and takes out the needed data
passport.deserializeUser(function(id, done) {
  //the id argument here is the user.id in the serializeUser method
  User.findById(id, function(err, user) {
    //method called internally by strategy implementation
    done(err, user);
  });
});

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

//the passport object uses a authetication method or strategy in this case a google strategy
passport.use(new GoogleStrategy({
    //now what it does here is it tells the required setup to access the google api
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {

    //Now it will look in the database to see if it finds a user with that username, if not then it will create an user
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      //notice that the fucntion has four arguments and CB is one, I would look that up if I were you
      //but for now I think that it is just a custome callback from passport
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/facebook", passport.authenticate('facebook'));

app.get("/auth/facebook/secrets",
  passport.authenticate('facebook', {failureRedirect: "/login"}),
  function(req,res){
    res.redirect("/secrets");
  }
);

//This is what brings up the google authetication page thing, like with the VT sign-in thing
app.get("/auth/google",
    passport.authenticate('google', { scope: ["profile"] }));

//Now when the person autheticates with google they get sent here
//This is due to the settings on the Google Developer Console
app.get("/auth/google/secrets",
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect to secrets.
    res.redirect("/secrets");
  });

app.get("/login", function(req, res){
  res.render("login");
});

app.get("/register", function(req, res){
  res.render("register");
});

//Checks if the request that made this was autheticated
//meaning that it would check the cookie to see if it was autheticated
app.get("/secrets", function(req, res){
  User.find({secret: {$ne: null}}, function(err,foundUsers){
    if(err){
      console.log(err);
    }else{
      res.render('secrets', {usersWithSecrets: foundUsers});
    }
  })
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render('submit')
  }else{
    res.redirect('/login');
  }
});

app.post("/submit", function(req,res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err,foundUser){
    if(err){
      console.log(err);
    }else{
      foundUser.secret = submittedSecret;
      foundUser.save();
      res.redirect('/secrets')
    }
  });
});

//Breaks the cookie so they cannot go back to the secrets page
app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

//Makes new users
app.post("/register", function(req, res){

  //This is custom function from passport, it will create the object and put it in the DB
  //it will authenticate the user if the registration was successful
  User.register({username: req.body.username}, req.body.password, function(err, user){
    //if there was an error refreshes the page
    if (err) {
      console.log(err);
      res.redirect("/register");
    } else {
      //authenticate with a local made cookie and then redirects to secrets
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

app.post("/login", function(req, res){

  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  //This is another function from passport that will check if the user
  //is in the database as a registered user already
  req.login(user, function(err){
    if (err) {
      console.log(err);
    } else {
      //Now if there were a user it will create a new cookie and then send them to the secrets page
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      });
    }
  });

});

//Creates the server listening on port 3000
app.listen(3000, function() {
  console.log("Server started on port 3000.");
});
