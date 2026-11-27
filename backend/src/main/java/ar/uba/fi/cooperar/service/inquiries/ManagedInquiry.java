package ar.uba.fi.cooperar.service.inquiries;

import ar.uba.fi.cooperar.domain.inquiries.Inquiry;
import ar.uba.fi.cooperar.domain.inquiries.InquiryReply;
import ar.uba.fi.cooperar.domain.organizations.Organization;
import java.util.List;

/**
 * An inquiry as the organization sees it, with its answers already loaded and `replyTo`: the contact email of its
 * profile, where answers to its replies arrive; missing while the profile has none, and then it cannot reply.
 */
public record ManagedInquiry(Inquiry inquiry, List<InquiryReply> replies, String replyTo) {

    static ManagedInquiry of(Inquiry inquiry, Organization organization) {
        return new ManagedInquiry(inquiry, List.copyOf(inquiry.getReplies()), organization.getEmail());
    }
}
