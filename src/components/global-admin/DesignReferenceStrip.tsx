import { useState } from 'react';

/**
 * Показує приклади UI: локальні PNG з /design-mockups/ або fallback-зображення.
 */
const LOCAL_DASH = '/design-mockups/dashboard-ref.png';
const LOCAL_LIST = '/design-mockups/list-ref.png';

const FALLBACK_DASH =
  'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=900&q=75';
const FALLBACK_LIST =
  'https://images.unsplash.com/photo-1558346490-a72e3ae2f4a7?auto=format&fit=crop&w=900&q=75';

function RefCard({
  title,
  caption,
  localSrc,
  fallbackSrc,
}: {
  title: string;
  caption: string;
  localSrc: string;
  fallbackSrc: string;
}) {
  const [src, setSrc] = useState(localSrc);
  return (
    <figure className="overflow-hidden rounded-2xl border border-gray-200/90 bg-white shadow-sm shadow-gray-200/50">
      <div className="aspect-[16/10] w-full bg-gray-100">
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setSrc(fallbackSrc)}
        />
      </div>
      <figcaption className="border-t border-gray-100 px-4 py-3">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs text-gray-500">{caption}</p>
      </figcaption>
    </figure>
  );
}

export default function DesignReferenceStrip() {
  return (
    <section aria-labelledby="design-ref-heading" className="space-y-3">
      <div>
        <h2 id="design-ref-heading" className="text-sm font-semibold text-gray-900">
          Референс дизайну
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">
          Локальні макети з <code className="rounded bg-gray-100 px-1">public/design-mockups/</code> або
          приклади-фото, близькі до стилю EcoCharge.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <RefCard
          title="Дашборд і аналітика"
          caption="KPI, статуси мережі, графіки доходів (як у макетах курсової)."
          localSrc={LOCAL_DASH}
          fallbackSrc={FALLBACK_DASH}
        />
        <RefCard
          title="Списки та історія"
          caption="Картки рядків, аватари, бейджі статусів — той самий візуальний ритм, що в адмінці станцій."
          localSrc={LOCAL_LIST}
          fallbackSrc={FALLBACK_LIST}
        />
      </div>
    </section>
  );
}
