require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const path = require("path");
const ejs = require("ejs");
const Book = require("./models/books");

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

app.get("/", async (req, res) => {
	const books = await Book.find();
	ejs.renderFile(
		path.join(__dirname, "index.ejs"),
		{ books },
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
	const { title, author } = req.body;
	try {
		const book = new Book({ title, author });
		await book.save();
		res.redirect("/");
	} catch (error) {
		console.log(error);
		res.status(500).send("Error adding book");
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
