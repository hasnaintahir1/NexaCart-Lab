import mongoose from "mongoose";

const ProductActivitySchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true
  },
  productId: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true
  },
  oldValue: {
    type: String,
    default: ""
  },
  newValue: {
    type: String,
    default: ""
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
});

export const ProductActivity =
  mongoose.models.ProductActivity ||
  mongoose.model("ProductActivity", ProductActivitySchema);