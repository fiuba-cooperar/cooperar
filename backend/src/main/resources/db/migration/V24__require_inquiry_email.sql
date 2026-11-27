-- The email of whoever asks is required since #23: the organization answers there from its inbox. Inquiries that left
-- only a phone were never sent outside development, so there are none to keep.
ALTER TABLE inquiries
    DROP CONSTRAINT inquiries_check;

ALTER TABLE inquiries
    ALTER COLUMN sender_email SET NOT NULL;
