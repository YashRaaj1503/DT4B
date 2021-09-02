const https = require('https');
const express = require("express");
const path = require("path");
const app = express();
const hbs = require("hbs");
const exphbs = require("express-handlebars");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
var mongoose = require("mongoose");
var session = require("express-session");
var flash = require("connect-flash");
const Razorpay = require("razorpay");
const nodemailer = require("nodemailer");
const cookieParser = require("cookie-parser");
const auth = require("./middleware/auth");
const pass = require("./middleware/pass");
const port = process.env.PORT || 8000;


//-----------------------DATABASE CONNECTED-----------------------//
mongoose.connect('mongodb://localhost/Database', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true });

//const YOUR_DOMAIN = `http://localhost:${port}`;
const User = require("./models/users.js");
const { json } = require("express");
const { request } = require("http");
const parseUrl = express.urlencoded({ extended: false });
const parseJson = express.json({ extended: false });
const PaytmChecksum = require('./payment/paytm/PaytmChecksum');

//----------------------------PARTIALS FOLDER----------------------------//
const partials_path = path.join(__dirname, "./templates/partials");
const checksum_lib = require("./payment/paytm/checksum");
const config = require("./payment/razorpay/config");
const products = require("./payment/razorpay/products");

//----------------------------STATIC FOLDER----------------------------//
app.use('/static', express.static('static'))
app.use(session({
    secret: 'secret',
    cookie: {},
    resave: false,
    saveUninitialized: false
}));
app.use(flash());

//----------------------------EXPRESS SPECIFIC----------------------------//
app.set('views', path.join(__dirname, '/templates/views'));
app.set("view engine", "hbs");
hbs.registerPartials(partials_path);


//----------------------------BODY PARSER MIDDLEWARE----------------------------//
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

//----------------------------ENDPOINTS----------------------------//

//GET REQUESTS
app.get('/', auth, (req, res) => {
    res.status(200).render("home", { message: ('hello') });
});

app.get('/pay', auth, (req, res) => {
    res.status(200).render("payrp");
});

app.get('/youtube', auth, (req, res) => {
    res.status(200).render("youtube");
});

app.get('/c1', auth, (req, res) => {
    res.status(200).render("c1");
});

app.get('/books', auth, (req, res) => {
    res.status(200).render("books");
});

app.get('/cancel', auth, (req, res) => {
    res.status(200).render("cancel");
});

app.get('/checkout', auth, (req, res) => {
    res.status(200).render("checkout");
});

app.get('/success', auth, (req, res) => {
    res.status(200).render("success");
});

app.get('/home', auth, (req, res) => {
    //console.log(`${req.cookies.jwt}`);
    res.status(200).render("home");
    //console.log(pass)
});

app.get('/contact', auth, (req, res) => {
    res.status(200).render("contact");
});

app.get('/course', auth, (req, res) => {
    res.status(200).render("course");
});

app.get('/login', (req, res) => {
    res.status(200).render("login.ejs", { message: req.flash('message') });
});

app.get('/register', (req, res) => {
    res.status(200).render("register.ejs", { message: req.flash('message') });
});

//POST REQUESTS
app.post('/register', async (req, res) => {
    try {
        const Database = new User({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            date: Date(Date.now())
        })
        const userbase = await User.findOne({ email: req.body.email });
        if (userbase.username == req.body.username) {
            req.flash('message', 'Username already exist');
            res.redirect("/register");
        }
        else if (userbase.email == req.body.email) {
            req.flash('message', 'Email already exist');
            res.redirect("/register");
        }
        else if (req.body.password != req.body.confirmpassword) {
            req.flash('message', 'Password not matching');
            res.redirect("/register");
        }
        else {
            const token = await Database.generateAuthToken();
            res.cookie('jwt', token, {
                expires: new Date(Date.now() + 2592000000),
                httpOnly: true
            });
            const registered = await Database.save();
            res.status(201).render("login");
        }
        //const registered = await Database.save();
        /*res.status(201).render("register",{
            title:'Register' ,
            errors:errors
        })*/
    } catch (error) {
        const Database = new User({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            date: Date(Date.now())
        })
        const token = await Database.generateAuthToken();
        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 2592000000),
            httpOnly: true
        });
        const registered = await Database.save();
        res.status(201).render("login");
    }

});

app.post('/login', async (req, res) => {
    try {

        const usermail = await User.findOne({ email: req.body.username });
        const token = await usermail.generateAuthToken();
        res.cookie('jwt', token, {
            expires: new Date(Date.now() + 2592000000),
            httpOnly: true
        });

        if (usermail.password != req.body.password) {
            req.flash('message', 'Incorrect Password');
            res.redirect("/login");
        }
        else {
            res.redirect("home");
        }
    } catch (error) {
        req.flash('message', 'Invalid login details');
        res.redirect("/login");
        console.log(error)
    }
});

app.post("/create/orderId", (req, res) => {
    var instance = new Razorpay({
        key_id: config.RazorPayConfig.keyId,
        key_secret: config.RazorPayConfig.keySecret
    })

    var options = {
        amount: req.body.amount,  // amount in the smallest currency unit
        currency: "INR",
        receipt: "rcp1"
    };
    instance.orders.create(options, function (err, order) {
        console.log(order);
        res.send({ orderId: order.id });
    });
});

app.post("/api/payment/verify", (req, res) => {

    let body = req.body.response.razorpay_order_id + "|" + req.body.response.razorpay_payment_id;

    var crypto = require("crypto");
    var expectedSignature = crypto.createHmac('sha256', 'Wok5mJv2F0pa5HKLeXZfUr9r')
        .update(body.toString())
        .digest('hex');
    console.log("sig received ", req.body.response.razorpay_signature);
    console.log("sig generated ", expectedSignature);
    var response = { "signatureIsValid": "false" }
    if (expectedSignature === req.body.response.razorpay_signature)
        response = { "signatureIsValid": "true" }
    res.send(response);
});

