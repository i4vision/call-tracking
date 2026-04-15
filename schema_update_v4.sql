-- Delete historical duplicates safely, keeping only the most recent transcript per file
DELETE FROM calls 
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY filename ORDER BY created_at DESC) as rnum 
    FROM calls
  ) t 
  WHERE t.rnum > 1
);
