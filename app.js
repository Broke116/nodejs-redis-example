var http = require("http");
var async = require("async");
var path = require("path");
var net = require("net");
var redis = require('redis');
var jade = require('jade');
var fs = require('fs');

var layout = require('fs').readFileSync(__dirname + '/views/index.jade', 'utf8');
var fn = jade.compile(layout, {filename: __dirname + '/views/index.jade'});

var client = redis.createClient();

client.select(5);

function makeCallbackFunc(member) {
    return function(callback) {
        client.hgetall(member, function(err, obj) {
        callback(err,obj);
    });
    };
}

http.createServer(function(req, res){
    // get scores from sorted arr. between 0-5
    client.zrevrange("Game", 0,4, function(err, result){
        var scores;
        if (err) {
            console.log(err);
            res.end('Top scores not available.');
            return;
        }

        var callbacks = new Array(); // for async series
        for (var i = 0; i < result.length; i++) {
            callbacks.push(makeCallbackFunc(result[i]));
        }

        async.series(
            callbacks,
            function (err, result) {
                if (err) {
                    console.log(err);
                    res.end('Scores not available');
                    return;
                }

                var str = fn({scores : result});
                res.end(str);
        });
    });
}).listen(3000, function(){ console.log("listening on port 3000") });

var server = net.createServer(function(connection){
    console.log("connected");

    var client = redis.createClient();

    client.on('error', function(err){
        console.log('Error ' + err);
    });

    client.select(5); // fifth db is game score

    connection.on('data', function(data){
        console.log(data + ' from ' + connection.remoteAddress + ' ' + connection.remotePort);

        try {
            var obj = JSON.parse(data);

            // information stored in hash set
            client.hset(obj.member, "firstName", obj.firstName, redis.print);
            client.hset(obj.member, "lastName", obj.lastName, redis.print);
            client.hset(obj.member, "score", obj.score, redis.print);
            client.hset(obj.member, "date", obj.date, redis.print);

            //memberId and score stored in sorted set. lowest to highest (zrange) / high to low (zrevrange)
            client.zadd("Game", parseInt(obj.score), obj.member);
        } catch (err) {
            console.log(err);
        }
    });

    connection.on('close', function(){
        console.log('client closed connection');
        client.quit();
    });

}).listen(8124, function(){ console.log("listening on port 8124") });