const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const BooksSchema = new Schema({
	title: { type: String },
	body: { type: String },
});

module.exports = mongoose.model("Book", BooksSchema);
