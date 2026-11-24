package ar.uba.fi.cooperar.domain.inquiries;

/**
 * What the visitor wrote: who they are, how to answer them (an email, a phone or both), how many they want (optional)
 * and what they ask.
 */
public record InquiryContent(
        String senderName, String senderEmail, String senderPhone, Integer quantity, String message) {}
