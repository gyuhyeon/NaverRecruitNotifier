var express = require('express');
var request = require('request');
var http = require('http');
var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var mysql = require('mysql');

var iconv = require('iconv-lite');
var cheerio = require('cheerio');
var twilio = require('twilio');
//config is not in git repository for security
var config = require('../config');

var index = require('./routes/index');

var app = express();


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(bodyParser.json());
//querystring : false, qs library : true
app.use(bodyParser.urlencoded({ extended: false}));
app.use(cookieParser());
//public folder is used for "public" asset requests...
app.use(express.static(path.join(__dirname, 'public')));

//website routing
app.use('/', index);

//requests(can be done in routes)
//app.use('/submitpref', submitpref);

//BELOW IS CRAWLING FEATURE IMPLEMENTATION & setInterval LOOP

/*
var mysqlConfig = {
	'host' : 'hostaddress',
	'user' : 'username', 'password' : 'password', 'database' : 'databasename',
}
*/
var connection = mysql.createConnection(config.mysqlConfig);

function checkUpdate(){
    
    connection.query('SELECT * FROM `NaverJobs`', function(error, cursor){
        var prevjoblist = [];
        if(error==null){
            for(var i=0; i<cursor.length; i++){
                prevjoblist.push(cursor[i].jobTitle);
            }
        }
        else{
            console.log(error);
            return; //end the query and its future processing to prevent spamming when db is inaccessible
        }
        
        var PAGE_ENCODING = 'utf-8'; // change to match page encoding
        
        function parse(url, position_type, prevjoblist) {
            /* uh... the website is javascript rendered.. *sigh* basically, we have to use post requests instead
            (function(prevjoblist){
                request({
                    url: url,
                    encoding: null  // do not interpret content yet
                }, function (error, response, body) {
                    var joblist = [];
                    var $ = cheerio.load(iconv.decode(body, PAGE_ENCODING));
                    
                    
                    $('.card_list > ul > li > a > span > strong').each(function(){
                        if(prevjoblist.indexOf($(this).text()) == -1){ //indexOf returns -1 if not found in list
                            joblist.push(position_type + $(this).text());
                            connection.query('INSERT INTO `NaverJobs`(jobTitle) VALUES ("' + $(this).text() + '");');
                        }
                    });
                    
                    if(joblist.length>0){
                        sendNotification(position_type.slice(0,2)+" 공고가 업데이트 되었습니다.");
                    }
                });//end of request
            })(prevjoblist);//IIFE to pass prevjoblist from query to a request callback to check for prev states
            //BTW, IIFE is actually not needed for accessing global scopes in this manner...
            */
            request.post({url:url}, function(error, response, body){
                var jsondata = JSON.parse(body);
                var joblist = [];
                for(var i=0; i<jsondata.length; ++i){
                    if(prevjoblist.indexOf(jsondata[i].jobNm)==-1){
                        joblist.push(position_type + jsondata[i].jobNm);
                        connection.query('INSERT INTO `NaverJobs`(jobTitle) VALUES ("' + jsondata[i].jobNm + '");');
                    }
                }
                if(joblist.length>0){
                    sendNotification(position_type.slice(0,2)+" 공고가 업데이트 되었습니다.");
                }
            });
        }//end of parse function definition
        
        //full-time positions
        parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=001&searchTxt=&startNum=0&endNum=50', "신입_", prevjoblist);
        //internship positions
        parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=004&searchTxt=&startNum=0&endNum=50', "인턴_", prevjoblist);
        //transfer positions(testing purposes)
        parse('https://recruit.navercorp.com/naver/job/listJson?classNm=developer&entTypeCd=002&searchTxt=&startNum=0&endNum=50', "경력_", prevjoblist);
        
    });
    
}

function sendNotification(msg = '채용 공고가 업데이트 되었습니다.'){
    //twilio setup
    var twclient = new twilio(config.twaccountSid, config.twaccountToken);
    //send message
    twclient.messages.create({
        body: msg,
        to: '+821072481535',
        from: '+12568184331'
    })
    .then((message) => console.log(message.sid));
}

//test once when server starts running
//twilio setup
var twclient = new twilio(config.twaccountSid, config.twaccountToken);
//send message
twclient.messages.create({
    body: "Twilio operational :)",
    to: '+821072481535',
    from: '+12568184331'
})
.then((message) => console.log(message.sid));


setInterval(checkUpdate, 60000);


//BELOW IS BASIC SERVER LISTENING CONFIG & AUTOGENERATED DEBUG TEMPLATE

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/**
* Get port from environment and store in Express.
*/

//var port = normalizePort(process.env.PORT || '3000');
var port = 8000;
app.set('port', port);

/**
* Create HTTP server.
*/

var server = http.createServer(app);

/**
* Listen on provided port, on all network interfaces.
*/

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
* Normalize a port into a number, string, or false.
*/

function normalizePort(val) {
    var port = parseInt(val, 10);
    
    if (isNaN(port)) {
        // named pipe
        return val;
    }
    
    if (port >= 0) {
        // port number
        return port;
    }
    
    return false;
}

/**
* Event listener for HTTP server "error" event.
*/

function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    
    var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;
    
    // handle specific listen errors with friendly messages
    switch (error.code) {
        case 'EACCES':
        console.error(bind + ' requires elevated privileges');
        process.exit(1);
        break;
        case 'EADDRINUSE':
        console.error(bind + ' is already in use');
        process.exit(1);
        break;
        default:
        throw error;
    }
}

/**
* Event listener for HTTP server "listening" event.
*/

function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
    console.log('Listening on ' + bind);
}