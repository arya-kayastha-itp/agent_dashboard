import { useMemo, useState } from 'react';

// Generic client-side sort for a table's rows — comparators are inferred
// (numeric vs. string) so each table only has to say which columns exist.
export function useSortableData(rows, { defaultOrderBy, defaultDirection = 'asc' } = {}) {
  const [orderBy, setOrderBy] = useState(defaultOrderBy);
  const [direction, setDirection] = useState(defaultDirection);

  const sorted = useMemo(() => {
    if (!orderBy || !rows) return rows;
    const compare = (a, b) => {
      const av = a[orderBy];
      const bv = b[orderBy];
      if (av == null && bv == null) return 0;
      if (av == null) return -1;
      if (bv == null) return 1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      return String(av).localeCompare(String(bv));
    };
    const copy = [...rows].sort(compare);
    return direction === 'desc' ? copy.reverse() : copy;
  }, [rows, orderBy, direction]);

  const handleSort = (key) => {
    if (orderBy === key) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(key);
      setDirection('asc');
    }
  };

  return { sorted, orderBy, direction, handleSort };
}
