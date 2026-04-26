import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";
import { USER_ROLES, UserRole } from "@/types";

// ─── Document Interface ─────────────────────────────────────────────────────
export interface IUserDocument extends Document {
  name: string;
  email?: string | null;
  password?: string | null;
  phone?: string | null;
  isPhoneVerified: boolean;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  emailVerificationToken?: string | null;
  emailVerificationExpires?: Date | null;
  googleId?: string | null;
  picture?: string | null;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// ─── User Schema ────────────────────────────────────────────────────────────

const userSchema = new Schema<IUserDocument>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name must be at most 100 characters"],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Please provide a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
      default: null,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
      match: [/^\+\d{10,15}$/, "Please provide a valid phone number"],
    },
    isPhoneVerified: {
      type: Boolean,
      default: false,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: "Role must be one of: super_admin, staff, customer",
      },
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
      select: false,
    },
    emailVerificationExpires: {
      type: Date,
      default: null,
      select: false,
    },
    googleId: {
      type: String,
      default: null,
      sparse: true,
    },
    picture: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, __v, ...rest } = ret;
        return rest;
      },
    },
  }
);

// ─── Indexes ────────────────────────────────────────────────────────────────
userSchema.index({ role: 1 });
userSchema.index({ phone: 1 }, { sparse: true });

// ─── Pre‑save Hook — Hash Password ─────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method — Compare Passwords ────────────────────────────────────
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Model ──────────────────────────────────────────────────────────────────
const User: Model<IUserDocument> =
  mongoose.models.User ??
  mongoose.model<IUserDocument>("User", userSchema);

export default User;