/*app.post("/paynow", [parseUrl, parseJson], (req, res) => {
    // Route for making payment

    var paymentDetails = {

        customerId: req.body.name,
        customerEmail: req.body.email,
        customerPhone: req.body.phone
    }
    if (!paymentDetails.customerId || !paymentDetails.customerEmail || !paymentDetails.customerPhone) {
        res.status(400).send('Payment failed')
    } else {
        var params = {};
        params['MID'] = config.PaytmConfig.mid;
        params['WEBSITE'] = config.PaytmConfig.website;
        params['CHANNEL_ID'] = 'WEB';
        params['INDUSTRY_TYPE_ID'] = 'Retail';
        params['ORDER_ID'] = 'TEST_' + new Date().getTime();
        params['CUST_ID'] = paymentDetails.customerId;
        params['TXN_AMOUNT'] = products.Product1.amount;
        params['CALLBACK_URL'] = `http://localhost:${port}/callback`;
        params['EMAIL'] = paymentDetails.customerEmail;
        params['MOBILE_NO'] = paymentDetails.customerPhone;


        checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {
            var txn_url = "https://securegw-stage.paytm.in/theia/processTransaction"; // for staging
            // var txn_url = "https://securegw.paytm.in/theia/processTransaction"; // for production

            var form_fields = "";
            for (var x in params) {
                form_fields += "<input type='hidden' name='" + x + "' value='" + params[x] + "' >";
            }
            form_fields += "<input type='hidden' name='CHECKSUMHASH' value='" + checksum + "' >";

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.write('<html><head><title>Merchant Checkout Page</title></head><body><center><h1>Please do not refresh this page...</h1></center><form method="post" action="' + txn_url + '" name="f1">' + form_fields + '</form><script type="text/javascript">document.f1.submit();</script></body></html>');
            res.end();
        });
    }
});


app.post("/callback", (req, res) => {
    // Route for verifiying payment

    var body = '';

    req.on('data', function (data) {
        body += data;
    });

    req.on('end', function () {
        var html = "";
        var post_data = qs.parse(body);

        // received params in callback
        console.log('Callback Response: ', post_data, "\n");


        // verify the checksum
        var checksumhash = post_data.CHECKSUMHASH;
        // delete post_data.CHECKSUMHASH;
        var result = checksum_lib.verifychecksum(post_data, config.PaytmConfig.key, checksumhash);
        console.log("Checksum Result => ", result, "\n");


        // Send Server-to-Server request to verify Order Status
        var params = { "MID": config.PaytmConfig.mid, "ORDERID": post_data.ORDERID };

        checksum_lib.genchecksum(params, config.PaytmConfig.key, function (err, checksum) {

            params.CHECKSUMHASH = checksum;
            post_data = 'JsonData=' + JSON.stringify(params);

            var options = {
                hostname: 'securegw-stage.paytm.in', // for staging
                // hostname: 'securegw.paytm.in', // for production
                port: 443,
                path: '/merchant-status/getTxnStatus',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Content-Length': post_data.length
                }
            };


            // Set up the request
            var response = "";
            var post_req = https.request(options, function (post_res) {
                post_res.on('data', function (chunk) {
                    response += chunk;
                });

                post_res.on('end', function () {
                    console.log('S2S Response: ', response, "\n");

                    var _result = JSON.parse(response);
                    if (_result.STATUS == 'TXN_SUCCESS') {
                        res.send('payment sucess')
                    } else {
                        res.send('payment failed')
                    }
                });
            });

            // post the data
            post_req.write(post_data);
            post_req.end();
        });
    });
});*/


app.post('/contact', (req, res) => {
    const output = `
        <p>You have a new contact request</p>
        <h3>Contact Details</h3>
        <ul>
            <li>Name: ${req.body.name}</li>
            <li>Phone No.: ${req.body.phone}</li>
            <li>Email: ${req.body.email}</li>
        </ul>
        <h3>Message</h3>
        <p>${req.body.message}</p>
    `;

    // create reusable transporter object using the default SMTP transport
    /*let transporter = nodemailer.createTransport({
        host: 'smtp-pulse.com',
        port: 2525,
        secure: false, // true for 465, false for other ports
        auth: {
            user: 'yashraaj15kashyap@gmail.com', // generated ethereal user
            pass: 'kX2NDQSXG4GjA4', // generated ethereal password
        },
    });

  // send mail with defined transport object
    let mailOptions = {
        from: '"Nodemailer Contact" <yashraaj15kashyap@gmail.com>', // sender address
        to: "yashraaj9274@gmail.com", // list of receivers
        subject: "Node Contact Request", // Subject line
        text: "Hello world?", // plain text body
        html: output, // html body
        };

    transporter.sendMail(mailOptions, (error, info)=>{
        if(error){
            return console.log(error);
        }
        console.log('Message sent: %s', info.messageId);
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

        res.render('contact', {msg:'Emailhas been sent'});
    });*/
    var transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: 'yashraaj15kashyap@gmail.com',
            pass: 'Skill1986'
        }
    });

    var mailOptions = {
        from: 'yashraaj15kashyap@gmail.com',
        to: 'yashraaj9274@gmail.com',
        subject: 'Sending Email using Node.js',
        text: 'That was easy!'
    };

    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
        } else {
            console.log('Email sent: ' + info.response);
        }
    });
});

//----------------------------START THE SERVER----------------------------//
app.listen(port, () => {
    console.log(`Server is running at ${port}`);
});