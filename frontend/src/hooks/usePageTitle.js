import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Intuitive.AI` : 'Intuitive.AI';
  }, [title]);
}
