import { useEffect, useMemo } from "react";

const SCRIPT_ID = "slk-structured-data";

type Props = {
  data: Record<string, unknown> | null | undefined;
};

const StructuredData = ({ data }: Props) => {
  const json = useMemo(() => (data ? JSON.stringify(data) : null), [data]);

  useEffect(() => {
    const existing = document.getElementById(SCRIPT_ID);
    if (existing) existing.remove();
    if (!json) return;

    const el = document.createElement("script");
    el.id = SCRIPT_ID;
    el.type = "application/ld+json";
    el.textContent = json;
    document.head.appendChild(el);

    return () => {
      el.remove();
    };
  }, [json]);

  return null;
};

export default StructuredData;
