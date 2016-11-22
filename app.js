var net = require("net");
var redis = require('redis');

var client = redis.createClient();

var server = net.createServer(function(connection){
    console.log("connected");

}).listen(3000, function(){ console.log("Server is running at 3000") });