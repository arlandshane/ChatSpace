const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const SpaceSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
	},
	participants: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: true,
		},
	],
	messages: [
		{
			text: {
				type: String,
				required: true,
			},
			sender: {
				type: mongoose.Schema.Types.ObjectId,
				ref: "User",
				required: true,
			},
			timestamp: {
				type: Date,
				default: Date.now,
			},
		},
	],
});

module.exports = mongoose.model("Space", SpaceSchema);