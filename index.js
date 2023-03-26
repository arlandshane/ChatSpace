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
	const persons = await Person.find();
	ejs.renderFile(
		path.join(__dirname, "index.ejs"),
		{ persons },
		(err, html) => {
			if (err) {
				console.log(err);
				res.status(500).send("Error rendering template");
			} else {
				res.send(html);
			}
		}
	);
});

app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/register.html");
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
		if (user && user.password === password) {
			req.session.username = user.username;
			res.redirect("/");
		} else {
			res.status(401).send("Invalid credentials");
		}
	} catch (error) {
		console.log(error);
		res.status(500).send("<h1>Error:500</h1><p>Error logging in</p>");
	}
});

app.post("/register", async (req, res) => {
	const { email, username, password } = req.body;
	try {
		const user = new User({ email, username, password });
		await user.save();
		req.session.username = user.username;
		res.redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error registering user.<br>You could already be registered, try <a href='/login'>login</a></p>"
		);
	}
});

app.get("/logout", (req, res) => {
	req.session.destroy();
	res.redirect("/login");
});

app.post("/", async (req, res) => {
	const { name, message } = req.body;
	try {
		const person = new Person({ name, message });
		await person.save();
		res.redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send("Error adding message");
	}
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
});
