var express = require('express');
var cors = require('cors');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var path = require("path");
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');

var { userModle, tweetmodel } = require("./dbrepo/modles");
var authRoutes = require("./routes/auth")
console.log(userModle)

var http = require("http");
var socketIO = require("socket.io");
var server = http.createServer(app);
var io = socketIO(server);

io.on("connection", () => {
    console.log("chl gya");
})

var { SERVER_SECRET } = require("./core/index");

const PORT = process.env.PORT || 5000;


var app = express()
app.use(cors({
    origin: '*',
    credentials: true
}))
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(cookieParser())
app.use("/", express.static(path.resolve(path.join(__dirname, "public"))));
app.use('/', authRoutes)

app.use(function (req, res, next) {
    console.log('cookie', req.cookies)

    if (!req.cookies.jToken) {
        res.status(401).send("include http-only credentials with every request")
        return;
    }

    jwt.verify(req.cookies.jToken, SERVER_SECRET, function (err, decodedData) {
        if (!err) {
            const issueDate = decodedData.iat * 1000
            const nowDate = new Date().getTime()
            const diff = nowDate - issueDate

            if (diff > 30000) {
                res.status(401).send('Token Expired')

            } else {
                var token = jwt.sign({
                    id: decodedData.id,
                    name: decodedData.name,
                    email: decodedData.email
                }, SERVER_SECRET)
                res.cookie('jToken', token, {
                    maxAge: 86_400_000,
                    httpOnly: true
                })
                req.body.jToken = decodedData
                next()
            }
        } else {
            res.status(401).send('invalid Token')
        }

    });

})



app.get('/Profile', (req, res, next) => {

    console.log(req.body)


    userModle.findById(req.body.jToken.id, "name email phone gender cratedOn",
        function (err, data) {
            console.log(data)
            if (!err) {
                res.send({
                    profile: data
                })
            } else {
                res.status(404).send({
                    message: "server err"
                })
            }

        })

})

app.post('/tweet', (req, res, next) => {
    console.log(req.body)

    if (!req.body.userName && !req.body.tweet || !req.body.userEmail ) {
        res.status(403).send({
            message: "please provide email or tweet/message"
        })
    }
    var newTweet = new tweetmodel({
        "name": req.body.userName,
        "tweets": req.body.tweet
    })
    newTweet.save((err, data) => {
        if (!err) {
            res.send({
                status: 200,
                message: "Post created",
                data: data
            })
            console.log(data.tweets)
            io.emit("NEW_POST", data)
        } else {
            console.log(err);
            res.status(500).send({
                message: "user create error, " + err
            })
        }
    });
})




app.listen(PORT, () => {
    console.log("surver is running on : ", PORT)
});







