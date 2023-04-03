const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const PrivatesSchema = new Schema({
	sender: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
	},
	receiver: {
		type: mongoose.Schema.ObjectId,
		ref: "User",
		required: true,
	},
	messages: {
		type: String,
		required: true,
	},
	timestamp: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model("Private", PrivatesSchema);
