import { useEffect } from 'react';

export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Agent Dashboard` : 'Agent Dashboard';
  }, [title]);
}
