const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const PersonsSchema = new Schema({
	name: { type: String },
	message: { type: String },
});

module.exports = mongoose.model("Person", PersonsSchema);
