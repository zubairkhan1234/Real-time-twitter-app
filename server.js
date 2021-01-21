var express = require('express');
var cors = require('cors');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var path = require("path");
var jwt = require('jsonwebtoken');
var cookieParser = require('cookie-parser');
const fs = require('fs')
const multer = require('multer')
const admin = require("firebase-admin");
// const { profile } = require('console');
var { userModle, tweetmodel } = require("./dbrepo/modles");
var app = express();
var authRoutes = require('./routes/auth')
var  {SERVER_SECRET}  = require("./core/index");
// var {SERVICE_ACCOUNT} = require("./core/index.js") 
var SERVICE_ACCOUNT = JSON.parse(process.env.SERVICEACCOUNT)

var http = require("http");
var socketIO = require("socket.io");
var server = http.createServer(app);
var io = socketIO(server);

io.on("connection",()=>{
    console.log("user Connected");
})
const PORT = process.env.PORT || 5000;


app.use(cors({
    origin: '*',
    credentials: true
}))
app.use(morgan('dev'))
app.use(bodyParser.json())
app.use(cookieParser())
app.use('/', authRoutes)
app.use("/", express.static(path.resolve(path.join(__dirname, "public"))));

app.use(function (req, res, next) {
    // console.log('cookie', req.cookies)

    if (!req.cookies.jToken) {
        res.status(401).send("include http-only credentials with every request")
        return;
    }

    jwt.verify(req.cookies.jToken, SERVER_SECRET, function (err, decodedData) {
        if (!err) {
            const issueDate = decodedData.iat * 1000
            const nowDate = new Date().getTime()
            const diff = nowDate - issueDate

            if (diff > 300000) {
                res.status(401).send('Token Expired')

            } else {
                var token = jwt.sign({
                    id: decodedData.id,
                    name: decodedData.name,
                    email: decodedData.email
                }, SERVER_SECRET)
                res.cookie('jToken', token, {
                    maxAge: 86400000,
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
    userModle.findById(req.body.jToken.id, "name email phone gender cratedOn  profilePic",
        function (err, data) {
            console.log( "ye mera data hai "+ data)
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
    // console.log(req.body)

    if (!req.body.userName && !req.body.tweet || !req.body.userEmail ) {
        res.status(403).send({
            message: "please provide email or tweet/message"
        })
    }
    var newTweet = new tweetmodel({
        "name": req.body.userName,
        "tweet": req.body.tweet
    })
    newTweet.save((err, data) => {
        if (!err) {
            res.send({
                status: 200,
                message: "Post created",
                data: data
            })
            console.log(data.tweet)
            io.emit("NEW_POST", data)
        } else {
            console.log(err);
            res.status(500).send({
                message: "user create error, " + err
            })
        }
    });
})

app.get('/getTweets', (req, res, next) => {

    console.log(req.body)
    tweetmodel.find({}, (err, data) => {
        if (err) {
            console.log(err)
        }
        else {
            console.log(data)
            // data = data[data.length -1]
            res.send(data)
        }
    })
})


//////////////************************************* for frofile */



//==============================================
const storage = multer.diskStorage({
    destination: './upload/',
    filename: function (req, file, cb) {
        cb(null, `${new Date().getTime()}-${file.filename}.${file.mimetype.split("/")[1]}`)
    }
})
var upload = multer({ storage: storage })
// console.log(upload)

//==============================================





admin.initializeApp({
    credential: admin.credential.cert(SERVICE_ACCOUNT),
    DATABASE_URL:process.env.DATABASE_URL
});
const bucket = admin.storage().bucket("gs://twitter-94cd0.appspot.com");

//==============================================




app.post("/upload", upload.any(), (req, res, next) => { 

    console.log("req.body: ", req.body);
    console.log("req.body: ", JSON.parse(req.body.myDetails));
    console.log("req.files: ", req.files);

    console.log("uploaded file name: ", req.files[0].originalname);
    console.log("file type: ", req.files[0].mimetype);
    console.log("file name in server folders: ", req.files[0].filename);
    console.log("file path in server folders: ", req.files[0].path);

    bucket.upload(
        req.files[0].path,
        
        function (err, file, apiResponse) {
            if (!err) {
                console.log("api resp: ", apiResponse);

                file.getSignedUrl({
                    action: 'read',
                    expires: '03-09-2491'
                }).then((urlData, err) => {
                    // console.log(req.body.email)
                    if (!err) {
                        // console.log("public downloadable url: ", urlData[0]) // this is public downloadable url 
                       console.log(req.body.email)
                        userModle.findOne({email: req.body.email},(err,users)=>{
                            console.log(users)
                            if (!err) {
                                users.update({ profilePic: urlData[0]}, {}, function (err, data) {
                                    console.log(users)
                                    res.send({
                                        status: 200,
                                        message: "image uploaded",
                                        picture:users.profilePic
                                    });
                                })
                            }
                            else{
                                res.send({
                                    message: "error"
                                });
                            }
                        })
                        try {
                            fs.unlinkSync(req.files[0].path)
                            //file removed
                        } catch (err) {
                            console.error(err)
                        }
                    }
                })
            } else {
                console.log("err: ", err)
                res.status(500).send();
            }
        });
})









server.listen(PORT, () => {
    console.log("surver is running on : ", PORT)
});







