-- Ensure lab-results bucket is public for PDF viewing
UPDATE storage.buckets 
SET public = true 
WHERE id = 'lab-results';