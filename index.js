require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const Person = require("./models/person");

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
<<<<<<< HEAD
app.use(
	session({
		secret: process.env.SECRET_KEY,
		resave: false,
		saveUninitialized: false,
	})
);
=======
>>>>>>> parent of 7c578e8 (allowed users to register and login)

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

// app.post("/delete-database", async (req, res) => {
// 	try {
// 		await Book.deleteMany();
// 		console.log("Database deleted");
// 		res.redirect("/");
// 	} catch (error) {
// 		console.log(error);
// 		res.status(500).send("Error deleting database");
// 	}
// });

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Listening on port ${PORT}`);
	});
});
