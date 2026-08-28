import mongoose, { Schema, Document, Model, Types } from "mongoose";
import { SUPPORTED_COUNTRIES, type SupportedCountry } from "@/types";

export const MAX_ADDRESSES_PER_USER = 10;

export interface IUserAddressDocument extends Document {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: SupportedCountry;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userAddressSchema = new Schema<IUserAddressDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },
    label: {
      type: String,
      required: [true, "Label is required"],
      trim: true,
      maxlength: [40, "Label must be at most 40 characters"],
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
      trim: true,
      match: [/^\+\d{10,15}$/, "Please provide a valid phone number"],
    },
    line1: {
      type: String,
      required: [true, "Address line 1 is required"],
      trim: true,
      minlength: [5, "Address line 1 must be at least 5 characters"],
    },
    line2: { type: String, trim: true },
    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
      minlength: [2, "City must be at least 2 characters"],
    },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: {
      type: String,
      required: [true, "Country is required"],
      enum: SUPPORTED_COUNTRIES,
      trim: true,
      uppercase: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        const { __v, ...rest } = ret;
        return rest;
      },
    },
  }
);

userAddressSchema.index({ user: 1, createdAt: -1 });
userAddressSchema.index({ user: 1, isDefault: 1 });

const UserAddress: Model<IUserAddressDocument> =
  mongoose.models.UserAddress ??
  mongoose.model<IUserAddressDocument>("UserAddress", userAddressSchema);

export default UserAddress;
