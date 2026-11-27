package ar.uba.fi.cooperar.service.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryStatus;
import java.util.List;
import java.util.Map;

/** A page of the inbox, with how many inquiries the organization has in each status, whatever the filter. */
public record InquiryPage(List<Inquiry> items, int page, int size, long total, Map<InquiryStatus, Long> counts) {}
