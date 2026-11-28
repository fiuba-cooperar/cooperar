package ar.uba.fi.cooperar.domain.inquiries;

/**
 * What the visitor wrote: who they are, the email to answer them and optionally a phone, how many they want (optional)
 * and what they ask.
 */
public record InquiryContent(
        String senderName, String senderEmail, String senderPhone, Integer quantity, String message) {}
