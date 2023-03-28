require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const Person = require("./models/person");
const User = require("./models/user");
const user = require("./models/user");

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

const store = new MongoDBStore({
	uri: process.env.MONGO_URI,
	collection: "sessions",
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(
	session({
		secret: "shane_arland_secret_session_key",
		resave: false,
		saveUninitialized: true,
		store: store,
		cookie: {
			maxAge: 1000 * 60 * 60 * 24 * 7,
		},
	})
);

app.get("/", async (req, res) => {
	if (!req.session.username) {
		res.redirect("/login");
	} else {
		try {
			const persons = await Person.find();
			const users = await User.find();
			const currentUser = req.session.username;
			const dp = req.session.profilePicUrl;
			ejs.renderFile(
				path.join(__dirname, "index.ejs"),
				{ persons, currentUser, dp, users },
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
	}
});

app.get("/register", (req, res) => {
	res.sendFile(__dirname + "/register.html");
});

app.get("/login", (req, res) => {
	res.sendFile(__dirname + "/login.html");
});

app.post("/register", async (req, res) => {
	const { username, profilePicUrl, email, password } = req.body;
	const isLowerCase = /^[a-z_]+$/.test(username);
	if (!isLowerCase) {
		res.send(
			"<h1>Error</h1><p>The username must only consist of lowercase letters and may include underscores.<a href='/register'>Back to registration</a></p>"
		);
	} else {
		try {
			const user = new User({ username, profilePicUrl, email, password });
			await user.save();
			res.redirect("/login");
		} catch (error) {
			console.log(error);
			res.status(500).send(
				"<h1>Error: 500</h1><p>Error registering user.<br>You could already be registered, try <a href='/login'>login</a></p>"
			);
		}
	}
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
			console.log("username in /login: " + req.session.username);
			res.redirect("/");
		} else {
			res.status(401).send("<h1>Error: 500</h1><p>Error logging in</p>");
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 401</h1><p>Invalid credentials. Try <a href='/register'>signing up</a></p>"
		);
	}
});

app.post("/", async (req, res) => {
	const name = req.session.username;
	const { message } = req.body;

	try {
		if (!name) {
			res.redirect("/login");
		} else {
			const person = new Person({ name, message });
			await person.save();
			res.redirect("/");
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error adding message. You need to be connected to the internet and <span><a href='/login'>logged in</a></span></p>"
		);
	}
});

app.get("/logout", (req, res) => {
	req.session.destroy((err) => {
		if (err) {
			console.log(err);
		} else {
			res.redirect("/login");
		}
	});
});

app.get("/:username", async (req, res) => {
	if (!req.session.username) {
		res.redirect("/login");
	} else if (req.params.username !== req.session.username) {
		res.send("You are not allowed to view this person's profile");
	} else {
		try {
			const user = await User.findOne({ username: req.session.username });
			ejs.renderFile(
				path.join(__dirname, "profile.ejs"),
				{ user },
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
	}
});

app.post("/delete", async (req, res) => {
	try {
		const user = await User.findOneAndDelete({
			username: req.session.username,
		});
		console.log(
			"This user has flagged for deletion: " +
				req.session.username +
				" " +
				user
		);
		if (!user) {
			return res.status(404).send("User not found");
		}
		await user.deleteOne({ username: req.session.username });
		req.session.destroy((err) => {
			if (err) {
				console.log(err);
			} else {
				console.log("User session destroyed successfully");
				res.redirect("/register");
			}
		});
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error deleting profile</p>"
		);
	}
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
});
