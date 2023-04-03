const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const SpacifySchema = new mongoose.Schema({
	embed: {
		type: String,
		required: true,
	},
	sender: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
});

module.exports = mongoose.model("Spacify", SpacifySchema);
