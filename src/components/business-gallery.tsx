import { ImagePlus, Trash2 } from 'lucide-react'
import { addBusinessImages, deleteBusinessImage } from '@/lib/business-actions'

type Img = { id: number; path: string }

export function BusinessGallery({
  businessId,
  images,
}: {
  businessId: string
  images: Img[]
}) {
  return (
    <div className="rounded-2xl border bg-surface p-6">
      <h3 className="flex items-center gap-2 font-semibold">
        <ImagePlus size={17} className="text-brand" /> Photo gallery
      </h3>
      <p className="mt-1 text-sm text-muted">Up to 8 photos. Shown on your public page.</p>

      {images.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.path} alt="" className="h-full w-full object-cover" />
              <form action={deleteBusinessImage} className="absolute right-1.5 top-1.5">
                <input type="hidden" name="businessId" value={businessId} />
                <input type="hidden" name="imageId" value={img.id} />
                <button
                  type="submit"
                  aria-label="Delete photo"
                  className="grid h-7 w-7 place-items-center rounded-md bg-black/60 text-white opacity-0 transition group-hover:opacity-100 hover:bg-danger"
                >
                  <Trash2 size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      {images.length < 8 && (
        <form action={addBusinessImages} className="mt-4 flex flex-wrap items-center gap-3">
          <input type="hidden" name="businessId" value={businessId} />
          <input
            type="file"
            name="images"
            accept="image/*"
            multiple
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-mint file:px-3 file:py-2 file:text-sm file:font-medium file:text-brand-strong"
          />
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-strong"
          >
            Upload
          </button>
        </form>
      )}
    </div>
  )
}
