import { useState } from 'react';
import {
  FALLBACK_DASH,
  FALLBACK_LIST,
  LOCAL_DASH,
  LOCAL_LIST,
} from '../../constants/designReferenceMockups';

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

/** Показує приклади UI: локальні PNG з /design-mockups/ або fallback-зображення. */
export default function DesignReferenceStrip() {
  return (
    <section className="grid gap-4 md:grid-cols-2" aria-label="Приклади UI">
      <RefCard
        title="Дашборд (референс)"
        caption="Локальний макет або зображення з Unsplash, якщо файлу немає."
        localSrc={LOCAL_DASH}
        fallbackSrc={FALLBACK_DASH}
      />
      <RefCard
        title="Список (референс)"
        caption="Локальний макет або зображення з Unsplash, якщо файлу немає."
        localSrc={LOCAL_LIST}
        fallbackSrc={FALLBACK_LIST}
      />
    </section>
  );
}
