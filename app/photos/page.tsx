import type { Metadata } from "next";

import { PhotoGallery } from "@/components/photo-gallery";
import { PHOTOS } from "@/lib/data/photos";

export const metadata: Metadata = {
  title: "Photos",
  description: "Draft nights, game days, and everything in between — Digital Dash Fantasy League.",
};

export default function PhotosPage() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-fg uppercase">Photos</h1>
        <p className="text-fg-muted">Draft nights, game days, and everything in between.</p>
      </div>
      <PhotoGallery photos={PHOTOS} />
    </div>
  );
}
