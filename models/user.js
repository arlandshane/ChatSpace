const mongoose = require("mongoose");

const Schema = mongoose.Schema;
const UserSchema = new mongoose.Schema({
	username: {
		type: String,
		required: true,
		unique: true,
	},
	profilePicUrl: {
		type: String,
	},
	email: {
		type: String,
		required: true,
		unique: true,
	},
	password: {
		type: String,
		required: true,
	},
	followers: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	],
	following: [
		{
			type: Schema.Types.ObjectId,
			ref: "User",
		},
	],
});

module.exports = mongoose.model("User", UserSchema);
