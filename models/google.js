const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const GoogleSchema = new mongoose.Schema({
	userId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true,
	},
	googlename: {
		type: String,
		required: true,
		unique: true,
	},
	gmail: {
		type: String,
		required: true,
		unique: true,
	},
	googlePicUrl: {
		type: String,
	},
});

module.exports = mongoose.model("Google", GoogleSchema);
