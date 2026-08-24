-- CREATE BUCKETS FOR FILE ATTACHMENTS
INSERT INTO storage.buckets (id, name, public)
VALUES ('transaction-proofs', 'transaction-proofs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('receiving-proofs', 'receiving-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- ALLOW PUBLIC ACCESS FOR TRANSACTIONS PROOFS BUCKET
CREATE POLICY "Public Read Transaction Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'transaction-proofs');

CREATE POLICY "Public Upload Transaction Proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'transaction-proofs');

-- ALLOW PUBLIC ACCESS FOR RECEIVING PROOFS BUCKET
CREATE POLICY "Public Read Receiving Proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'receiving-proofs');

CREATE POLICY "Public Upload Receiving Proofs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'receiving-proofs');
