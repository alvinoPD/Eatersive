import { useEffect, useRef, useState } from 'react';
import '../../styles/image-carousel.css';

export interface CarouselImage {
  src: string;
  alt?: string;
  caption?: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  className?: string;
  autoPlay?: boolean;
  intervalMs?: number;
  ariaLabel?: string;
}

/**
 * Carousel gambar tanpa dependency tambahan.
 * Mendukung tombol prev/next, dots, swipe, dan panah keyboard.
 */
export default function ImageCarousel({
  images,
  className = '',
  autoPlay = false,
  intervalMs = 4500,
  ariaLabel = 'Galeri gambar',
}: ImageCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pointerStart = useRef<number | null>(null);

  const total = images.length;
  const safeIndex = total > 0 ? index % total : 0;

  useEffect(() => {
    if (!autoPlay || paused || total <= 1) return;

    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % total),
      intervalMs,
    );

    return () => window.clearInterval(timer);
  }, [autoPlay, intervalMs, paused, total]);

  if (total === 0) return null;

  function go(next: number) {
    setIndex((next + total) % total);
  }

  return (
    <div
      className={`image-carousel ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
      tabIndex={0}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft') go(safeIndex - 1);
        if (event.key === 'ArrowRight') go(safeIndex + 1);
      }}
      onPointerDown={(event) => {
        pointerStart.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (pointerStart.current === null) return;
        const diff = event.clientX - pointerStart.current;
        pointerStart.current = null;
        if (Math.abs(diff) > 40) go(safeIndex + (diff < 0 ? 1 : -1));
      }}
    >
      <div
        className="image-carousel__track"
        style={{ transform: `translateX(-${safeIndex * 100}%)` }}
      >
        {images.map((image, position) => (
          <figure className="image-carousel__slide" key={`${image.src}-${position}`}>
            <img src={image.src} alt={image.alt ?? ''} loading={position === 0 ? 'eager' : 'lazy'} />
            {image.caption && <figcaption>{image.caption}</figcaption>}
          </figure>
        ))}
      </div>

      {total > 1 && (
        <>
          <button
            className="image-carousel__nav image-carousel__nav--prev"
            type="button"
            aria-label="Gambar sebelumnya"
            onClick={() => go(safeIndex - 1)}
          >
            ‹
          </button>
          <button
            className="image-carousel__nav image-carousel__nav--next"
            type="button"
            aria-label="Gambar berikutnya"
            onClick={() => go(safeIndex + 1)}
          >
            ›
          </button>
          <div className="image-carousel__dots" role="tablist" aria-label="Pilih gambar">
            {images.map((image, position) => (
              <button
                key={`dot-${image.src}-${position}`}
                type="button"
                className={`image-carousel__dot${position === safeIndex ? ' is-active' : ''}`}
                aria-label={`Gambar ${position + 1}`}
                aria-selected={position === safeIndex}
                role="tab"
                onClick={() => go(position)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
