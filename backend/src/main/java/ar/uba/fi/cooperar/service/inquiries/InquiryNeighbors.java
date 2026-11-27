package ar.uba.fi.cooperar.service.inquiries;

import java.util.UUID;

/** Around an inquiry in the inbox as searched and filtered: the newer one before it, the older one after it, and how
 * many match. */
public record InquiryNeighbors(UUID previousId, UUID nextId, long total) {}
