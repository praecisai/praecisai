-- Per-business identity on the WhatsApp statement PDF (header + footer).
-- Before this, every tenant's PDF printed Aeromen's address and email.
-- Additive and nullable; null address = no address line, null email =
-- billing_email.

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS statement_address text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS statement_email text;

-- Keep the two tenants that already send statements exactly as they print
-- today (both were getting the hardcoded Aeromen identity).
UPDATE businesses
SET statement_address = E'C-Wing 19, 2nd Floor, Shree Beliram Industrial Estate,\nOpp. Police Station, S.V. Road, Dahisar East, Mumbai - 400068',
    statement_email = 'aeromenclothingllp@gmail.com'
WHERE id IN ('30868203-6e76-4fb1-821c-dbdfbc93566c', '32fd5a0a-792c-4261-af71-1c8a57f87755')
  AND statement_address IS NULL;
