import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { ArticleImageOpenDetail } from '@/components/common/ArticleContent';
import { keybindingService } from '@/services/shortcuts/shortcutService';
import './ArticleImageLightbox.css';

/** Above article view (200) and other capture handlers (1000) so article shortcuts never see lightbox keys. */
const LIGHTBOX_KEY_PRIORITY = 1100;

interface ArticleImageLightboxProps {
  detail: ArticleImageOpenDetail;
  onClose: () => void;
}

/**
 * Full-window image viewer for article content images. Escape or a click
 * closes it; arrow keys page through the article's laid-out images. While
 * open it swallows plain keys so article shortcuts (←/Esc close the article)
 * do not fire underneath.
 */
export const ArticleImageLightbox = ({ detail, onClose }: ArticleImageLightboxProps) => {
  const [index, setIndex] = useState(detail.index);
  const rootRef = useRef<HTMLDivElement>(null);
  const count = detail.images.length;
  const image = detail.images[index];

  const step = useCallback((delta: number) => {
    if (count < 2) return;
    setIndex((current) => (current + delta + count) % count);
  }, [count]);

  useEffect(() => {
    setIndex(detail.index);
  }, [detail]);

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();

    const unregister = keybindingService.register({
      type: 'keydown',
      capture: true,
      priority: LIGHTBOX_KEY_PRIORITY,
      handler: (event: KeyboardEvent) => {
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (event.key === 'Escape' || event.key === ' ') {
          onClose();
        } else if (event.key === 'ArrowLeft') {
          step(-1);
        } else if (event.key === 'ArrowRight') {
          step(1);
        }
      },
    });

    return () => {
      unregister();
      previousFocus?.focus?.({ preventScroll: true });
    };
  }, [onClose, step]);

  if (!image) return null;

  return createPortal(
    <motion.div
      ref={rootRef}
      className="article-image-lightbox"
      data-component="article-image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || 'Image viewer'}
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.16 }}
      onClick={onClose}
    >
      <button
        type="button"
        className="article-image-lightbox-button article-image-lightbox-close"
        aria-label="Close image"
        onClick={(event) => { event.stopPropagation(); onClose(); }}
      >
        <CloseIcon fontSize="small" />
      </button>

      {count > 1 && (
        <>
          <button
            type="button"
            className="article-image-lightbox-button article-image-lightbox-prev"
            aria-label="Previous image"
            onClick={(event) => { event.stopPropagation(); step(-1); }}
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            className="article-image-lightbox-button article-image-lightbox-next"
            aria-label="Next image"
            onClick={(event) => { event.stopPropagation(); step(1); }}
          >
            <ChevronRightIcon />
          </button>
        </>
      )}

      <figure className="article-image-lightbox-figure">
        <motion.img
          key={image.src}
          src={image.src}
          alt={image.alt}
          className="article-image-lightbox-image"
          draggable={false}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        />
        {(image.alt || count > 1) && (
          <figcaption className="article-image-lightbox-caption">
            {count > 1 && <span className="article-image-lightbox-counter">{index + 1} / {count}</span>}
            {image.alt && <span>{image.alt}</span>}
          </figcaption>
        )}
      </figure>
    </motion.div>,
    document.body,
  );
};
