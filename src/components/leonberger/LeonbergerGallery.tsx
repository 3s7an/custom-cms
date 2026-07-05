import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Img = { id: string; public_url: string; alt: string | null };

type Props = {
  images: Img[];
  title?: string;
};

const LeonbergerGallery = ({ images, title = "Fotogaléria" }: Props) => {
  const [index, setIndex] = useState(0);

  const count = images.length;
  const current = count > 0 ? images[Math.min(index, count - 1)] : null;

  const go = useCallback(
    (delta: number) => {
      if (count <= 1) return;
      setIndex((i) => (i + delta + count) % count);
    },
    [count],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (count <= 1) return;
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  if (count === 0 || !current) return null;

  return (
    <section className="mt-10 pt-8 border-t border-border">
      <h2 className="font-heading text-xl font-bold mb-4 pb-1 border-b-2 border-slk-brown inline-block">
        {title}
      </h2>

      <div className="max-w-4xl mx-auto mt-4">
        <div className="relative border border-border bg-background overflow-hidden">
          <div className="aspect-[4/3] w-full flex items-center justify-center bg-slk-cream/40">
            <img
              src={current.public_url}
              alt={current.alt || ""}
              className="max-h-[min(70vh,520px)] w-full h-full object-contain"
              loading={index === 0 ? "eager" : "lazy"}
            />
          </div>

          {count > 1 ? (
            <>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-0 bg-slk-brown text-[#fff7e3] shadow-md hover:bg-slk-brown-dark"
                onClick={() => go(-1)}
                aria-label="Predchádzajúca fotografia"
              >
                <ChevronLeft className="h-6 w-6" aria-hidden />
              </Button>
              <Button
                type="button"
                variant="default"
                size="icon"
                className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full border-0 bg-slk-brown text-[#fff7e3] shadow-md hover:bg-slk-brown-dark"
                onClick={() => go(1)}
                aria-label="Nasledujúca fotografia"
              >
                <ChevronRight className="h-6 w-6" aria-hidden />
              </Button>
            </>
          ) : null}
        </div>

        {count > 1 ? (
          <div
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mt-4 px-1"
            role="tablist"
            aria-label="Náhľady fotografií"
          >
            {images.map((img, i) => (
              <button
                key={img.id}
                type="button"
                role="tab"
                aria-selected={i === index}
                aria-label={`Fotografia ${i + 1} z ${count}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "relative w-[72px] h-[72px] sm:w-20 sm:h-20 shrink-0 overflow-hidden bg-slk-cream transition-[border,box-shadow]",
                  "border",
                  i === index
                    ? "border-[3px] border-slk-brown shadow-[inset_0_0_0_1px_rgba(89,65,45,0.2)]"
                    : "border-border hover:border-slk-brown/50",
                )}
              >
                <img
                  src={img.public_url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default LeonbergerGallery;
