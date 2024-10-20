require("dotenv").config();
const mongoose = require("mongoose");

const bookSchema = mongoose.Schema(
  {
    title: { type: String },
    author_name: { type: String },
    price: { type: Number },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    location: { type: String },
    condition: { type: String }, // new, fairly new, old, bad
    defects: { type: String },
    description: { type: String },
    isListed: { type: Boolean },
    category: { type: String },
    whatsappLink: { type: String },
    img_url: { type: String },
  },
  { timestamps: true }
);

bookSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

bookSchema.set("toJSON", {
  virtuals: true,
});

const Books = mongoose.model("Books", bookSchema);

module.exports = Books;
