var mongoose = require("mongoose");

var vgramSchema = new mongoose.Schema({
	name: String,
	image: String,
	author:{
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	comments:[
		{
			type:mongoose.Schema.Types.ObjectId,
			ref:"Comment"
		}
	],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
    rateCount:Number,
	createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Vgram", vgramSchema);