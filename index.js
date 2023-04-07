require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const mongoose = require("mongoose");
const { OAuth2Client } = require("google-auth-library");
const { google } = require("googleapis");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const Person = require("./models/person");
const User = require("./models/user");
const Google = require("./models/google");
const Space = require("./models/space");
const Spacify = require("./models/spacify");
const Spacetube = require("./models/spacetube");
const Private = require("./models/private");

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.set("strictQuery", false);
mongoose.set("strictPopulate", false);
const connectDB = async () => {
	try {
		const conn = await mongoose.connect(process.env.MONGO_URI);
		console.log(`MongoDB Connnected: ${conn.connection.host}`);
	} catch (error) {
		console.log(error);
	}
};

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;
const REDIRECT_URI = "https://chat.arlandshane.com/auth/google/callback";
// const REDIRECT_URI = "http://localhost:3000/auth/google/callback";

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

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
			const spaces = await Space.find({
				participants: req.session.userId,
			});
			const currentUser = await User.findById(req.session.userId);
			const dp = req.session.profilePicUrl;
			ejs.renderFile(
				path.join(__dirname, "index.ejs"),
				{ persons, spaces, currentUser, dp, users },
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

app.get("/signUp", async (req, res) => {
	const userData = await User.find();
	ejs.renderFile(
		path.join(__dirname, "signUp.ejs"),
		{ userData },
		(err, html) => {
			if (err) {
				console.log(err);
				res.status(500).send("Internal Server Error");
			} else {
				res.send(html);
			}
		}
	);
});

app.post("/signUp", async (req, res) => {
	const { username, profilePicUrl, email, password } = req.body;
	const isLowerCase = /^[a-z_]+$/.test(username);
	if (!isLowerCase) {
		res.send(
			"<h1>Error</h1><p>The username must only consist of lowercase letters and may include underscores.<a href='/signUp'>Back to registration</a></p>"
		);
	} else {
		try {
			const user = new User({ username, profilePicUrl, email, password });
			await user.save();
			res.redirect("/login");
		} catch (error) {
			console.log(error);
			res.status(500).send(
				"<h1>Error: 500</h1><p>Error registering user.<br> Username could be taken. Username should be lowercase and unique. <br>You could already be registered, try <a href='/login'>login</a></p>"
			);
		}
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
			req.session.userId = user._id;
			// console.log("username in /login: " + req.session.username);
			res.redirect("/");
		} else {
			res.status(401).send("<h1>Error: 401</h1><p>Error logging in</p>");
		}
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Invalid credentials. Try <a href='/signUp'>signing up</a></p>"
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

app.get("/privateChat", async (req, res) => {
	try {
		const users = await User.find();
		const currentUser = await User.findById(req.session.userId).populate({
			path: "following",
			select: "username profilePicUrl",
		});
		const sender = await User.findById(req.session.userId);
		ejs.renderFile(
			path.join(__dirname, "/privateChat.ejs"),
			{ users, sender, currentUser },
			(err, html) => {
				if (err) {
					console.log(err);
					res.status(500).send("Error rendering template");
				} else {
					res.send(html);
				}
			}
		);
	} catch (err) {
		res.status(500).json({ message: err.message });
	}
});

app.get("/privateChat/:sender/:receiver", async (req, res) => {
	if (req.session.userId.toString() === req.params.sender) {
		try {
			const privates = await Private.find({
				$or: [
					{
						sender: req.params.sender,
						receiver: req.params.receiver,
					},
					{
						sender: req.params.receiver,
						receiver: req.params.sender,
					},
				],
			})
				.populate("sender")
				.sort({ timestamp: 1 });
			const sender = await User.findById(req.params.sender);
			const receiver = await User.findById(req.params.receiver);
			ejs.renderFile(
				path.join(__dirname, "/whisper.ejs"),
				{ privates, sender, receiver },
				(err, html) => {
					if (err) {
						console.log(err);
					} else {
						res.send(html);
					}
				}
			);
		} catch (err) {
			console.log(err);
		}
	} else {
		res.send("You are not authorized to enter this chat");
	}
});

app.post("/privateChat/:sender/:receiver", async (req, res) => {
	const privateMessage = new Private({
		sender: req.params.sender,
		receiver: req.params.receiver,
		messages: req.body.message,
		timestamp: Date.now(),
	});
	try {
		const newPrivate = await privateMessage.save();
		res.status(201).redirect(
			`/privateChat/${req.params.sender}/${req.params.receiver}`
		);
	} catch (err) {
		res.status(400).json({ message: err.message });
	}
});

app.post("/follow/:id", async (req, res) => {
	try {
		await User.findByIdAndUpdate(req.params.id, {
			$addToSet: { followers: req.session.userId },
		});
		await User.findByIdAndUpdate(req.session.userId, {
			$addToSet: { following: req.params.id },
		});
		res.redirect(`/privateChat/${req.session.userId}/${req.params.id}`);
	} catch (err) {
		console.log(err);
	}
});

app.post("/unfollow/:id", async (req, res) => {
	try {
		await User.findByIdAndUpdate(req.params.id, {
			$pull: { followers: req.session.userId },
		});
		await User.findByIdAndUpdate(req.session.userId, {
			$pull: { following: req.params.id },
		});
		res.redirect(`/privateChat/${req.session.userId}/${req.params.id}`);
	} catch (err) {
		console.log(err);
	}
});

app.get("/createSpace", async (req, res) => {
	res.sendFile(__dirname + "/createSpace.html");
});

app.post("/createSpace", async (req, res) => {
	try {
		const { name } = req.body;
		const participants = req.session.userId;
		const space = new Space({ name, participants });
		await space.save();
		res.redirect("/spaces");
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.get("/spaces", async (req, res) => {
	try {
		const userId = req.session.userId;
		const spaces = await Space.find({ participants: userId });
		const userSpaces = spaces.map((space) => space._id);
		const availableSpaces = await Space.find({
			$and: [
				{ participants: { $ne: userId } },
				{ _id: { $nin: userSpaces } },
			],
		});
		if (spaces.length === 0 && availableSpaces === 0) {
			res.redirect("/createSpace");
		} else {
			ejs.renderFile(
				path.join(__dirname, "/spaces.ejs"),
				{ spaces, availableSpaces, userId },
				(err, html) => {
					if (err) {
						console.log(err);
						res.status(500).send("Error rendering template");
					} else {
						res.send(html);
					}
				}
			);
		}
	} catch (error) {
		console.log(error);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.post("/spaces", async (req, res) => {
	try {
		const { name, participants } = req.body;
		const space = new Space({ name, participants });
		await space.save();
		res.json(space);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.get("/spaces/:spaceId", async (req, res) => {
	try {
		const space = await Space.findById(req.params.spaceId)
			.populate({
				path: "participants",
			})
			.populate({
				path: "messages.sender",
				select: "username timestamp",
			});
		if (!space) {
			return res.status(404).json({ message: "Space not found" });
		}
		const users = space.participants.map((participant) => participant.name);
		const userId = req.session.userId;
		ejs.renderFile(
			path.join(__dirname, "/space.ejs"),
			{ space, users, userId },
			(err, html) => {
				if (err) {
					console.log(err);
					res.status(500).send("Error rendering template");
				} else {
					res.send(html);
				}
			}
		);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.post("/spaces/:spaceId", async (req, res) => {
	try {
		const space = await Space.findById(req.params.spaceId);
		if (!space) {
			res.send("Space not found");
		} else {
			const message = {
				text: req.body.text,
				sender: req.session.userId,
				timestamp: new Date(),
			};
			space.messages.push(message);
			await space.save();
			res.redirect(`/spaces/${space._id}`);
		}
	} catch (error) {
		console.log(error);
	}
});

app.get("/spaces/:spaceId/join", async (req, res) => {
	try {
		const space = await Space.findById(req.params.spaceId);
		if (!space) {
			return res.status(404).json({ message: "Space not found" });
		}
		const userId = req.session.userId;
		if (space.participants.includes(userId)) {
			return res.status(403).json({
				message: "You are already a participant in this space",
			});
		} else {
			space.participants.push(userId);
			await space.save();
			res.redirect(`/spaces/${req.params.spaceId}`);
		}
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.post("/spaces/:spaceId/join", async (req, res) => {
	try {
		const userId = req.session.userId;
		const space = await Space.findById(req.params.spaceId);
		if (!space) {
			return res.status(404).json({ message: "Space not found" });
		}
		if (space.participants.includes(userId)) {
			return res.status(403).json({ message: "Already joined" });
		}
		space.participants.push(userId);
		await space.save();
		res.redirect(`/spaces/${req.params.spaceId}`);
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.post("/spaces/:spaceId/leave", async (req, res) => {
	try {
		const userId = req.session.userId;
		const space = await Space.findById(req.params.spaceId);
		if (!space) {
			return res.status(404).json({ message: "Space not found" });
		}
		if (
			!space.participants.some((participant) =>
				participant._id.equals(userId)
			)
		) {
			return res
				.status(403)
				.json({ message: "You are not a participant in this space" });
		} else {
			space.participants = space.participants.filter(
				(participant) => !participant._id.equals(userId)
			);
			await space.save();
			res.redirect(`/spaces/${req.params.spaceId}`);
		}
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Internal server error" });
	}
});

app.get("/user/:username", async (req, res) => {
	if (!req.session.username) {
		res.redirect("/login");
	} else if (req.params.username !== req.session.username) {
		res.send("You are not allowed to view this person's profile");
	} else {
		try {
			const user = await User.findOne({ username: req.session.username });
			const google = await Google.findOne({
				userId: req.session.userId,
			});
			ejs.renderFile(
				path.join(__dirname, "profile.ejs"),
				{ user, google },
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

app.get("/auth/google", (req, res) => {
	const url = oauth2Client.generateAuthUrl({
		access_type: "offline",
		scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
	});
	res.redirect(url);
});

app.get("/auth/google/disconnect", async (req, res) => {
	const userId = req.session.userId;
	try {
		await Google.findOneAndDelete({ userId });
		res.redirect(`/user/${req.session.username}`);
	} catch (err) {
		console.error(err);
		res.send("Error!");
	}
});

app.get("/auth/google/callback", async (req, res) => {
	const code = req.query.code;
	try {
		const { tokens } = await oauth2Client.getToken(code);
		// console.log(tokens);
		oauth2Client.setCredentials(tokens);
		const idToken = tokens.id_token;
		const [header, payload, signature] = idToken.split(".");
		const decodedPayload = JSON.parse(atob(payload));
		const userId = req.session.userId;
		const googlename = decodedPayload.name;
		const gmail = decodedPayload.email;
		const googlePicUrl = decodedPayload.picture;
		// console.log(userId, googlename, gmail, googlePicUrl);
		const googleUser = await Google.findOne({ userId: req.session.userId });
		if (googleUser) {
			return res.send("Already connected to Google");
		} else {
			let google = new Google({
				userId,
				googlename,
				gmail,
				googlePicUrl,
			});
			await google.save();
			res.redirect(`/user/${req.session.username}`);
		}
	} catch (err) {
		console.error(err);
		res.send("Error!");
	}
});

app.post("/changeAvatar", async (req, res) => {
	try {
		const avatar = req.body.profilePicUrl;
		// console.log("avatar: " + avatar);
		const user = await User.findById(req.session.userId);
		// console.log("user: " + user);
		await user.updateOne({ profilePicUrl: avatar });
		res.status(200).redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send("Server error");
	}
});

app.get("/spacify", async (req, res) => {
	try {
		const spacifys = await Spacify.find()
			.populate({
				path: "embed",
			})
			.populate({
				path: "sender",
				select: "username",
			});
		ejs.renderFile(
			path.join(__dirname, "spacify.ejs"),
			{ spacifys },
			(err, html) => {
				if (err) {
					console.log(err);
					res.status(500).send("Error rendering template");
				} else {
					res.send(html);
				}
			}
		);
	} catch (err) {
		console.log(err);
	}
});

app.post("/spacify", async (req, res) => {
	try {
		const { embed } = req.body;
		const sender = req.session.userId;
		const spacify = new Spacify({ embed, sender });
		await spacify.save();
		res.redirect("/spacify");
	} catch (err) {
		console.log(err);
	}
});

app.get("/spacetube", async (req, res) => {
	try {
		const spacetubes = await Spacetube.find()
			.populate({
				path: "embed",
			})
			.populate({
				path: "sender",
				select: "username",
			});
		ejs.renderFile(
			path.join(__dirname, "spacetube.ejs"),
			{ spacetubes },
			(err, html) => {
				if (err) {
					console.log(err);
					res.status(500).send("Error rendering template");
				} else {
					res.send(html);
				}
			}
		);
	} catch (err) {
		console.log(err);
	}
});

app.post("/spacetube", async (req, res) => {
	try {
		const { embed } = req.body;
		const sender = req.session.userId;
		const spacetube = new Spacetube({ embed, sender });
		await spacetube.save();
		res.redirect("/spacetube");
	} catch (err) {
		console.log(err);
	}
});

app.post("/delete", async (req, res) => {
	// remmeber to delete all user data
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
				res.redirect("/signUp");
			}
		});
	} catch (error) {
		console.log(error);
		res.status(500).send(
			"<h1>Error: 500</h1><p>Error deleting profile</p>"
		);
	}
});

app.get("/terms-of-service", (req, res) => {
	res.sendFile(__dirname + "/termsOfUse.html");
});

app.get("/privacy-policy", (req, res) => {
	res.sendFile(__dirname + "/privacyPolicy.html");
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
});
