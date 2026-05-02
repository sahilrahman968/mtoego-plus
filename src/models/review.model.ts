import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IReviewDocument extends Document {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  rating: number;
  comment: string;
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  hiddenReason?: string;
  hiddenBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReviewDocument>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },
    comment: {
      type: String,
      required: [true, "Review comment is required"],
      trim: true,
      minlength: [3, "Review comment must be at least 3 characters"],
      maxlength: [1000, "Review comment must be at most 1000 characters"],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    hiddenReason: {
      type: String,
      trim: true,
      maxlength: [300, "Hidden reason must be at most 300 characters"],
    },
    hiddenBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as Record<string, unknown>).__v;
        return ret;
      },
    },
  }
);

reviewSchema.index({ product: 1, createdAt: -1 });
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review: Model<IReviewDocument> =
  mongoose.models.Review ??
  mongoose.model<IReviewDocument>("Review", reviewSchema);

export default Review;
