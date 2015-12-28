// server.js
console.log("Starting App");
console.log("IP: " + process.env.IP);
console.log("Port: " + process.env.PORT);
console.log("Dir: " + __dirname);
// set up ======================================================================
// get all the tools we need
var express  = require('express');
var app      = express();
var port     = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash 	 = require('connect-flash');
var fs = require('fs');
var http = require('http');
var configDB = require('./config/database.js');
var sio = require('socket.io');
// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

app.configure(function() {

	// set up our express application
	app.use(express.logger('dev')); // log every request to the console
	app.use(express.cookieParser()); // read cookies (needed for auth)
	app.use(express.bodyParser()); // get information from html forms

	app.set('view engine', 'ejs'); // set up ejs for templating

	// required for passport
	app.use(express.session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
	app.use(passport.initialize());
	app.use(passport.session()); // persistent login sessions
	app.use(flash()); // use connect-flash for flash messages stored in session

});

// routes ======================================================================
require('./app/routes.js')(app, passport); // load our routes and pass in our app and fully configured passport

// launch ======================================================================
var server = http.createServer(app);
var io = sio.listen(server);
server.listen(port);
//app.listen(port);
//console.log('The magic happens on port ' + process.env.PORT);
console.log("app listening");

//**** the socket.io stuffs ****//
var channels = {};
var messages = [];
var sockets = [];

// sometimes it helps!
// io.set('transports', ['xhr-polling']);

io.sockets.on('connection', function (socket) {
    var initiatorChannel = '';
    if (!io.isConnected) {
        io.isConnected = true;
    }
    
    sockets.push(socket);
    
    socket.on('new-channel', function (data) {
        if (!channels[data.channel]) {
            initiatorChannel = data.channel;
        }

        channels[data.channel] = data.channel;
        onNewNamespace(data.channel, data.sender);
    });

socket.on('message',function (msg){
    
});

    socket.on('presence', function (channel) {
        var isChannelPresent = !! channels[channel];
        socket.emit('presence', isChannelPresent);
    });

    socket.on('disconnect', function (channel) {
        if (initiatorChannel) {
            delete channels[initiatorChannel];
        }
        sockets.splice(sockets.indexOf(socket),1);
        //updateRoster();
    });
});

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
};

function onNewNamespace(channel, sender) {
    io.of('/' + channel).on('connection', function (socket) {
        if (io.isConnected) {
            io.isConnected = false;
            socket.emit('connect', true);
        }

        socket.on('message', function (data) {
            if (data.sender == sender)
                socket.broadcast.emit('message', data.data);
        });
    });
}
