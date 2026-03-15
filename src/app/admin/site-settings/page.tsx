"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { Eye, EyeOff, Upload, Trash2, Save, ExternalLink, Loader2 } from "lucide-react";

interface HeroBanner {
  type: "image" | "video";
  url: string;
  publicId: string;
  alt: string;
  link: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
}

interface HeroImage {
  url: string;
  publicId: string;
  alt: string;
  isActive: boolean;
}

const defaultBanner: HeroBanner = {
  type: "image",
  url: "",
  publicId: "",
  alt: "",
  link: "",
  headline: "",
  subheadline: "",
  ctaText: "",
  ctaLink: "",
  isActive: false,
};

const defaultHeroImage: HeroImage = {
  url: "",
  publicId: "",
  alt: "",
  isActive: false,
};

export default function SiteSettingsPage() {
  const [banner, setBanner] = useState<HeroBanner>(defaultBanner);
  const [heroImage, setHeroImage] = useState<HeroImage>(defaultHeroImage);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/admin/site-settings")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data?.heroBanner) {
          setBanner({ ...defaultBanner, ...json.data.heroBanner });
        }
        if (json.success && json.data?.heroImage) {
          setHeroImage({ ...defaultHeroImage, ...json.data.heroImage });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    if (!isVideo && !isImage) {
      setMessage({ text: "Please upload an image or video file", type: "error" });
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        const uploaded = json.data.uploaded?.[0] ?? json.data[0];
        setBanner((prev) => ({
          ...prev,
          type: isVideo ? "video" : "image",
          url: uploaded.url,
          publicId: uploaded.publicId,
        }));
        setMessage({ text: "File uploaded successfully", type: "success" });
      } else {
        setMessage({ text: json.message || "Upload failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleRemoveMedia = () => {
    setBanner((prev) => ({ ...prev, url: "", publicId: "", type: "image" }));
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage({ text: "Please upload an image file", type: "error" });
      return;
    }

    setUploadingHeroImage(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("files", file);

      const res = await fetch("/api/admin/upload", { method: "POST", body: formData });
      const json = await res.json();

      if (json.success) {
        const uploaded = json.data.uploaded?.[0] ?? json.data[0];
        setHeroImage((prev) => ({
          ...prev,
          url: uploaded.url,
          publicId: uploaded.publicId,
        }));
        setMessage({ text: "Hero image uploaded successfully", type: "success" });
      } else {
        setMessage({ text: json.message || "Upload failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Upload failed", type: "error" });
    } finally {
      setUploadingHeroImage(false);
      e.target.value = "";
    }
  };

  const handleRemoveHeroImage = () => {
    setHeroImage((prev) => ({ ...prev, url: "", publicId: "" }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heroBanner: banner, heroImage }),
      });
      const json = await res.json();

      if (json.success) {
        setMessage({ text: "Settings saved successfully", type: "success" });
      } else {
        setMessage({ text: json.message || "Failed to save", type: "error" });
      }
    } catch {
      setMessage({ text: "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Landing Page</h1>
          <p className="text-sm text-slate-500 mt-0.5">Customise the hero banner on your storefront</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-black disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Changes
        </button>
      </div>

      {message && (
        <div
          className={`mb-6 p-3 text-sm rounded-lg border ${
            message.type === "success"
              ? "bg-gray-50 text-gray-700 border-gray-200"
              : "bg-gray-50 text-gray-700 border-gray-200"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Hero Banner Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-900">Hero Banner</h2>
          <button
            onClick={() => setBanner((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              banner.isActive
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {banner.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            {banner.isActive ? "Active" : "Inactive"}
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Media Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Banner Image or Video
            </label>
            {banner.url ? (
              <div className="relative group">
                {banner.type === "video" ? (
                  <video
                    src={banner.url}
                    className="w-full aspect-[3/1] object-cover rounded-lg border border-slate-200"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden border border-slate-200">
                    <Image
                      src={banner.url}
                      alt={banner.alt || "Hero banner"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 800px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 bg-white rounded-lg text-slate-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveMedia}
                    className="p-2 bg-white rounded-lg text-slate-700 hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full aspect-[3/1] rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                {uploading ? (
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Click to upload an image or video
                    </span>
                    <span className="text-xs text-slate-400">
                      Recommended: 1920×640 for best results
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleUpload}
              className="hidden"
            />
          </div>

          {/* Alt text */}
          {banner.url && banner.type === "image" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Alt Text
              </label>
              <input
                type="text"
                value={banner.alt}
                onChange={(e) => setBanner((prev) => ({ ...prev, alt: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Describe the image for accessibility"
              />
            </div>
          )}

          {/* Text Overlay */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Text Overlay</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Headline
                </label>
                <input
                  type="text"
                  value={banner.headline}
                  onChange={(e) => setBanner((prev) => ({ ...prev, headline: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g. Summer Sale — Up to 50% Off"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Subheadline
                </label>
                <input
                  type="text"
                  value={banner.subheadline}
                  onChange={(e) => setBanner((prev) => ({ ...prev, subheadline: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g. Limited time offer on all categories"
                />
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Call to Action</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Button Text
                </label>
                <input
                  type="text"
                  value={banner.ctaText}
                  onChange={(e) => setBanner((prev) => ({ ...prev, ctaText: e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                  placeholder="e.g. Shop Now"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Button Link
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={banner.ctaLink}
                    onChange={(e) => setBanner((prev) => ({ ...prev, ctaLink: e.target.value }))}
                    className="w-full px-3 py-2 pr-9 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                    placeholder="e.g. /products or /categories/sale"
                  />
                  <ExternalLink size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Link (clickable entire banner) */}
          <div className="border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Banner Link</h3>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Link URL <span className="text-slate-400 font-normal">(clicking the banner goes here)</span>
              </label>
              <input
                type="text"
                value={banner.link}
                onChange={(e) => setBanner((prev) => ({ ...prev, link: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="e.g. /products (optional)"
              />
            </div>
          </div>

          {/* Preview */}
          {banner.url && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
              <div className="relative w-full aspect-[3/1] rounded-lg overflow-hidden bg-gray-100">
                {banner.type === "video" ? (
                  <video
                    src={banner.url}
                    className="w-full h-full object-cover"
                    muted
                    autoPlay
                    loop
                    playsInline
                  />
                ) : (
                  <Image
                    src={banner.url}
                    alt={banner.alt || "Preview"}
                    fill
                    sizes="800px"
                    className="object-cover"
                  />
                )}
                {(banner.headline || banner.subheadline || banner.ctaText) && (
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white text-center p-6">
                    {banner.headline && (
                      <h2 className="text-lg sm:text-2xl font-bold drop-shadow-lg">
                        {banner.headline}
                      </h2>
                    )}
                    {banner.subheadline && (
                      <p className="mt-1 text-xs sm:text-sm text-white/90 max-w-md drop-shadow">
                        {banner.subheadline}
                      </p>
                    )}
                    {banner.ctaText && (
                      <span className="mt-3 inline-block px-4 py-1.5 bg-white text-gray-900 text-xs sm:text-sm font-medium rounded-full">
                        {banner.ctaText}
                      </span>
                    )}
                  </div>
                )}
                {!banner.isActive && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900/70 text-white text-xs rounded">
                    Not visible on storefront
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hero Image Section */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Hero Image</h2>
            <p className="text-xs text-slate-500 mt-0.5">Displayed alongside the hero text on the landing page</p>
          </div>
          <button
            onClick={() => setHeroImage((prev) => ({ ...prev, isActive: !prev.isActive }))}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              heroImage.isActive
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {heroImage.isActive ? <Eye size={14} /> : <EyeOff size={14} />}
            {heroImage.isActive ? "Active" : "Inactive"}
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Hero Image
            </label>
            {heroImage.url ? (
              <div className="relative group">
                <div className="relative w-full aspect-square max-w-sm rounded-lg overflow-hidden border border-slate-200">
                  <Image
                    src={heroImage.url}
                    alt={heroImage.alt || "Hero image"}
                    fill
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover"
                  />
                </div>
                <div className="absolute inset-0 max-w-sm bg-black/0 group-hover:bg-black/40 transition-colors rounded-lg flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => heroImageInputRef.current?.click()}
                    className="p-2 bg-white rounded-lg text-slate-700 hover:bg-gray-50 transition-colors"
                  >
                    <Upload size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveHeroImage}
                    className="p-2 bg-white rounded-lg text-slate-700 hover:bg-gray-50 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => heroImageInputRef.current?.click()}
                disabled={uploadingHeroImage}
                className="w-full max-w-sm aspect-square rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 hover:border-gray-400 hover:bg-gray-50/50 transition-colors cursor-pointer"
              >
                {uploadingHeroImage ? (
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-gray-900 rounded-full animate-spin" />
                ) : (
                  <>
                    <Upload size={24} className="text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Click to upload an image
                    </span>
                    <span className="text-xs text-slate-400">
                      Recommended: Square image (e.g. 800x800)
                    </span>
                  </>
                )}
              </button>
            )}
            <input
              ref={heroImageInputRef}
              type="file"
              accept="image/*"
              onChange={handleHeroImageUpload}
              className="hidden"
            />
          </div>

          {/* Alt text */}
          {heroImage.url && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Alt Text
              </label>
              <input
                type="text"
                value={heroImage.alt}
                onChange={(e) => setHeroImage((prev) => ({ ...prev, alt: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
                placeholder="Describe the image for accessibility"
              />
            </div>
          )}

          {/* Preview */}
          {heroImage.url && (
            <div className="border-t border-slate-100 pt-6">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Preview</h3>
              <div className="relative w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-gray-100">
                <Image
                  src={heroImage.url}
                  alt={heroImage.alt || "Preview"}
                  fill
                  sizes="400px"
                  className="object-cover"
                />
                {!heroImage.isActive && (
                  <div className="absolute top-3 right-3 px-2 py-1 bg-gray-900/70 text-white text-xs rounded">
                    Not visible on storefront
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
