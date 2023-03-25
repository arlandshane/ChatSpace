const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const PersonsSchema = new Schema({
	name: { type: String, required: true },
	message: { type: String, required: true },
});

module.exports = mongoose.model("Person", PersonsSchema);