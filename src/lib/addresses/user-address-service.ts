import UserAddress, {
  MAX_ADDRESSES_PER_USER,
  type IUserAddressDocument,
} from "@/models/user-address.model";
import type { AddressInput } from "@/types";
import type { Types } from "mongoose";

export function toSavedAddressResponse(doc: IUserAddressDocument | Record<string, unknown>) {
  const d = doc as IUserAddressDocument;
  return {
    _id: String(d._id),
    label: d.label,
    name: d.name,
    phone: d.phone,
    line1: d.line1,
    line2: d.line2,
    city: d.city,
    state: d.state,
    postalCode: d.postalCode,
    country: d.country,
    isDefault: d.isDefault,
    createdAt:
      d.createdAt instanceof Date ? d.createdAt.toISOString() : String(d.createdAt),
    updatedAt:
      d.updatedAt instanceof Date ? d.updatedAt.toISOString() : String(d.updatedAt),
  };
}

export async function clearDefaultForUser(userId: string | Types.ObjectId) {
  await UserAddress.updateMany({ user: userId, isDefault: true }, { isDefault: false });
}

export async function countUserAddresses(userId: string | Types.ObjectId) {
  return UserAddress.countDocuments({ user: userId });
}

export async function createUserAddress(
  userId: string | Types.ObjectId,
  input: AddressInput & { isDefault?: boolean }
) {
  const count = await countUserAddresses(userId);
  if (count >= MAX_ADDRESSES_PER_USER) {
    throw new Error(`You can save at most ${MAX_ADDRESSES_PER_USER} addresses`);
  }

  const shouldDefault =
    input.isDefault === true || count === 0;

  if (shouldDefault) {
    await clearDefaultForUser(userId);
  }

  const doc = await UserAddress.create({
    user: userId,
    label: input.label,
    name: input.name,
    phone: input.phone,
    line1: input.line1,
    line2: input.line2,
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
    country: input.country,
    isDefault: shouldDefault,
  });

  return doc;
}

export async function updateUserAddress(
  userId: string | Types.ObjectId,
  addressId: string,
  input: AddressInput & { isDefault?: boolean }
) {
  const existing = await UserAddress.findOne({ _id: addressId, user: userId });
  if (!existing) return null;

  if (input.isDefault === true) {
    await clearDefaultForUser(userId);
    existing.isDefault = true;
  } else if (input.isDefault === false && existing.isDefault) {
    existing.isDefault = false;
  }

  existing.label = input.label ?? existing.label;
  existing.name = input.name;
  existing.phone = input.phone;
  existing.line1 = input.line1;
  existing.line2 = input.line2;
  existing.city = input.city;
  existing.state = input.state;
  existing.postalCode = input.postalCode;
  existing.country = input.country;

  await existing.save();

  if (!existing.isDefault) {
    const defaultCount = await UserAddress.countDocuments({
      user: userId,
      isDefault: true,
    });
    if (defaultCount === 0) {
      const fallback = await UserAddress.findOne({ user: userId }).sort({
        updatedAt: -1,
      });
      if (fallback) {
        fallback.isDefault = true;
        await fallback.save();
      }
    }
  }

  return existing;
}

export async function deleteUserAddress(
  userId: string | Types.ObjectId,
  addressId: string
) {
  const existing = await UserAddress.findOne({ _id: addressId, user: userId });
  if (!existing) return null;

  const wasDefault = existing.isDefault;
  await existing.deleteOne();

  if (wasDefault) {
    const fallback = await UserAddress.findOne({ user: userId }).sort({
      updatedAt: -1,
    });
    if (fallback) {
      fallback.isDefault = true;
      await fallback.save();
    }
  }

  return existing;
}

export async function setDefaultUserAddress(
  userId: string | Types.ObjectId,
  addressId: string
) {
  const existing = await UserAddress.findOne({ _id: addressId, user: userId });
  if (!existing) return null;

  await clearDefaultForUser(userId);
  existing.isDefault = true;
  await existing.save();
  return existing;
}

export function addressInputFromSaved(doc: IUserAddressDocument): AddressInput {
  return {
    label: doc.label,
    name: doc.name,
    phone: doc.phone,
    line1: doc.line1,
    line2: doc.line2,
    city: doc.city,
    state: doc.state,
    postalCode: doc.postalCode,
    country: doc.country,
  };
}
