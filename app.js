const http = require('http');
var path = require('path');
const express = require('express');

/* Create Express app */
const app = express();

/* Set static directory */
app.use(express.static(__dirname + '/vendor/'));
app.use(express.static(__dirname + '/assets/'));
app.use(express.static(__dirname + '/views/'));
app.use(express.static(__dirname + '/js/'));
app.use(express.static(__dirname + '/css'))

app.get('', (req, res) => {
    res.sendFile(path.join(__dirname + '/index.html'));
});
const server = http.createServer(app);

/* Run server */
const hostname = '127.0.0.1';
const port = 3000;
server.listen(port, hostname, () => {
    console.log(`[INFO] Server running at http://${hostname}:${port}`);
});