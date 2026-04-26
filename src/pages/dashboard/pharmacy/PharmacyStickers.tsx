import { StickerPrinter } from "@/components/pharmacy/StickerPrinter";

export default function PharmacyStickers() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sticker Printer</h1>
        <p className="text-muted-foreground text-sm">Print medicine labels for patients on thermal stickers.</p>
      </div>
      <StickerPrinter />
    </div>
  );
}
