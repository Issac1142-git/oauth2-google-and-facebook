require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
var bodyParser = require('body-parser')
var GoogleStrategy = require('passport-google-oauth20').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;
var session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose');
var findOrCreate = require('mongoose-findorcreate')
const fs = require('fs');
const https = require('https');
const  path  = require('path');


const app = express();



mongoose.connect('mongodb://localhost:27017/oauth');

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String
})
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);

app.use(express.static('public'))
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())

app.use(session({
    secret: 'keyboard cat',
    resave: false,
    saveUninitialized: false,
  }))

app.use(passport.initialize());
app.use(passport.session());

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function (err, user) {
      done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "https://localhost:3000/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
      // console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APPID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "https://localhost:3000/auth/facebook/secrets",
    profileFields: ['id', 'displayName', 'photos', 'email']
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home")
})

app.get("/login", function(req, res){
    res.render("login")
})

app.post("/login", function(req, res){
let email = req.body.username;
let password = req.body.password;

User.findOne({email: email}, function(err, user){
    if(user){
        if(password == user.password){
            res.redirect("/secrets");
        }
    }else{
        console.log(err);
    }
})
})

app.get("/register", function(req, res){
    res.render("register")
})

app.post('/register', function(req, res){
// passport.authenticate("google", )
})

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

  app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

  app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/secrets", function(req, res){
    res.render("secrets")
})
app.get("/logout", function(req, res){
    req.logOut();
    res.redirect('/');
})
const sslserver = https.createServer({
  key:fs.readFileSync(path.join(__dirname, 'cert', 'key.pem')),
  cert:fs.readFileSync(path.join(__dirname, 'cert', 'cert.pem'))
}, app);

sslserver.listen(3000, () => {
    console.log("Server running on port 3000");
});