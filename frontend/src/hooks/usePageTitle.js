import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · AI Garage Agents Dashboard` : 'AI Garage Agents Dashboard';
  }, [title]);
}
