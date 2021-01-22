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
// var SERVICE_ACCOUNT = JSON.parse(process.env.SERVICEACCOUNT)

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





// admin.initializeApp({
//     credential: admin.credential.cert(SERVICE_ACCOUNT),
//     DATABASE_URL:process.env.DATABASE_URL
// });
var serviceAccount = {
    "type": "service_account",
    "project_id": "twitter-94cd0",
    "private_key_id": "ff25f0f3188787bcdc3ba253247f7cc061f02a61",
    "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCNvDIrdMNVE7p3\nK7mgvAcXQ7pqCYvNk88mPiGZU04zQ+tuz0Ijh6l1yE1y3T1WrFzthA33O3y/xurV\nSDlbrrGedO3Ny7TQjqYq5rov+JoNuIGGvHBRI7Pwnk0LWRQNcIaARhByr1sGPRD3\n0byKLuTl3JIkSUEJ/28iZogJzhxwnvp2YYquyUkhj5pojcMabf/ypK1IC74dogVq\nI8NNC40z9U/aPU/sYTbRelJe0AfArHDlkYhyngfyxUCvOrpiJ9dkn19/a/hlTgn+\n7JMOmLCkUvGh3a28dcvAlgwneGYO+6niMYNxMwoTuMHA4T/+gwWskUyugbtxLIvT\nQ0BeK7srAgMBAAECggEAFNPfcXhWjeV4xLNVs1N+HUKUHanqc9qxGZcOu+e8eZcU\n/TMSroLseYTmMKdnMJnii/qYTMjek5XpA096MklRC452NYQmPXGA5JQELzFyfeqr\nif+d56Z99jFk8/Jymmj7MtVY7GltUFTf7fLRqGKsu0R260MifhQdoin7+qjhkADs\noycfqGdMzdYvC1f4VrPN3TdHFIFu2M2xJJWkI+Rb+c7HwJi+HsTi0Q5VtDc7qRF/\nY4RMFvu6wXJtwf8W2f8nxBtBNyAi6aN5nvMSftoYtXnAufQMC5uhr1eH/fAE0OyR\nnSwGeYrLSjkS0PmiZu86lLzFSBR3P3G/oXkxdJJqKQKBgQDBLAr4WVFjbGZolFyl\n40XWnWqvuzhzVUy+kqvnFStc7bchQKB7I5m4/yFnZEAlyt4zrVQRMqjQZyYmuP8Z\n/qQTtFa42AWn+1P9VGYltaSfFsfmp/CCAkwCmp5hINyyGhAjisfoRDwpVWk0fgIl\nNVL1ZPnDw9Jbr4JRCyAZF08ZkwKBgQC71WVlb49WWJ2CHqXzjnnEX4X7Kdicy7HZ\nx+IreOVV80J8m9vkSAqb+xE3/9cc7MALnezn1NK0+Ag6huyJAeQvNOpJ851kNd2F\nFeYZFXjU8YvjXQEe7HqI4vKszsI6JS7eqvGEYS2P3ddEKKmqE1JygHfw/XV0u3VG\nnkZnQM33CQKBgAhAyXcy2bdVukpdjFfKDgHNV/GKHi9PRagevBlzXhbqURiqmjCo\npLiyrcqtDdCPik7K6PyTHYNJ5OdioAOMTZZJ7iqXkCZNJpl8MaEK0a26W3APXMcx\nMe4qjPm5XbR+SJI8K65QvAFIFOaZO547WQADAGjMxQAFz5uGzihERqzhAoGBAKl5\n9a78ZZxHAHbzKFEFcKDaf40LSMLQl3wkedE3l9VhU9AS4Oish8YNVo/say9R/kV9\nDNBwml1mniYQr0M/TZ+6Ytqu0IgmgeUeySpA0XFxMALJW8WHIVh5TPTW6TCFdDC8\nlIYZGH8CbsS028D1BiMB/zaVunDE4yAAlw16z1vhAoGAfGQ8ag3tVXCbxYlhdjDd\ndDcuwtllhSoSaWTnezX/PyJ9YfCuTMz0hXkhlSlEv7xpwm8qHp9p++hF5Hn6lOyX\nCHkzrFonos92t15NpBSaTKW4wH0Fq0FwdlfVu5Tv5i9rL/gwv1rCXUjSkzY0M/zK\noW3wfe4Ub1A1lAiaeLerW38=\n-----END PRIVATE KEY-----\n",
    "client_email": "firebase-adminsdk-cogvh@twitter-94cd0.iam.gserviceaccount.com", 
    "client_id": "101259347849003025839",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-cogvh%40twitter-94cd0.iam.gserviceaccount.com"
}
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseUrl : "https://twitter-94cd0-default-rtdb.firebaseio.com/"
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







