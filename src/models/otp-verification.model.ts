import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOtpVerification extends Document {
  phone: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

const otpVerificationSchema = new Schema<IOtpVerification>(
  {
    phone: {
      type: String,
      required: true,
      unique: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpVerification: Model<IOtpVerification> =
  mongoose.models.OtpVerification ??
  mongoose.model<IOtpVerification>("OtpVerification", otpVerificationSchema);

export default OtpVerification;
