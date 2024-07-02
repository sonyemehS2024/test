const express = require('express');
const app = express();
const port = 3000;

const http = require("http");
const path = require("path");
const flash = require('express-flash');

const mysql = require('mysql2')
const session = require('express-session');
const passport = require('passport');
const auth = require('passport-local-authenticate');
const socketio = require("socket.io")(http);

const server = app.listen(port, () => {
    console.log(`Connected at http://localhost:${port}`);
});

const io = socketio.listen(server);

// This is important so that express can parse JSON requests
app.use(express.json());

let connect = mysql.createConnection({
    host: "localhost",
    user: "sample",
    database: "new_schema",
    password: "sampleuser"
});

// Connects to database
connect.connect(function (err) {
    if (err) throw err;
    console.log("Connected to Database!");
});

app.use(express.static('../backend'));
app.use(express.static('../frontend'));
app.use(express.urlencoded({ extended: true }));
app.use(flash())

// The session
app.use(session({
    secret: 'RanDomAtXTshYhjuiUHJkjh',
    resave: false,
    saveUninitialized: false,
}));

// Initiallizes passport with the session
app.use(passport.initialize());
app.use(passport.session());

// Variable to keep track of current user
let currentUser = "";

// Hash object for storing hashed passwords
class Hash {
    constructor(hash, salt) {
        this.hash = hash;
        this.salt = salt;
    }
}

/**
 * This is the default login page
 */
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        res.redirect('/home');
    }
    else {
        res.sendFile(path.join(__dirname, '..', 'frontend', 'login.html'));
    }
})

/**
 * This facilitates logging in a user
 */
app.post('/login', (req, res) => {

    let reqUser = req.body.username;
    let reqPassword = req.body.password;

    let msg = "";

    // If the user is blank, sends an error message
    if (reqUser == "") {
        msg = "User can't be blank!";
        req.flash('message', msg);
        res.redirect('/error');
        return;
    }

    // Queries the database for users
    let selectQuery = `SELECT username, password, salt FROM users where username=?`;

    connect.execute(selectQuery, [reqUser], function (err, result) {
        if (err) throw err;
        // If a result exists
        if (result[0] !== undefined) {

            // Creating a new hash based on what was stored in the database
            let hashed = new Hash(result[0].password, result[0].salt);

            // Verifies it against what the user provided
            auth.verify(reqPassword, hashed, function (err, verified) {

                // When it's verified
                if (verified) {
                    currentUser = result[0].username;

                    req.login(currentUser, function (err) {

                        res.redirect('/home');
                    })

                    // Logs in with passport.js
                    passport.serializeUser(function (user, done) {
                        done(null, user);
                    });

                    passport.deserializeUser(function (user, done) {
                        done(null, user);
                    });

                    return;
                }

                // Otherwise send an error message
                else {
                    msg = "Username and Password are not a match";
                    req.flash('message', msg);
                    res.redirect('/error');
                    return;
                }
            })
        }

        // Else send an appropriate error message
        else {
            msg = "User does not exist";
            req.flash('message', msg);
            res.redirect('/error');
            return;
        }
    });

    connect.unprepare(selectQuery);
})

/**
 * This facilitates registering a user
 */
app.post('/register', (req, res) => {

    let reqUser = req.body.username;
    let reqPassword = req.body.password;

    const regex = /^[\w_]+$/;

    let msg = "";

    // If the username is blank then deliver an appropriate error message
    if (reqUser == "") {
        msg = "User can't be blank!";
        req.flash('message', msg);
        res.redirect('/error');
        return;
    }

    // If the username contains a character that isn't alphanumeric or underscore, then 
    // the username is not valid
    if (reqUser.match(regex) == null) {
        msg = "Username can only contain alphanumeric characters or underscores";
        req.flash('message', msg);
        res.redirect('/error');
        return;
    }

    // Querying the database to see if the username already exists
    let selectQuery = `SELECT username, password FROM users where username=?`;

    connect.execute(selectQuery, [reqUser], function (err, result) {
        if (err) throw err;
        // If the user exists in the database then send an appropriate error message
        if (result[0] !== undefined) {
            msg = "User already exists";
            req.flash('message', msg);
            res.redirect('/error');
            connect.unprepare(selectQuery);
            return;
        }

        // Else then insert the user into the database
        else {
            auth.hash(reqPassword, function (err, hashed) {

                let insertQuery = `INSERT INTO users (username, password, salt) VALUES (?, ?, ?)`;
                connect.execute(insertQuery, [reqUser, hashed.hash, hashed.salt], function (err) {
                    if (err) throw err;
                });

                connect.unprepare(insertQuery);
            });

            currentUser = reqUser;

            req.login(currentUser, function (err) {
                res.redirect('/home');
            });

            // Logs in with passport.js
            passport.serializeUser(function (user, done) {
                done(null, user);
            });

            passport.deserializeUser(function (user, done) {
                done(null, user);
            });
        }
    });

    connect.unprepare(selectQuery);
})

/**
 * This facilitates authorization
 */
app.post('/auth', (req, res) => {

    if (req.isAuthenticated()) {
        res.json({ message: "success", currentUser: req.user })
    }

    else {
        res.json({ message: "Authorization failed" })
    }
})

/**
 * This is the home page
 */
app.get('/home', (req, res) => {
    io.sockets.removeAllListeners("connection");
    // This gets used when a user is logged in either as a result of getting registered or a normal log in
    io.sockets.on("connection", function (socket) {

        // When someone makes a post to the server, it should be added to the database
        socket.removeAllListeners("post_to_server");
        socket.on("post_to_server", function (data) {

            // Inserting post into the database
            let insertQuery = `INSERT INTO posts (post, user) VALUES (?, ?)`;

            connect.execute(insertQuery, [data.post, data.currentUser], function (err) {
                if (err) throw err;

                // Querying  the database get all the posts
                let selectQuery = `SELECT post, user, DATE_FORMAT(timestamp, '%m.%d.%Y %h:%i%p') FROM posts`;

                connect.execute(selectQuery, function (err, result) {
                    if (err) throw err;
                    socketio.emit("get_posts_to_client", { posts: result });
                });

                connect.unprepare(selectQuery);
            });

            connect.unprepare(insertQuery);
        })

        socket.removeAllListeners("get_posts_to_server");
        // Queries the database for posts
        socket.on("get_posts_to_server", function (data) {

            // Querying  the database for posts
            let selectQuery = `SELECT post, user, DATE_FORMAT(timestamp, '%m.%d.%Y %h:%i%p') FROM posts`;

            connect.execute(selectQuery, function (err, result) {
                if (err) throw err;
                socketio.emit("get_posts_to_client", { posts: result });
            });

            connect.unprepare(selectQuery);
        })

        socket.on("disconnect", function () {
            console.log("disconnected");
        })
    })

    res.sendFile(path.join(__dirname, '..', 'frontend', 'home.html'));
})

/**
 * This facilitates logging out
 */
app.post('/logout', (req, res) => {
    req.logout(req.user, function (err) {
        res.redirect('/');
    })
})

/**
 * This is the home page for error messages
 */
app.get('/error', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'error.html'))
})

/**
 * This facilitates sending error messages
 */
app.post('/error', (req, res) => {

    let msg = req.flash('message');

    if (msg !== "") {
        res.json({ message: msg });
    }
})