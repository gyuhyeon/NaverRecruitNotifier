var express = require('express');
var request = require('request');
var config = require('../../config')
var router = express.Router();
var twilio = require('twilio');

var mysql = require('mysql');
var connection = mysql.createConnection(config.mysqlConfig);

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { title: '네이버 채용 알리미' });
});

router.post('/enlist', function(req, res, next) {
    if(req.body.g-recaptcha-response === undefined || req.body.g-recaptcha-response === '' || req.body.g-recaptcha-response === null) {
        return res.json({"response" : "Please complete recaptcha."});
    }
    var regex = /^\d{3}-\d{4}-\d{4}$/;
    if(!req.body.phonenumber.match(regex)){
        return res.json({"response" : "Please input a correct phone number. (000-0000-0000)"});
    }
    request.post({url:"https://www.google.com/recaptcha/api/siteverify", form:{"secret" : config.captchasecret, "response" : req.body.g-recaptcha-response}}, function(error, response, body){
        body = JSON.parse(body);
        // Success will be true or false depending upon captcha validation.
        if(body.success !== undefined && !body.success) {
            return res.json({"response" : "Recaptcha validation failed, please try again."})
        }
        //everything OK, now we add the phone number to the DB.
        connection.query('INSERT INTO `NotifyList`(phonenumber) VALUES("'+req.body.phonenumber+'");', function(error, cursor){
            if(error==null){
                var twclient = new twilio(config.twaccountSid, config.twaccountToken);
                twclient.messages.create({
                    body: "Welcome to Naver job opening notification service!",
                    to: '+82'+req.body.phonenumber,
                    from: '+12568184331'
                })
                .then((message) => console.log(message.sid));
                return res.json({"response" : "Success! Please wait for confirmation SMS."});
            }
            else{
                return res.json({"response" : "We're sorry, but either our DB is not working, or you're already subscribed!"});
            }
        }); //end of insert connection.query

    }); //end of request.post (sorry for callback hell!)
}) //end of router post handling

module.exports = router;