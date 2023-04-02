const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const SpacetubesSchema = new mongoose.Schema({
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

module.exports = mongoose.model("Spacetube", SpacetubesSchema);
