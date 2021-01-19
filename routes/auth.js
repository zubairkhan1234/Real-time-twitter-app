var express = require('express');
var bcrypt = require("bcrypt-inzi");
var jwt = require('jsonwebtoken');
var postmark = require("postmark");
var { SERVER_SECRET } = require("../core/index");
var token = process.env.API_TOKEN
var client = new postmark.Client(token);


var { userModle, otpModel } = require("../dbrepo/modles");
console.log("userModle: ", userModle)
var api = express.Router()


api.post('/signup', (req, res, next) => {
    console.log(req.body.userName)
    console.log(req.body.userEmail)
    console.log(req.body.userPhone)
    console.log(req.body.userPassword)
    if (!req.body.userName
        || !req.body.userEmail
        || !req.body.userPhone
        || !req.body.userPassword) {
        res.status(403).send(`
        please send complete information
        e.g:
        {
            "name": "xyz",
            "email": "xyz@gmail.com",
            "password": "1234",
            "phone": "01312314",
        }`);
        return
    };



    userModle.findOne({ email: req.body.userEmail }, function (err, data) {



        if (err) {
            console.log(err)
        } else if (!data) {

            bcrypt.stringToHash(req.body.userPassword).then(function (HashPassword) {
                var newUaser = new userModle({
                    "name": req.body.userName,
                    "email": req.body.userEmail,
                    "password": HashPassword,
                    "phone": req.body.userPhone,
                });

                newUaser.save((err, data) => {
                    if (!err) {
                        res.send({
                            message: "User created",
                            status:200
                        })
                    } else {
                        console.log(err)
                        res.send({
                            message: "user already exist",
                            status:403
                        })
                    };

                });

            })


        } else if (err){
            res.send({
                message:"db error",
                status:500
            })
        } else {

            res.send({
                message: "User already exist",
                status:403
            })
        }
    })


});

api.post("/login", (req, res, next) => {
    var userEmail = req.body.email;
    var userPassword = req.body.password;
    // console.log(userEmail)
    // console.log(userPassword)

    if (!userEmail || !userPassword) {

        res.status(403).send(`
            please send email and passwod in json body.
            e.g:
            {
                "email": "malikasinger@gmail.com",
                "password": "abc",
            }`)
        return;
    }

    userModle.findOne({ email: userEmail },
        function (err, loginRequestUser) {

            if (err) {
                res.status(500).send({
                    message: 'an errer occured'
                })
                console.log(err)
            } else if (loginRequestUser) {

                console.log(loginRequestUser)

                bcrypt.varifyHash(userPassword, loginRequestUser.password).then(match => {

                    if (match) {

                        var token = jwt.sign({
                            name: loginRequestUser.name,
                            email: loginRequestUser.email,
                            phone: loginRequestUser.phone,
                            id: loginRequestUser.id,
                            ip: req.connection.remoteAddress

                        }, SERVER_SECRET);

                        res.cookie('jToken', token, {
                            maxAge: 86_400_000,
                            httpOnly: true
                        });

                        res.send({
                            message: "login success",
                            status:200,

                            loginRequestUser: {
                                name: loginRequestUser.name,
                                email: loginRequestUser.email,
                                phone: loginRequestUser.phone
                            }
                        });

                    } else {
                        console.log('not matched')
                        res.send({
                            message: "Incorrect password",
                            status: 404
                        })
                    }
                }).catch(e => {
                    console.log("errer : ", e)
                })

            } else {
                res.send({
                    message: "User not found",
                    status: 403
                })
            }

        })

})

api.post("/logout",(req, res, next) =>{

    res.cookie('jToken', "", {
        maxAge: 86_400_000,
        httpOnly: true
    });

    res.send("logout success");
})

api.post("/forget-password", (req, res, next) => {

    console.log(req.body.forgetEmail)
    if (!req.body.forgetEmail) {

        res.status(403).send(`
            please send email in json body.
            e.g:
            {
                "forgetEmail": "malikasinger@gmail.com"
            }`)
        return;
    }

    userModle.findOne({ email: req.body.forgetEmail },
        function (err, user) {
            if (err) {
                res.status(500).send({
                    message: "an error occured: " + JSON.stringify(err)
                });
            } else if (user) {
                const otp = Math.floor(getRandomArbitrary(11111, 99999))

                otpModel.create({
                    email: req.body.forgetEmail,
                    otpCode: otp
                }).then((doc) => {

                    client.sendEmail({
                        "From": "zubair_student@sysborg.com",
                        "To": req.body.forgetEmail,
                        "Subject": "Reset your password",
                        "TextBody": `Here is your pasword reset code: ${otp}`
                    }).then((status) => {

                        console.log("status: ", status);
                        res.send({
                            status: 200,
                            message: "email sent with otp"
                        })

                    })

                }).catch((err) => {
                    console.log("error in creating otp: ", err);
                    res.send({
 
                        message:"unexpected error "
                    })
                })


            } else {
                res.send({
                    message: "user not found"
                });
            }
        });
})

api.post("/forget-password-step-2", (req, res, next) => {

    console.log(req.body.otpCode)
    console.log(req.body.newPassword)
    console.log(req.body.emailVarification)

    if (!req.body.emailVarification && !req.body.otpCode && !req.body.newPassword) {

        res.status(403).send(`
            please send emailVarification & otp in json body.
            e.g:
            {
                "emailVarification": "malikasinger@gmail.com",
                "newPassword": "xxxxxx",
                "otp": "xxxxx" 
            }`)
        return;
    }

    userModle.findOne({ email: req.body.emailVarification },
        function (err, user) {
            console.log(err)
            if (err) {
                res.status(500).send({
                    message: "an error occured: " + JSON.stringify(err)
                });
            } else if (user) {

                otpModel.find({ email: req.body.emailVarification },
                    function (err, otpData) {

                        

                        if (err) {
                            res.send({
                                message: "an error occured: " + JSON.stringify(err)
                            });
                        } else if (otpData) {
                            otpData = otpData[otpData.length - 1]

                            console.log("otpData: ", otpData);

                            const now = new Date().getTime();
                            const otpIat = new Date(otpData.createdOn).getTime();
                            const diff = now - otpIat;

                            console.log("diff: ", diff);

                            if (otpData.otpCode === req.body.otpCode && diff < 300000) {

                                bcrypt.stringToHash(req.body.newPassword).then(function (hash) {
                                    user.update({ password: hash }, {}, function (err, data) {
                                        res.send({
                                            status:200,
                                            message:"password updated"
                                        });
                                    })
                                })

                            } else {
                                res.send({
                                    message: "incorrect otp"
                                });
                            }
                        } else {
                            res.send({
                                message: "incorrect otp"
                            });
                        }
                    })

            } else {
                res.send({
                    message: "user not found"
                });
            }
        });
})

module.exports = api

function getRandomArbitrary(min, max) {
    return Math.random() * (max - min) + min;
} 
