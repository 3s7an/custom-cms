import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  formatDateSk,
  formatHeightCm,
  formatWeightKg,
  healthStripItems,
} from "@/lib/leonbergerDisplay";

export type LeonbergerCardRow = {
  id: string;
  slug?: string | null;
  name: string;
  profile_image_url: string | null;
  birth_date: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bonitation_code: string | null;
  health: unknown;
};

type Props = { row: LeonbergerCardRow };

const RowLine = ({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | null | undefined;
  valueClassName?: string;
}) => {
  if (!value) return null;
  return (
    <div className="border-b border-dashed border-border/80 last:border-0 py-1.5 text-sm">
      <span className="font-semibold text-foreground">{label}:</span>{" "}
      <span className={["text-foreground", valueClassName].filter(Boolean).join(" ")}>{value}</span>
    </div>
  );
};

const LeonbergerCard = ({ row }: Props) => {
  const birth = formatDateSk(row.birth_date);
  const h = formatHeightCm(row.height_cm);
  const w = formatWeightKg(row.weight_kg);
  const healthItems = healthStripItems(row.health);
  const topTests = healthItems.filter((x) => x.id === "hd" || x.id === "ed");
  const otherTests = healthItems.filter((x) => x.id !== "hd" && x.id !== "ed");

  return (
    <article className="border border-border bg-[#f5f0e6] bg-[length:4px_4px] bg-[radial-gradient(circle,rgba(0,0,0,0.06)_1px,transparent_1px)] flex flex-col h-full">
      <div className="flex flex-col sm:flex-row gap-0 sm:gap-3 p-3 sm:p-4">
        <div className="w-full sm:w-[44%] flex-shrink-0">
          <div className="aspect-[4/3] bg-slk-cream border border-border overflow-hidden">
            {row.profile_image_url ? (
              <img
                src={row.profile_image_url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm p-2 text-center">
                Bez fotky
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground leading-tight mb-2 min-h-[2.75rem] sm:min-h-[3.25rem]">
            {row.name}
          </h2>
          <div className="flex-1">
            <RowLine label="Dátum narodenia" value={birth} />
            <RowLine label="Výška" value={h} />
            <RowLine label="Váha" value={w} />
          </div>
        </div>
      </div>

      {healthItems.length > 0 ? (
        <div className="bg-background border-t border-border px-2 py-3">
          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-x-6 gap-y-2 flex-wrap">
              {topTests.map((item) => (
                <div key={item.id} className="text-center min-w-[80px] max-w-[110px]">
                  <div className="text-[10px] font-semibold text-foreground leading-tight">
                    {item.label}
                  </div>
                  <div className="text-xs font-bold text-foreground mt-0.5">{item.value}</div>
                </div>
              ))}
            </div>
            {otherTests.length > 0 ? (
              <div className="flex justify-center gap-x-6 gap-y-2 flex-wrap">
                {otherTests.map((item) => (
                  <div key={item.id} className="text-center min-w-[72px] max-w-[100px]">
                    <div className="text-[10px] font-semibold text-foreground leading-tight">
                      {item.label}
                    </div>
                    <div className="text-xs font-bold text-foreground mt-0.5">{item.value}</div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="p-4 pt-2 flex justify-center">
        <Button
          asChild
          className="rounded-full px-8 bg-primary text-primary-foreground font-heading font-bold uppercase tracking-wide"
        >
          <Link to={`/leonberger/${row.slug || row.id}`}>Zobraziť viac</Link>
        </Button>
      </div>
    </article>
  );
};

export default LeonbergerCard;
