require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const Person = require("./models/person");
const User = require("./models/user");

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.set("strictQuery", false);
const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB Connnected: ${conn.connection.host}`);
	} catch (error) {
		console.log(error);
	}
};

app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
	session({
		secret: "shane_arland_secret_session_key",
		resave: false,
		saveUninitialized: false,
	})
);

app.get("/", async (req, res) => {
	try {
		const persons = await Person.find();
		const currentUser = req.session.username;
		const dp = req.session.profilePicUrl;
		ejs.renderFile(
			path.join(__dirname, "index.ejs"),
			{ persons, currentUser, dp },
			(err, html) => {
				if (err) {
					console.log(err);
					res.status(500).send("Error rendering template");
				} else {
					res.send(html);
				}
			}
		);
	} catch (error) {
		console.log(error);
		res.status(500).send("Error retrieving data");
	}
});

app.post("/", async (req, res) => {
	const { message } = req.body;
	const name = req.session.username;
	console.log("Username: " + name);
	try {
		const person = new Person({ name, message });
		await person.save();
		res.redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error adding message. You need to be connected to the internet and <span><a href='/login'>logged in</a></span></p>"
		);
	}
});

app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/register.html");
});

app.post("/register", async (req, res) => {
	const { username, profilePicUrl, email, password } = req.body;
	try {
		const user = new User({ username, profilePicUrl, email, password });
		await user.save();
		req.session.username = user.username;
		console.log(user.profilePicUrl);
		res.redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error registering user.<br>You could already be registered, try <a href='/login'>login</a></p>"
		);
	}
});

app.get("/login", (req, res) => {
	res.sendFile(__dirname + "/login.html");
});

app.post("/login", async (req, res) => {
	const { emailOrUsername, password } = req.body;
	try {
		const user = await User.findOne({
			$or: [{ email: emailOrUsername }, { username: emailOrUsername }],
		});
		req.session.profilePicUrl = user.profilePicUrl;
		if (user && user.password === password) {
			req.session.username = user.username;
			res.redirect("/");
		} else {
			res.status(401).send(
				"<h1>Error: 401</h1><p>Invalid credentials. Try <a href='/register'>signing up</a></p>"
			);
		}
	} catch (error) {
		console.log(error);
		res.status(500).send("<h1>Error: 500</h1><p>Error logging in</p>");
	}
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/login");
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
});
