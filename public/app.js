const url = 'http://localhost:5000';
var socket = io(url);
socket.on('connect', function () {
    console.log("connected")
});

function signup() {
    var userName = document.getElementById('name').value
    var userEmail = document.getElementById('email').value.toLowerCase()
    var userPhone = document.getElementById('phone').value
    var userPassword = document.getElementById('password').value
    // console.log(userEmail)
    axios({
        method: 'post',
        url: url + "/signup",
        data: {
            userName: userName,
            userEmail: userEmail,
            userPhone: userPhone,
            userPassword: userPassword
        },
        withCredentials: true

    })
        .then(function (response) {
            console.log(response);
            if (response.data.status === 200) {
                alert(response.data.message)
                location.href = "./login.html"
            } else {
                alert(response.data.message)
            }
        })
        .catch(function (error) {
            alert(error.response.data.message)
        });

    document.getElementById("name").value = ""
    document.getElementById("email").value = ""
    document.getElementById("phone").value = ""
    document.getElementById("password").value = ""

    return false;
}

function login() {
    var loginEmail = document.getElementById('loginEmail').value
    var loginPassword = document.getElementById('loginPassword').value

    axios({
        method: 'post',
        url: url + '/login',
        data: {
            email: loginEmail,
            password: loginPassword
        },
        withCredentials: true
    })

        .then(function (response) {
            console.log(response);
            if (response.data.status === 200) {
                alert(response.data.message)
                location.href = "./home.html"
            } else {
                alert(response.data.message)
            }
        })
        .catch(function (error) {
            alert(error.response.data.message)
        });



    return false;


}

function forgetPassword() {
    // alert("lafdksals")
    var forgetEmail = document.getElementById('forgetEmail').value
    localStorage.setItem("forgetEmail", forgetEmail)
    console.log(forgetEmail)
    axios({
        method: 'post',
        url: url + '/forget-password',
        data: ({
            forgetEmail: forgetEmail
        }),
        credentials: 'include'


    }).then((response) => {
        console.log(response)
        if (response.data.status === 200) {
            alert(response.data.message)
            window.location.href = "./passwordVarification.html"
        } else {
            alert(response.data.message)
        }
    }, (err) => {
        console.log(err);
        alert(err)
    });

    return false;
}
function forgetPasswordStep2() {

    // alert("lafdksals")
    var otpCode = document.getElementById('varificationCode').value
    var newPassword = document.getElementById('NewPassword').value
    var emailVarification = localStorage.getItem("forgetEmail")
    console.log(otpCode)
    console.log(newPassword)
    console.log(emailVarification)
    axios({
        method: 'post',
        url: url + '/forget-password-step-2',
        data: ({
            emailVarification: emailVarification,
            newPassword: newPassword,
            otpCode: otpCode
        }),
        credentials: 'include'
    }).then((response) => {
        console.log(response.data.message)
            if (response.data.status == 200) {
                alert(response.data.message)
                window.location.href = "./login.html"
            } else {
                alert(response.data.message)
            }
    }, (err) => {
        console.log(err);
    });
    return false;
}



function getProfile() {
    axios({
        method: 'get',
        url: url + '/profile',
        credentials: 'include'
    }).then((response) => {
        document.getElementById('userName').innerText = "User Name : " + response.data.profile.name
        document.getElementById('userEmail').innerText = "User Email : " + response.data.profile.email
        document.getElementById('userPhone').innerText = "Phone Number : " + response.data.profile.phone
        sessionStorage.setItem("userEmail", response.data.profile.email)
        sessionStorage.setItem("userName", response.data.profile.name)
    }, (err) => {
        console.log(err);
        location.href = "./login.html"
    });


}

function logout() {
    axios({
        method: 'post',
        url: url + '/logout',
    }).then((response) => {
        console.log(response)
        // alert(response.data.message)
        window.location.href = "/login.html"
    }, (err) => {
        console.log(err);
    });



    return false;
}

function tweet() {
    // alert("jdsljfa")
    var tweet = document.getElementById('message').value
    axios({
        method: 'post',
        url: url + '/tweet',
        data: {
            tweet: tweet,
            userEmail: sessionStorage.getItem("userEmail"),
            userName: sessionStorage.getItem("userName")
        },
        withCredentials: true
    })
        .then(function (response) {
        })
        .catch(function (error) {
        });


}

function getTweets() {
    axios({
        method: 'get',
        url: url + '/getTweets',
        credentials: 'include',
    }).then((response) => {
        console.log(response.data)
        let tweets = response.data;
        let html = ""
        tweets.forEach(element => {
            html += `
            <div class="tweet">
            <p class="user-name">${element.name}<p>
            <p class="tweet-date">${new Date(element.createdOn).toLocaleTimeString()}</p>
            <p class="tweet-text">${element.tweet}</p>
            </div>
            `
        });
        document.getElementById('text-area').innerHTML = html;

        // let userTweet = response.data

        // let userHtml = ""
        // let userName = document.getElementById('pName').innerHTML;
        // userTweet.forEach(element => {
        //     if (element.name == userName) {
        //         userHtml += `
        //         <div class="tweet">
        //         <p class="user-name">${element.name}<p>
        //         <p class="tweet-date">${new Date(element.createdOn).toLocaleTimeString()}</p>
        //         <p class="tweet-text">${element.tweets}</p>
        //         </div>
        //         `
        //     }
        // });
        // document.getElementById('text-area').innerHTML = userHtml;
    }, (error) => {
        console.log(error.message);
    });
    return false
}


socket.on('NEW_POST', (newPost) => {
    console.log(newPost)
    let tweets = newPost;
    document.getElementById('text-area').innerHTML += `
    <div class="tweet">
    <p>${newPost.name}<p>
    <p class="tweet-date">${new Date(tweets.createdOn).toLocaleTimeString()}</p>
    <p class="tweet-text">${tweets.tweet}</p>
    </div>
    `

})